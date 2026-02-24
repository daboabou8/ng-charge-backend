# 🗄️ Schéma de Base de Données - EV Charge Guinée

Documentation complète du schéma PostgreSQL.

---

## 📊 Vue d'Ensemble

**Base de données** : PostgreSQL 18.2  
**ORM** : Prisma 5.20.0  
**Tables** : 19  
**Relations** : 25+  
**Indexes** : 40+

---

## 📐 Diagramme ERD
```
┌─────────────┐         ┌──────────────────┐
│    users    │────────<│  user_profiles   │
└──────┬──────┘         └──────────────────┘
       │
       ├────────<┌─────────────┐
       │         │  vehicles   │
       │         └─────────────┘
       │
       ├────────<┌──────────────┐
       │         │  rfid_cards  │
       │         └──────────────┘
       │
       ├────────<┌─────────────┐         ┌──────────────────┐
       │         │   wallets   │────────<│wallet_transactions│
       │         └─────────────┘         └──────────────────┘
       │
       ├────────<┌───────────────────┐
       │         │charging_sessions  │
       │         └─────────┬─────────┘
       │                   │
       │                   ├────>┌──────────────────────┐
       │                   │     │charging_stations     │
       │                   │     └──────────────────────┘
       │                   │
       │                   └────>┌─────────────┐
       │                         │  payments   │
       │                         └─────────────┘
       │
       └────────<┌─────────────────┐
                 │  notifications  │
                 └─────────────────┘
```

---

## 📋 Tables Principales

### 1. users
**Utilisateurs de la plateforme**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant unique |
| email | VARCHAR | UNIQUE, NOT NULL | Email |
| password | VARCHAR | NOT NULL | Hash bcrypt |
| firstName | VARCHAR | NULLABLE | Prénom |
| lastName | VARCHAR | NULLABLE | Nom |
| phone | VARCHAR | UNIQUE, NULLABLE | Téléphone |
| role | ENUM | NOT NULL, DEFAULT 'USER' | ADMIN / OPERATOR / USER |
| status | ENUM | NOT NULL, DEFAULT 'PENDING' | ACTIVE / INACTIVE / SUSPENDED / PENDING |
| createdAt | TIMESTAMP | NOT NULL | Date de création |
| updatedAt | TIMESTAMP | NOT NULL | Dernière mise à jour |
| lastLogin | TIMESTAMP | NULLABLE | Dernier login |
| emailVerifiedAt | TIMESTAMP | NULLABLE | Email vérifié le |

**Indexes:**
- `users_email_idx` (email)
- `users_phone_idx` (phone)
- `users_status_idx` (status)
- `users_role_idx` (role)

**Relations:**
- → `user_profiles` (1:1)
- → `vehicles` (1:N)
- → `rfid_cards` (1:N)
- → `wallets` (1:1)
- → `charging_sessions` (1:N)
- → `payments` (1:N)
- → `notifications` (1:N)
- → `subscriptions` (1:N)

---

### 2. user_profiles
**Profils détaillés des utilisateurs**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | UNIQUE, FOREIGN KEY | Référence users |
| avatar | VARCHAR | NULLABLE | URL avatar |
| address | TEXT | NULLABLE | Adresse |
| city | VARCHAR | NULLABLE | Ville |
| country | VARCHAR | DEFAULT 'Guinea' | Pays |
| postalCode | VARCHAR | NULLABLE | Code postal |
| dateOfBirth | DATE | NULLABLE | Date de naissance |
| language | VARCHAR | DEFAULT 'fr' | Langue (fr/en) |
| notifications | BOOLEAN | DEFAULT true | Notifications activées |
| emailNotifications | BOOLEAN | DEFAULT true | Email notifs |
| smsNotifications | BOOLEAN | DEFAULT false | SMS notifs |
| pushNotifications | BOOLEAN | DEFAULT true | Push notifs |
| idCardNumber | VARCHAR | NULLABLE | Numéro CNI |
| idCardVerified | BOOLEAN | DEFAULT false | CNI vérifiée |
| idCardVerifiedAt | TIMESTAMP | NULLABLE | CNI vérifiée le |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

---

### 3. wallets
**Portefeuilles NG Wallet**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | UNIQUE, FOREIGN KEY | Référence users |
| balance | DECIMAL(10,2) | DEFAULT 0 | Solde en GNF |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

**Relations:**
- → `wallet_transactions` (1:N)

---

### 4. wallet_transactions
**Transactions du portefeuille**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| walletId | UUID | FOREIGN KEY | Référence wallets |
| type | ENUM | NOT NULL | CREDIT / DEBIT / REFUND / BONUS |
| amount | DECIMAL(10,2) | NOT NULL | Montant (+ ou -) |
| balanceBefore | DECIMAL(10,2) | NOT NULL | Solde avant |
| balanceAfter | DECIMAL(10,2) | NOT NULL | Solde après |
| description | TEXT | NULLABLE | Description |
| sessionId | UUID | NULLABLE | Session liée |
| paymentId | UUID | NULLABLE | Paiement lié |
| createdAt | TIMESTAMP | NOT NULL | Date transaction |

**Indexes:**
- `wallet_transactions_walletId_idx` (walletId)
- `wallet_transactions_createdAt_idx` (createdAt)

---

### 5. charging_stations
**Bornes de recharge**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| stationId | VARCHAR | UNIQUE | ID CitrineOS |
| name | VARCHAR | NOT NULL | Nom |
| code | VARCHAR | UNIQUE | Code (MTM001) |
| qrCode | VARCHAR | NULLABLE | QR Code (auto-généré) |
| address | TEXT | NOT NULL | Adresse |
| city | VARCHAR | NOT NULL | Ville |
| postalCode | VARCHAR | NULLABLE | Code postal |
| latitude | DECIMAL(10,8) | NOT NULL | Latitude |
| longitude | DECIMAL(11,8) | NOT NULL | Longitude |
| power | DECIMAL(6,2) | NOT NULL | Puissance (kW) |
| connectorType | ENUM | NOT NULL | TYPE1/TYPE2/CCS_COMBO/CHADEMO/GB_T/TESLA |
| numberOfPorts | INTEGER | DEFAULT 1 | Nombre de ports |
| status | ENUM | NOT NULL | AVAILABLE/OCCUPIED/OUT_OF_SERVICE/MAINTENANCE/OFFLINE |
| pricePerKwh | DECIMAL(8,2) | NOT NULL | Prix GNF/kWh |
| operatorId | UUID | NULLABLE, FOREIGN KEY | Opérateur |
| photos | TEXT[] | ARRAY | URLs photos |
| isPublic | BOOLEAN | DEFAULT true | Publique |
| description | TEXT | NULLABLE | Description |
| amenities | TEXT[] | ARRAY | Équipements (WiFi, Cafe...) |
| citrineosSyncedAt | TIMESTAMP | NULLABLE | Dernière sync |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

**Indexes:**
- `charging_stations_stationId_idx` (stationId)
- `charging_stations_status_idx` (status)
- `charging_stations_city_idx` (city)
- `charging_stations_location_idx` (latitude, longitude)

**Relations:**
- → `charging_sessions` (1:N)
- → `maintenance_logs` (1:N)
- → `reviews` (1:N)
- → `favorite_stations` (1:N)

---

### 6. charging_offers
**Offres de recharge**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| name | VARCHAR | NOT NULL | Nom (Recharge Rapide) |
| description | TEXT | NULLABLE | Description |
| type | ENUM | NOT NULL | QUICK/STANDARD/FULL |
| duration | INTEGER | NOT NULL | Durée (minutes) |
| power | DECIMAL(6,2) | NOT NULL | Puissance (kW) |
| price | DECIMAL(10,2) | NOT NULL | Prix fixe (GNF) |
| pricePerKwh | DECIMAL(8,2) | NULLABLE | Prix par kWh |
| isPromo | BOOLEAN | DEFAULT false | Promo active |
| promoPrice | DECIMAL(10,2) | NULLABLE | Prix promo |
| promoStart | TIMESTAMP | NULLABLE | Début promo |
| promoEnd | TIMESTAMP | NULLABLE | Fin promo |
| isActive | BOOLEAN | DEFAULT true | Active |
| zones | TEXT[] | ARRAY | Villes disponibles |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

**Indexes:**
- `charging_offers_type_idx` (type)
- `charging_offers_isActive_idx` (isActive)

---

### 7. charging_sessions
**Sessions de recharge**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | FOREIGN KEY | Utilisateur |
| stationId | UUID | FOREIGN KEY | Borne |
| connectorId | INTEGER | NOT NULL | ID connecteur |
| transactionId | INTEGER | NULLABLE | ID transaction OCPP |
| status | ENUM | NOT NULL | PENDING/ACTIVE/COMPLETED/FAILED/CANCELLED/STOPPED |
| startTime | TIMESTAMP | NOT NULL | Début |
| endTime | TIMESTAMP | NULLABLE | Fin |
| duration | INTEGER | NULLABLE | Durée (secondes) |
| meterStart | DECIMAL(12,2) | NULLABLE | Compteur début (Wh) |
| meterStop | DECIMAL(12,2) | NULLABLE | Compteur fin (Wh) |
| energyConsumed | DECIMAL(10,2) | NULLABLE | Énergie (kWh) |
| pricePerKwh | DECIMAL(8,2) | NULLABLE | Prix/kWh |
| cost | DECIMAL(10,2) | NULLABLE | Coût total (GNF) |
| paymentId | UUID | NULLABLE, FOREIGN KEY | Paiement |
| isPaid | BOOLEAN | DEFAULT false | Payé |
| stopReason | TEXT | NULLABLE | Raison arrêt |
| failureReason | TEXT | NULLABLE | Raison échec |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

**Indexes:**
- `charging_sessions_userId_idx` (userId)
- `charging_sessions_stationId_idx` (stationId)
- `charging_sessions_status_idx` (status)
- `charging_sessions_transactionId_idx` (transactionId)

---

### 8. payments
**Paiements**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | FOREIGN KEY | Utilisateur |
| cinetpayTransactionId | VARCHAR | UNIQUE, NULLABLE | ID Cinetpay |
| cinetpayPaymentToken | VARCHAR | NULLABLE | Token Cinetpay |
| cinetpayPaymentUrl | TEXT | NULLABLE | URL paiement |
| cinetpayOperator | VARCHAR | NULLABLE | Opérateur (OMGN, MTN) |
| amount | DECIMAL(10,2) | NOT NULL | Montant (GNF) |
| currency | VARCHAR | DEFAULT 'GNF' | Devise |
| method | ENUM | NULLABLE | MOBILE_MONEY/CARD/WALLET/CASH |
| status | ENUM | NOT NULL | PENDING/PROCESSING/COMPLETED/FAILED/CANCELLED/REFUNDED |
| reference | VARCHAR | UNIQUE | Référence unique |
| description | TEXT | NULLABLE | Description |
| metadata | JSONB | NULLABLE | Métadonnées |
| ipAddress | VARCHAR | NULLABLE | IP client |
| userAgent | TEXT | NULLABLE | User agent |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |
| completedAt | TIMESTAMP | NULLABLE | Complété le |
| failedAt | TIMESTAMP | NULLABLE | Échoué le |

**Indexes:**
- `payments_userId_idx` (userId)
- `payments_status_idx` (status)
- `payments_reference_idx` (reference)

**Relations:**
- → `charging_sessions` (1:N)

---

### 9. vehicles
**Véhicules des utilisateurs**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | FOREIGN KEY | Propriétaire |
| make | VARCHAR | NOT NULL | Marque (Tesla, Renault) |
| model | VARCHAR | NOT NULL | Modèle |
| year | INTEGER | NULLABLE | Année |
| color | VARCHAR | NULLABLE | Couleur |
| licensePlate | VARCHAR | UNIQUE, NULLABLE | Plaque |
| vehicleType | ENUM | DEFAULT 'CAR' | CAR/MOTORCYCLE/TRUCK/BUS/VAN |
| batteryCapacity | DECIMAL(6,2) | NULLABLE | Capacité batterie (kWh) |
| maxChargingPower | DECIMAL(6,2) | NULLABLE | Puissance max (kW) |
| photo | TEXT | NULLABLE | URL photo |
| isDefault | BOOLEAN | DEFAULT false | Véhicule par défaut |
| createdAt | TIMESTAMP | NOT NULL | Création |
| updatedAt | TIMESTAMP | NOT NULL | Mise à jour |

**Indexes:**
- `vehicles_userId_idx` (userId)

---

### 10. notifications
**Notifications utilisateurs**

| Colonne | Type | Contraintes | Description |
|---------|------|-------------|-------------|
| id | UUID | PRIMARY KEY | Identifiant |
| userId | UUID | FOREIGN KEY | Destinataire |
| type | ENUM | NOT NULL | INFO/SUCCESS/WARNING/ERROR/SESSION_STARTED/SESSION_COMPLETED/... |
| title | VARCHAR | NOT NULL | Titre |
| message | TEXT | NOT NULL | Message |
| read | BOOLEAN | DEFAULT false | Lu |
| actionUrl | TEXT | NULLABLE | Deep link |
| actionText | VARCHAR | NULLABLE | Texte bouton |
| metadata | JSONB | NULLABLE | Métadonnées |
| createdAt | TIMESTAMP | NOT NULL | Création |
| readAt | TIMESTAMP | NULLABLE | Lu le |

**Indexes:**
- `notifications_userId_idx` (userId)
- `notifications_read_idx` (read)
- `notifications_createdAt_idx` (createdAt)

---

## 🔗 Relations Complètes
```sql
-- users → user_profiles (1:1)
ALTER TABLE user_profiles 
  ADD CONSTRAINT fk_user_profiles_user 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- users → wallets (1:1)
ALTER TABLE wallets 
  ADD CONSTRAINT fk_wallets_user 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- wallets → wallet_transactions (1:N)
ALTER TABLE wallet_transactions 
  ADD CONSTRAINT fk_wallet_transactions_wallet 
  FOREIGN KEY (walletId) REFERENCES wallets(id) ON DELETE CASCADE;

-- users → charging_sessions (1:N)
ALTER TABLE charging_sessions 
  ADD CONSTRAINT fk_charging_sessions_user 
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE;

-- charging_stations → charging_sessions (1:N)
ALTER TABLE charging_sessions 
  ADD CONSTRAINT fk_charging_sessions_station 
  FOREIGN KEY (stationId) REFERENCES charging_stations(id);

-- payments → charging_sessions (1:N)
ALTER TABLE charging_sessions 
  ADD CONSTRAINT fk_charging_sessions_payment 
  FOREIGN KEY (paymentId) REFERENCES payments(id);
```

---

## 📈 Statistiques Base de Données
```sql
-- Nombre d'utilisateurs
SELECT COUNT(*) FROM users;

-- Nombre de sessions par statut
SELECT status, COUNT(*) 
FROM charging_sessions 
GROUP BY status;

-- Revenus totaux
SELECT SUM(cost) as total_revenue 
FROM charging_sessions 
WHERE isPaid = true;

-- Bornes par ville
SELECT city, COUNT(*) 
FROM charging_stations 
GROUP BY city;

-- Top 5 bornes les plus utilisées
SELECT 
  s.name,
  s.city,
  COUNT(cs.id) as session_count
FROM charging_stations s
LEFT JOIN charging_sessions cs ON s.id = cs.stationId
GROUP BY s.id, s.name, s.city
ORDER BY session_count DESC
LIMIT 5;
```

---

## 🛠️ Maintenance

### Backup
```bash
# Backup complet
pg_dump -U evcharge_user evcharge_prod > backup.sql

# Backup compressé
pg_dump -U evcharge_user evcharge_prod | gzip > backup.sql.gz

# Restore
psql -U evcharge_user evcharge_prod < backup.sql
```

### Optimisation
```sql
-- Analyser les tables
ANALYZE;

-- Vacuum
VACUUM ANALYZE;

-- Reindex
REINDEX DATABASE evcharge_prod;
```

---

**Développé par NG Technologie - Guinée 🇬🇳**