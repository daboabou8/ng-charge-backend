# 📚 API Documentation - EV Charge Guinée

**Base URL**: `http://localhost:3000`  
**Version**: 1.0.0  
**Format**: JSON

---

## 🔐 Authentication

Tous les endpoints protégés nécessitent un header Authorization:
```
Authorization: Bearer {accessToken}
```

---

## 📑 Table des Matières

1. [Auth](#auth)
2. [Users](#users)
3. [Stations](#stations)
4. [QR Codes](#qr-codes)
5. [Map](#map)
6. [Sessions](#sessions)
7. [Payments](#payments)
8. [CitrineOS](#citrineos)

---

## 🔐 Auth

### POST /auth/register
Créer un nouveau compte utilisateur.

**Body:**
```json
{
  "email": "user@example.com",
  "password": "Password123!",
  "firstName": "Mamadou",
  "lastName": "Diallo",
  "phone": "+224621234567",
  "role": "USER"
}
```

**Response 201:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Mamadou",
    "lastName": "Diallo",
    "phone": "+224621234567",
    "role": "USER",
    "status": "ACTIVE",
    "profile": {
      "country": "Guinea",
      "language": "fr"
    }
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

**Errors:**
- `409` - Email ou téléphone déjà utilisé
- `400` - Données invalides

---

### POST /auth/login
Se connecter (email OU téléphone).

**Body (Option 1 - Email):**
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```

**Body (Option 2 - Téléphone):**
```json
{
  "phone": "+224621234567",
  "password": "Password123!"
}
```

**Response 200:**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "Mamadou",
    "role": "USER",
    "profile": {...}
  },
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

**Errors:**
- `401` - Identifiants invalides
- `401` - Compte suspendu/inactif

---

### GET /auth/me
Obtenir mon profil (version simple).

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Mamadou",
  "lastName": "Diallo",
  "role": "USER",
  "status": "ACTIVE"
}
```

---

### POST /auth/refresh
Renouveler l'access token.

**Headers:**
```
Authorization: Bearer {refreshToken}
```

**Response 200:**
```json
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

---

## 👥 Users

### GET /users/me/profile
Obtenir mon profil complet.

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "Mamadou",
  "lastName": "Diallo",
  "phone": "+224621234567",
  "profile": {
    "avatar": "https://...",
    "address": "Quartier Matam, Conakry",
    "city": "Conakry",
    "country": "Guinea",
    "language": "fr",
    "notifications": true,
    "emailNotifications": true,
    "smsNotifications": false
  },
  "vehicles": [...],
  "sessions": [...],
  "_count": {
    "sessions": 15,
    "payments": 12,
    "vehicles": 2
  }
}
```

---

### PUT /users/me/profile
Mettre à jour mon profil.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "address": "Quartier Matam, Conakry",
  "city": "Conakry",
  "language": "fr",
  "notifications": true,
  "emailNotifications": true,
  "smsNotifications": true
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "address": "Quartier Matam, Conakry",
  "city": "Conakry",
  "updatedAt": "2026-02-21T..."
}
```

---

### GET /users (Admin)
Liste des utilisateurs (paginée).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 10)

**Headers:**
```
Authorization: Bearer {adminToken}
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "firstName": "Mamadou",
      "role": "USER",
      "status": "ACTIVE",
      "_count": {
        "sessions": 15,
        "payments": 12
      }
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 10,
    "totalPages": 15
  }
}
```

---

### GET /users/stats (Admin)
Statistiques utilisateurs.

**Response 200:**
```json
{
  "totalUsers": 150,
  "activeUsers": 142,
  "suspendedUsers": 3,
  "adminCount": 2,
  "operatorCount": 5,
  "userCount": 143
}
```

---

## 🔋 Stations

### GET /stations
Liste des bornes (avec filtres).

**Query Parameters:**
- `page` (number, default: 1)
- `limit` (number, default: 20)
- `latitude` (number) - Pour recherche par distance
- `longitude` (number) - Pour recherche par distance
- `radius` (number) - Rayon en km
- `status` (AVAILABLE|OCCUPIED|OUT_OF_SERVICE|MAINTENANCE|OFFLINE)
- `connectorType` (TYPE1|TYPE2|CCS_COMBO|CHADEMO|GB_T|TESLA)
- `city` (string)
- `code` (string)
- `search` (string) - Recherche globale

**Example:**
```
GET /stations?latitude=9.5092&longitude=-13.7122&radius=10&status=AVAILABLE
```

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "stationId": "CP001",
      "name": "Borne Matam Centre",
      "code": "MTM001",
      "qrCode": "QR-MTM001-2026",
      "address": "Boulevard du Commerce, Matam",
      "city": "Conakry",
      "latitude": 9.5092,
      "longitude": -13.7122,
      "power": 50,
      "connectorType": "TYPE2",
      "status": "AVAILABLE",
      "pricePerKwh": 2500,
      "averageRating": 4.5,
      "distance": 2.3,
      "amenities": ["WiFi", "Cafe", "Parking"]
    }
  ],
  "meta": {
    "total": 45,
    "page": 1,
    "limit": 20,
    "totalPages": 3
  }
}
```

---

### GET /stations/:id
Détails d'une borne.

**Response 200:**
```json
{
  "id": "uuid",
  "stationId": "CP001",
  "name": "Borne Matam Centre",
  "code": "MTM001",
  "qrCode": "QR-MTM001-2026",
  "address": "Boulevard du Commerce, Matam",
  "city": "Conakry",
  "latitude": 9.5092,
  "longitude": -13.7122,
  "power": 50,
  "connectorType": "TYPE2",
  "numberOfPorts": 2,
  "status": "AVAILABLE",
  "pricePerKwh": 2500,
  "photos": ["https://..."],
  "amenities": ["WiFi", "Cafe"],
  "operator": {
    "id": "uuid",
    "firstName": "Ibrahim",
    "lastName": "Barry"
  },
  "reviews": [
    {
      "id": "uuid",
      "rating": 5,
      "comment": "Excellent service!",
      "user": {
        "firstName": "Fatou"
      }
    }
  ],
  "sessions": [],
  "averageRating": 4.5,
  "_count": {
    "sessions": 250,
    "reviews": 45
  }
}
```

---

### POST /stations (Admin/Operator)
Créer une nouvelle borne.

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "stationId": "CP002",
  "name": "Borne Kaloum Plaza",
  "code": "KLP001",
  "address": "Avenue de la République, Kaloum",
  "city": "Conakry",
  "latitude": 9.5370,
  "longitude": -13.6785,
  "power": 50,
  "connectorType": "TYPE2",
  "numberOfPorts": 2,
  "pricePerKwh": 2500,
  "photos": ["https://..."],
  "isPublic": true,
  "amenities": ["WiFi", "Parking"]
}
```

**Note:** Le QR code est généré automatiquement au format `QR-{CODE}-{YEAR}-{HASH}`

**Response 201:**
```json
{
  "id": "uuid",
  "stationId": "CP002",
  "name": "Borne Kaloum Plaza",
  "code": "KLP001",
  "qrCode": "QR-KLP001-2026-A1B2C3",
  "createdAt": "2026-02-21T..."
}
```

---

### POST /stations/:id/favorite
Ajouter aux favoris.

**Headers:**
```
Authorization: Bearer {token}
```

**Response 201:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "stationId": "uuid",
  "station": {...},
  "createdAt": "2026-02-21T..."
}
```

---

### DELETE /stations/:id/favorite
Retirer des favoris.

**Response 200:**
```json
{
  "message": "Removed from favorites"
}
```

---

### GET /stations/favorites/my
Mes bornes favorites.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "name": "Borne Matam Centre",
    "address": "...",
    "status": "AVAILABLE"
  }
]
```

---

## 📱 QR Codes

### GET /stations/scan/qr/:qrCode
**⭐ Scanner QR Code + Afficher Offres**

**Example:**
```
GET /stations/scan/qr/QR-MTM001-2026
```

**Response 200:**
```json
{
  "station": {
    "id": "uuid",
    "name": "Borne Matam Centre",
    "code": "MTM001",
    "address": "Boulevard du Commerce, Matam",
    "status": "AVAILABLE",
    "power": 50,
    "pricePerKwh": 2500
  },
  "offers": [
    {
      "id": "uuid",
      "name": "Recharge Rapide",
      "type": "QUICK",
      "duration": 30,
      "power": 50,
      "price": 12500,
      "pricePerKwh": 2500,
      "description": "Recharge rapide en 30 minutes"
    },
    {
      "id": "uuid",
      "name": "Recharge Standard",
      "type": "STANDARD",
      "duration": 60,
      "power": 30,
      "price": 20000,
      "pricePerKwh": 2000
    },
    {
      "id": "uuid",
      "name": "Recharge Complète",
      "type": "FULL",
      "duration": 120,
      "power": 22,
      "price": 30000,
      "pricePerKwh": 1500
    }
  ],
  "message": "Sélectionnez votre offre de recharge",
  "quickActions": {
    "stationId": "uuid",
    "connectorId": 1,
    "availablePorts": 2
  }
}
```

---

### GET /stations/:id/qrcode/preview
Prévisualiser le QR code (Base64).

**Response 200:**
```json
{
  "stationId": "uuid",
  "stationCode": "MTM001",
  "stationName": "Borne Matam Centre",
  "qrCode": "QR-MTM001-2026",
  "qrCodeImage": "data:image/png;base64,iVBORw0KGgo..."
}
```

---

### GET /stations/:id/qrcode/image
Télécharger le QR code (PNG).

**Response 200:**
```
Content-Type: image/png
Content-Disposition: attachment; filename="qrcode-MTM001.png"

[Binary PNG Data]
```

---

### POST /stations/:id/qrcode/regenerate (Admin)
Régénérer un nouveau QR code.

**Headers:**
```
Authorization: Bearer {adminToken}
```

**Response 200:**
```json
{
  "station": {...},
  "qrCode": "QR-MTM001-2026-X9Y8Z7",
  "message": "QR code regenerated successfully"
}
```

---

### GET /stations/qrcodes/batch (Admin)
QR codes en masse (pour impression).

**Query:**
```
GET /stations/qrcodes/batch?ids=uuid1,uuid2,uuid3
```

**Response 200:**
```json
{
  "count": 3,
  "stations": [
    {
      "id": "uuid",
      "code": "MTM001",
      "name": "Borne Matam Centre",
      "qrCode": "QR-MTM001-2026",
      "qrCodeImage": "data:image/png;base64,..."
    }
  ]
}
```

---

## 🗺️ Map

### GET /map/stations/geojson
GeoJSON pour Leaflet (toutes les bornes).

**Query Parameters:**
- `latitude`, `longitude`, `radius` - Filtrer par distance
- `status` - Filtrer par status
- `connectorType` - Filtrer par type

**Response 200:**
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "geometry": {
        "type": "Point",
        "coordinates": [-13.7122, 9.5092]
      },
      "properties": {
        "id": "uuid",
        "name": "Borne Matam Centre",
        "status": "AVAILABLE",
        "power": 50,
        "pricePerKwh": 2500,
        "markerColor": "green",
        "icon": "charging-station",
        "distance": 2.3
      }
    }
  ]
}
```

**Utilisation avec Leaflet:**
```javascript
fetch('/map/stations/geojson')
  .then(res => res.json())
  .then(data => {
    L.geoJSON(data, {
      pointToLayer: (feature, latlng) => {
        return L.marker(latlng, {
          icon: L.icon({
            iconUrl: `marker-${feature.properties.markerColor}.png`
          })
        });
      }
    }).addTo(map);
  });
```

---

### GET /map/stations/nearby
Stations à proximité.

**Query Parameters:**
- `latitude` (required)
- `longitude` (required)
- `radius` (default: 10 km)
- `limit` (default: 20)

**Example:**
```
GET /map/stations/nearby?latitude=9.5092&longitude=-13.7122&radius=5
```

**Response 200:**
```json
{
  "location": {
    "latitude": 9.5092,
    "longitude": -13.7122
  },
  "radius": 5,
  "count": 3,
  "stations": [
    {
      "id": "uuid",
      "name": "Borne Matam Centre",
      "distance": 0.8,
      "status": "AVAILABLE"
    }
  ]
}
```

---

## ⚡ Sessions

### POST /sessions
Créer une session de recharge (avec offre).

**Headers:**
```
Authorization: Bearer {token}
```

**Body:**
```json
{
  "stationId": "uuid",
  "connectorId": 1,
  "offerId": "uuid",
  "meterStart": 1000
}
```

**Response 201:**
```json
{
  "session": {
    "id": "uuid",
    "userId": "uuid",
    "stationId": "uuid",
    "connectorId": 1,
    "status": "PENDING",
    "pricePerKwh": 2000,
    "station": {...}
  },
  "selectedOffer": {
    "id": "uuid",
    "name": "Recharge Standard",
    "duration": 60,
    "price": 20000
  },
  "estimatedDuration": 60,
  "estimatedCost": 20000
}
```

---

### POST /sessions/:id/start
Démarrer la session de charge.

**Response 200:**
```json
{
  "id": "uuid",
  "status": "ACTIVE",
  "startTime": "2026-02-21T18:00:00.000Z",
  "station": {...}
}
```

---

### POST /sessions/:id/stop
Arrêter la session.

**Body:**
```json
{
  "meterStop": 16000,
  "stopReason": "Full charge"
}
```

**Response 200:**
```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "startTime": "2026-02-21T18:00:00.000Z",
  "endTime": "2026-02-21T19:05:00.000Z",
  "duration": 3900,
  "meterStart": 1000,
  "meterStop": 16000,
  "energyConsumed": 15,
  "cost": 37500,
  "isPaid": false
}
```

---

### GET /sessions/my/active
Mes sessions actives.

**Response 200:**
```json
[
  {
    "id": "uuid",
    "status": "ACTIVE",
    "startTime": "2026-02-21T18:00:00.000Z",
    "station": {
      "name": "Borne Matam Centre"
    },
    "energyConsumed": 5.2
  }
]
```

---

### GET /sessions/my/history
Mon historique de sessions.

**Query:**
- `page` (default: 1)
- `limit` (default: 20)

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "startTime": "2026-02-20T...",
      "duration": 3600,
      "energyConsumed": 15,
      "cost": 37500,
      "isPaid": true,
      "station": {...}
    }
  ],
  "meta": {...}
}
```

---

## 💳 Payments

### GET /payments/wallet/my
Mon portefeuille NG Wallet.

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200:**
```json
{
  "id": "uuid",
  "userId": "uuid",
  "balance": 12500,
  "createdAt": "2026-02-21T...",
  "transactions": [
    {
      "id": "uuid",
      "type": "DEBIT",
      "amount": -37500,
      "balanceBefore": 50000,
      "balanceAfter": 12500,
      "description": "Paiement session - Borne Matam",
      "createdAt": "2026-02-21T..."
    }
  ]
}
```

---

### POST /payments/wallet/recharge
Recharger mon wallet via Cinetpay.

**Body:**
```json
{
  "amount": 50000,
  "method": "MOBILE_MONEY"
}
```

**Response 200:**
```json
{
  "payment": {
    "id": "uuid",
    "amount": 50000,
    "status": "PROCESSING",
    "reference": "RECHARGE-..."
  },
  "paymentUrl": "https://checkout.cinetpay.com/payment/..."
}
```

**Instructions:**
1. Rediriger l'utilisateur vers `paymentUrl`
2. L'utilisateur paie via Orange Money/MTN/Carte
3. Webhook Cinetpay notifie le backend
4. Wallet crédité automatiquement

---

### POST /payments/session/:sessionId/pay
Payer une session.

**Headers:**
```
Authorization: Bearer {token}
```

**Response 200 (Paiement Wallet):**
```json
{
  "method": "NG_WALLET",
  "success": true,
  "payment": {
    "id": "uuid",
    "amount": 37500,
    "status": "COMPLETED",
    "method": "WALLET"
  },
  "walletBalance": 12500,
  "transaction": {
    "type": "DEBIT",
    "amount": -37500,
    "balanceBefore": 50000,
    "balanceAfter": 12500
  }
}
```

**Response 200 (Paiement Cinetpay - Balance insuffisante):**
```json
{
  "method": "CINETPAY",
  "success": false,
  "payment": {
    "id": "uuid",
    "amount": 37500,
    "status": "PROCESSING"
  },
  "paymentUrl": "https://checkout.cinetpay.com/payment/...",
  "providers": ["ORANGE_MONEY", "MTN_MONEY", "CARD"]
}
```

---

### POST /payments/webhook/cinetpay
Webhook Cinetpay (appelé automatiquement par Cinetpay).

**Headers:**
```
Content-Type: application/json
```

**Body:** (Envoyé par Cinetpay)
```json
{
  "cpm_trans_id": "...",
  "cpm_amount": "50000",
  "signature": "...",
  ...
}
```

**Response 200:**
```json
{
  "success": true,
  "payment": {...}
}
```

---

### GET /payments/my
Mes paiements.

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "amount": 37500,
      "currency": "GNF",
      "method": "WALLET",
      "status": "COMPLETED",
      "description": "Paiement session...",
      "createdAt": "2026-02-21T..."
    }
  ],
  "meta": {...}
}
```

---

## 🔌 CitrineOS

### GET /citrineos/stations
Liste des stations depuis CitrineOS.

**Response 200:**
```json
[
  {
    "id": "CP001",
    "status": "Available",
    ...
  }
]
```

---

### POST /citrineos/stations/:stationId/remote-start
Démarrer charge via OCPP.

**Body:**
```json
{
  "connectorId": 1,
  "idTag": "ADMIN"
}
```

**Response 200:**
```json
{
  "status": "Accepted",
  ...
}
```

---

### POST /citrineos/stations/:stationId/remote-stop
Arrêter charge via OCPP.

**Body:**
```json
{
  "transactionId": 123
}
```

---

### POST /citrineos/sync
Synchroniser les stations depuis CitrineOS.

**Response 200:**
```json
{
  "success": true,
  "count": 10,
  "stations": [...]
}
```

---

## ⚠️ Codes d'Erreur

| Code | Description |
|------|-------------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 500 | Internal Server Error |

**Format d'erreur:**
```json
{
  "statusCode": 400,
  "message": "Email already exists",
  "error": "Bad Request"
}
```

---

**📞 Support API : api@evcharge.gn**