# NGCharge-backend
Le backend du projet NG Charge
# 🔋 EV Charge Guinée - Backend API

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![Node](https://img.shields.io/badge/node-v20.14.0-green.svg)
![License](https://img.shields.io/badge/license-MIT-orange.svg)

Backend API complet pour la gestion d'infrastructure de recharge de véhicules électriques en Guinée.

**Développé par NG Technologie - Guinée 🇬🇳**

---

## 🎯 Fonctionnalités Principales

### ✅ Authentification & Utilisateurs
- 🔐 Login par Email ou Téléphone
- 🎫 JWT Tokens (Access + Refresh)
- 👥 Gestion utilisateurs (Admin, Opérateur, Client)
- 📊 Profils personnalisés
- 📈 Statistiques utilisateurs

### ✅ Stations de Recharge
- 🗺️ Carte interactive (GeoJSON pour Leaflet)
- 📍 Recherche par distance (rayon en km)
- 📱 **QR Code automatique** (génération, scan, téléchargement)
- ⭐ Favoris
- 🔍 Filtres avancés (status, type de connecteur, ville)
- 📸 Photos et équipements

### ✅ Sessions de Recharge
- 📱 **Scan QR → Sélection Offre → Session**
- 🎯 3 types d'offres (Rapide, Standard, Complète)
- ▶️ Démarrage/Arrêt automatique
- ⚡ Calcul automatique du coût
- 📊 Historique complet
- 🔌 Intégration CitrineOS (OCPP)

### ✅ Système de Paiement
- 💰 **NG Wallet** (portefeuille interne, déduction automatique)
- 📱 **Cinetpay** (Orange Money, MTN Money, Cartes bancaires)
- 🔄 Recharge wallet
- 📜 Historique transactions
- 🔔 Webhooks Cinetpay

### ✅ CitrineOS Integration
- 🔌 OCPP 1.6 & 2.0.1
- ▶️ RemoteStart/RemoteStop
- 🔄 Synchronisation bornes
- 📊 Status temps réel

### ✅ API Cartographie
- 🗺️ Format GeoJSON (compatible Leaflet)
- 📍 Stations à proximité
- 🎨 Markers colorés par status
- 📦 Clustering support

---

## 🏗️ Architecture
```
┌─────────────────┐
│  Mobile App     │
│  (Kotlin)       │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│   Backend NestJS API        │
│   (localhost:3000)          │
│                             │
│  ┌──────────────────────┐  │
│  │  Auth Module         │  │
│  │  Users Module        │  │
│  │  Stations Module     │  │
│  │  Sessions Module     │  │
│  │  Payments Module     │  │
│  │  CitrineOS Module    │  │
│  │  Map Module          │  │
│  └──────────────────────┘  │
└──────────┬──────────────────┘
           │
    ┌──────┴────────┐
    ▼               ▼
┌────────┐    ┌──────────────┐
│PostgreSQL│  │ CitrineOS     │
│(19 tables)│  │ (AWS EC2)     │
└─────────┘    └──────────────┘
```

---

## 📊 Base de Données

**19 Tables PostgreSQL**

### Tables Principales
- `users` - Utilisateurs
- `user_profiles` - Profils détaillés
- `wallets` - Portefeuilles NG Wallet
- `wallet_transactions` - Transactions wallet
- `charging_stations` - Bornes de recharge
- `charging_offers` - Offres de recharge
- `charging_sessions` - Sessions de charge
- `payments` - Paiements
- `vehicles` - Véhicules utilisateurs
- `rfid_cards` - Cartes RFID
- `subscriptions` - Abonnements
- `subscription_plans` - Plans d'abonnement
- `loyalty_points` - Points fidélité
- `support_tickets` - Tickets support
- `maintenance_logs` - Maintenance
- `reviews` - Évaluations
- `favorite_stations` - Favoris
- `notifications` - Notifications

Voir [DATABASE.md](./docs/DATABASE.md) pour le schéma complet.

---


# Générer Prisma Client
npx prisma generate

# Appliquer les migrations
npx prisma migrate dev

# Démarrer le serveur
npm run start:dev
```

---

## 📚 Documentation API

### Endpoints Principaux

#### Auth
```
POST   /auth/register       - Inscription
POST   /auth/login          - Connexion (email ou phone)
GET    /auth/me             - Mon profil
POST   /auth/refresh        - Refresh token
```

#### Stations
```
GET    /stations                        - Liste des bornes
GET    /stations/scan/qr/:qrCode        - Scan QR + Offres ⭐
GET    /stations/:id/qrcode/preview     - Preview QR Code
GET    /stations/:id/qrcode/image       - Télécharger QR PNG
POST   /stations/:id/qrcode/regenerate  - Régénérer QR Code
POST   /stations/:id/favorite           - Ajouter aux favoris
GET    /map/stations/geojson            - GeoJSON pour carte
GET    /map/stations/nearby             - Stations à proximité
```

#### Sessions
```
POST   /sessions                  - Créer session (avec offerId)
POST   /sessions/:id/start        - Démarrer charge
POST   /sessions/:id/stop         - Arrêter charge
GET    /sessions/my/active        - Mes sessions actives
GET    /sessions/my/history       - Mon historique
```

#### Payments
```
GET    /payments/wallet/my              - Mon wallet
POST   /payments/wallet/recharge        - Recharger wallet
POST   /payments/session/:id/pay        - Payer session
GET    /payments/my                     - Mes paiements
POST   /payments/webhook/cinetpay       - Webhook Cinetpay
```

Voir [API.md](./docs/API.md) pour la documentation complète.

---

## 🔐 Variables d'Environnement
```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/evcharge_dev"

# JWT
JWT_SECRET="your-secret-key"
JWT_EXPIRATION="7d"
JWT_REFRESH_SECRET="your-refresh-secret"
JWT_REFRESH_EXPIRATION="30d"

# App
PORT=3000
NODE_ENV=development

# CitrineOS
CITRINEOS_API_URL=""
CITRINEOS_WS_OCPP16_URL="ws://"
CITRINEOS_WS_OCPP201_URL="ws://"

# Cinetpay
CINETPAY_API_KEY="your-api-key"
CINETPAY_SITE_ID="your-site-id"
CINETPAY_SECRET_KEY="your-secret"
CINETPAY_NOTIFY_URL="http://localhost:3000/payments/webhook/cinetpay"

# Frontend
FRONTEND_URL="http://localhost:3001"
```

---

## 📱 Flux Utilisateur Mobile
```
1. Scanner QR Code de la borne
   GET /stations/scan/qr/QR-MTM001-2026
   → Retourne borne + 3 offres (Rapide, Standard, Complète)

2. Sélectionner offre "Recharge Standard"
   
3. Créer session avec offre
   POST /sessions
   Body: {
     "stationId": "...",
     "connectorId": 1,
     "offerId": "..." ← ID de l'offre
   }

4. Démarrer charge
   POST /sessions/:id/start 

5. Monitoring temps réel
   GET /sessions/my/active

6. Arrêter charge
   POST /sessions/:id/stop
   Body: { "meterStop": 16000 }

7. Payer automatiquement
   POST /payments/session/:id/pay
   → NG Wallet (auto) OU Cinetpay (URL paiement)
```

Voir [MOBILE_INTEGRATION.md](./docs/MOBILE_INTEGRATION.md)

---

## 🧪 Tests
```bash
# Tests unitaires
npm run test

# Tests e2e
npm run test:e2e

# Coverage
npm run test:cov
```

---


## 📈 Performances

- ⚡ Temps de réponse moyen: <100ms
- 🔄 Support concurrence: 1000+ requêtes/sec
- 💾 Base de données optimisée avec indexes
- 🗺️ Calcul distance Haversine optimisé
- 📦 Pagination automatique

---

## 🔒 Sécurité

- ✅ JWT Authentication
- ✅ Password hashing (bcrypt)
- ✅ SQL Injection protection (Prisma)
- ✅ CORS configuré
- ✅ Rate limiting
- ✅ Validation des données (class-validator)
- ✅ Webhooks signature verification

---

## Support

- **Email**: support@evcharge.gn
- **Téléphone**: +224 XXX XX XX XX
- **Documentation**: https://docs.evcharge.gn

---

## Équipe

**NG Technologie - Guinée 🇬🇳**

- Lead Developer: Abou DABO
- Backend Team: N/A

---

## License

MIT License - Copyright (c) 2026 NG Technologie

---

## Remerciements

- NestJS Framework
- Prisma ORM
- CitrineOS (OCPP Server)
- Cinetpay (Payment Gateway)
- Auteur Abou DABO

---

**🔋 Alimentons la Guinée avec l'énergie propre ! 🇬🇳**