# 🏗️ Architecture Système - EV Charge Guinée

Documentation complète de l'architecture du backend.

---

## 🎯 Vue d'Ensemble

EV Charge Guinée utilise une architecture **modulaire** basée sur NestJS avec une séparation claire des responsabilités.
```
┌─────────────────────────────────────────────────────────┐
│                   CLIENTS                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐             │
│  │Mobile App│  │Web Admin │  │  APIs    │             │
│  │ (Kotlin) │  │  (React) │  │(External)│             │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘             │
└───────┼────────────┼─────────────┼────────────────────┘
        │            │             │
        ▼            ▼             ▼
┌─────────────────────────────────────────────────────────┐
│              NGINX REVERSE PROXY (Port 80/443)          │
│                     SSL/TLS Termination                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│           NESTJS BACKEND API (Port 3000)                │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │              MODULES LAYER                        │  │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐ ┌──────────┐ │  │
│  │  │  Auth  │ │ Users  │ │Stations │ │ Sessions │ │  │
│  │  └────────┘ └────────┘ └─────────┘ └──────────┘ │  │
│  │  ┌────────┐ ┌────────┐ ┌─────────┐              │  │
│  │  │Payments│ │CitrineOS│ │   Map   │              │  │
│  │  └────────┘ └────────┘ └─────────┘              │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │           SERVICES LAYER                          │  │
│  │  - Business Logic                                 │  │
│  │  - Data Validation                                │  │
│  │  - External API Calls                             │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │             PRISMA ORM                            │  │
│  │  - Query Builder                                  │  │
│  │  - Migrations                                     │  │
│  │  - Type Safety                                    │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  PostgreSQL  │  │  CitrineOS   │  │   Cinetpay   │
│  (Database)  │  │  (OCPP)      │  │  (Payment)   │
│   Port 5432  │  │  Port 8080   │  │   External   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 📦 Architecture des Modules

### Module Structure

Chaque module suit le pattern NestJS standard :
```
src/
├── module-name/
│   ├── dto/                    # Data Transfer Objects
│   │   ├── create-*.dto.ts
│   │   ├── update-*.dto.ts
│   │   └── filter-*.dto.ts
│   ├── services/               # Business Logic (optionnel)
│   │   └── *.service.ts
│   ├── module-name.controller.ts  # HTTP Routes
│   ├── module-name.service.ts     # Core Service
│   └── module-name.module.ts      # Module Definition
```

---

## 🔐 Auth Module

**Responsabilité** : Authentification et autorisation

### Composants

- **AuthService** : Login, Register, JWT generation
- **JwtStrategy** : Validation des tokens JWT
- **JwtAuthGuard** : Protection des routes
- **CurrentUser Decorator** : Extraction du user depuis le token

### Flow d'Authentification
```
1. User sends credentials → POST /auth/login
                              ↓
2. AuthService validates     (email/phone + password)
                              ↓
3. Generate JWT tokens       (accessToken + refreshToken)
                              ↓
4. Return tokens to client   { accessToken, refreshToken, user }
                              ↓
5. Client stores tokens      (localStorage / SecureStorage)
                              ↓
6. Client sends token        Authorization: Bearer {token}
                              ↓
7. JwtAuthGuard validates    → Decode + Verify signature
                              ↓
8. Request reaches handler   with req.user populated
```

### Sécurité

- ✅ Bcrypt hashing (10 rounds)
- ✅ JWT avec expiration (7d access, 30d refresh)
- ✅ Tokens signés avec secret
- ✅ Validation du statut utilisateur
- ✅ Protection CSRF via guards

---

## 👥 Users Module

**Responsabilité** : Gestion des utilisateurs et profils

### Architecture
```
UsersController
     │
     ├─→ UsersService
     │      ├─→ PrismaService (DB queries)
     │      └─→ Business logic
     │
     └─→ Guards (JwtAuthGuard, RolesGuard)
```

### Features

- CRUD utilisateurs
- Profils détaillés
- Statistiques
- Rôles (Admin, Operator, User)
- Statuts (Active, Suspended, Inactive)

---

## 🔋 Stations Module

**Responsabilité** : Gestion des bornes de recharge

### Services

1. **StationsService** : CRUD + Search + Favoris
2. **QrCodeService** : Génération QR codes
3. **MapController** : API cartographie

### Algorithme de Distance

**Haversine Formula** pour calcul de distance géographique :
```typescript
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; // Rayon de la Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  return distance;
}
```

### QR Code Architecture
```
QR Code Content (JSON):
{
  "type": "EV_CHARGING_STATION",
  "qrCode": "QR-MTM001-2026-ABC123",
  "app": "evcharge.gn",
  "version": "1.0",
  "timestamp": "2026-02-21T..."
}

Format: QR-{CODE}-{YEAR}-{HASH}
Exemple: QR-MTM001-2026-A1B2C3

Génération:
1. Admin crée borne → auto-generate QR
2. Hash MD5 (code + stationId + timestamp)
3. Tronquer à 6 caractères
4. Stocker dans DB
5. Générer image PNG (512x512 ou 1024x1024)
```

---

## ⚡ Sessions Module

**Responsabilité** : Gestion des sessions de recharge

### State Machine
```
PENDING → START → ACTIVE → STOP → COMPLETED
   │                          │         │
   └──────────────────────────┼────→ FAILED
                              │
                              └────→ CANCELLED
```

### Flow Complet
```
1. Scan QR Code
   GET /stations/scan/qr/{qrCode}
   → Retourne station + offres

2. Créer Session
   POST /sessions
   Body: { stationId, connectorId, offerId }
   → Status: PENDING

3. Démarrer
   POST /sessions/{id}/start
   → Status: ACTIVE
   → OCPP RemoteStart (optionnel)

4. Monitoring
   GET /sessions/my/active
   → Données temps réel

5. Arrêter
   POST /sessions/{id}/stop
   Body: { meterStop, stopReason }
   → Calcul: energyConsumed, cost
   → Status: COMPLETED

6. Payer
   POST /payments/session/{id}/pay
   → NG Wallet OU Cinetpay
```

### Calcul du Coût
```typescript
// Formule
energyConsumed = (meterStop - meterStart) / 1000  // kWh
cost = energyConsumed * pricePerKwh               // GNF

// Exemple
meterStart = 1000 Wh
meterStop = 16000 Wh
pricePerKwh = 2500 GNF

energyConsumed = (16000 - 1000) / 1000 = 15 kWh
cost = 15 * 2500 = 37,500 GNF
```

---

## 💳 Payments Module

**Responsabilité** : Paiements NG Wallet + Cinetpay

### Architecture
```
PaymentsController
     │
     ├─→ PaymentsService (Orchestrateur)
     │      ├─→ WalletService
     │      │      └─→ credit(), debit(), refund()
     │      │
     │      └─→ CinetpayService
     │             └─→ initiatePayment(), checkStatus(), verifySignature()
     │
     └─→ Webhooks (Cinetpay notifications)
```

### Flux de Paiement Intelligent
```typescript
async payForSession(userId, sessionId) {
  // 1. Récupérer le coût
  const session = await getSession(sessionId);
  const cost = session.cost;
  
  // 2. Vérifier le solde Wallet
  const balance = await getWalletBalance(userId);
  
  if (balance >= cost) {
    // 3a. PRIORITÉ : Payer avec NG Wallet (automatique)
    await debitWallet(userId, cost, sessionId);
    return {
      method: 'NG_WALLET',
      success: true,
      newBalance: balance - cost
    };
  } else {
    // 3b. Payer avec Cinetpay (redirection)
    const paymentUrl = await cinetpay.initiatePayment(cost, userId);
    return {
      method: 'CINETPAY',
      paymentUrl,
      providers: ['ORANGE_MONEY', 'MTN_MONEY', 'CARD']
    };
  }
}
```

### Cinetpay Integration
```
1. User clicks "Payer"
   Backend: POST /payments/wallet/recharge { amount: 50000 }
   ↓
2. Backend → Cinetpay API
   POST https://api-checkout.cinetpay.com/v2/payment
   Body: { apikey, amount, transaction_id, notify_url, ... }
   ↓
3. Cinetpay → Backend
   Response: { payment_url, payment_token }
   ↓
4. Backend → User
   { paymentUrl: "https://checkout.cinetpay.com/..." }
   ↓
5. User → Cinetpay (redirect)
   Sélectionne Orange Money / MTN / Carte
   Entre numéro / PIN
   ↓
6. Cinetpay → Backend (webhook)
   POST /payments/webhook/cinetpay
   Body: { cpm_trans_id, signature, ... }
   ↓
7. Backend valide signature
   Vérifie status sur Cinetpay API
   ↓
8. Backend crédite wallet / marque session payée
   ↓
9. Backend → User (notification)
   "Paiement confirmé ✅"
```

---

## 🔌 CitrineOS Module

**Responsabilité** : Intégration OCPP avec CitrineOS

### Architecture
```
CitrineosService
     │
     ├─→ RemoteStart
     │     POST /data/charging-station/{id}/remote-start
     │     Body: { idTag, connectorId }
     │
     ├─→ RemoteStop
     │     POST /data/charging-station/{id}/remote-stop
     │     Body: { transactionId }
     │
     ├─→ GetStatus
     │     GET /data/charging-station/{id}
     │
     └─→ Sync
           GET /data/charging-stations
```

### OCPP Flow
```
Backend → CitrineOS → Charging Station

1. RemoteStart
   Backend: POST /citrineos/stations/CP001/remote-start
   ↓
   CitrineOS: Send OCPP RemoteStartTransaction
   ↓
   Station: Démarrer charge
   ↓
   Station → CitrineOS: StatusNotification (Charging)
   ↓
   CitrineOS → Backend: Webhook (optionnel)

2. RemoteStop
   Backend: POST /citrineos/stations/CP001/remote-stop
   ↓
   CitrineOS: Send OCPP RemoteStopTransaction
   ↓
   Station: Arrêter charge
   ↓
   Station → CitrineOS: StopTransaction
```

---

## 🗺️ Map Module

**Responsabilité** : API cartographie pour Leaflet

### GeoJSON Output
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-13.7122, 9.5092]  // [lng, lat]
      },
      "properties": {
        "id": "uuid",
        "name": "Borne Matam",
        "status": "AVAILABLE",
        "markerColor": "green",
        "icon": "charging-station",
        "distance": 2.3
      }
    }
  ]
}
```

### Utilisation Leaflet
```javascript
// Frontend
fetch('/map/stations/geojson?latitude=9.5092&longitude=-13.7122&radius=10')
  .then(res => res.json())
  .then(geojson => {
    L.geoJSON(geojson, {
      pointToLayer: (feature, latlng) => {
        const color = feature.properties.markerColor;
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: `marker-${color}.png`,
            iconSize: [32, 32]
          })
        }).bindPopup(`
          <h3>${feature.properties.name}</h3>
          <p>Status: ${feature.properties.status}</p>
          <p>Distance: ${feature.properties.distance} km</p>
        `);
      }
    }).addTo(map);
  });
```

---

## 🔒 Sécurité

### Layers de Sécurité
```
1. Network Layer
   - Nginx reverse proxy
   - SSL/TLS (HTTPS)
   - Firewall (UFW)
   - Rate limiting

2. Application Layer
   - JWT authentication
   - Guards (JwtAuthGuard)
   - Validation (class-validator)
   - Sanitization

3. Database Layer
   - Prisma (SQL injection protection)
   - Prepared statements
   - Constraints
   - Indexes

4. Business Logic Layer
   - Authorization checks
   - Role-based access
   - Status validation
   - Balance checks
```

### JWT Flow
```
1. Login → Generate JWT
   {
     sub: userId,
     email: "user@example.com",
     role: "USER",
     iat: 1708531200,
     exp: 1709136000
   }

2. Sign with secret
   HMACSHA256(
     base64UrlEncode(header) + "." +
     base64UrlEncode(payload),
     secret
   )

3. Client stores token
   Authorization: Bearer eyJhbGci...

4. Server validates
   - Decode token
   - Verify signature
   - Check expiration
   - Load user from DB
   - Attach to req.user
```

---

## 📊 Performance

### Optimisations

1. **Database**
   - Indexes sur colonnes clés
   - Pagination sur toutes les listes
   - Select spécifique (pas de SELECT *)
   - Connection pooling

2. **API**
   - Caching (Redis - futur)
   - Compression Gzip
   - CDN pour assets statiques
   - Lazy loading relations

3. **Code**
   - Async/Await
   - Promises parallèles (Promise.all)
   - Éviter N+1 queries
   - DTOs pour validation

### Métriques Cibles
```
- Response time: < 100ms (API calls)
- Database queries: < 50ms
- QR code generation: < 200ms
- Concurrent users: 1000+
- Requests/sec: 500+
```

---

## 🧪 Testing Strategy
```
1. Unit Tests
   - Services
   - Utilities
   - Business logic

2. Integration Tests
   - Controllers + Services
   - Database operations
   - External APIs (mocked)

3. E2E Tests
   - Full user flows
   - Real database (test DB)
   - API endpoints

4. Load Tests
   - Concurrent requests
   - Stress testing
   - Performance benchmarks
```

---

## 📈 Scalabilité

### Horizontal Scaling
```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴────┬────────┬────────┐
   │        │        │        │
   ▼        ▼        ▼        ▼
┌──────┐┌──────┐┌──────┐┌──────┐
│ API 1││ API 2││ API 3││ API 4│
└──┬───┘└──┬───┘└──┬───┘└──┬───┘
   │       │       │       │
   └───────┴───────┴───────┘
           │
           ▼
    ┌─────────────┐
    │ PostgreSQL  │
    │  (Cluster)  │
    └─────────────┘
```

### Vertical Scaling
```
Current: t3.medium (2 vCPU, 4 GB RAM)
  ↓
Scale Up: t3.large (2 vCPU, 8 GB RAM)
  ↓
Scale Up: t3.xlarge (4 vCPU, 16 GB RAM)
```

---

**Développé par NG Technologie - Guinée 🇬🇳**