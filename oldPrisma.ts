// ============================================================================
// EV CHARGE GUINÉE - COMPLETE DATABASE SCHEMA
// Covers all 137 functional requirements
// Version: 1.0
// ============================================================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================================================
// USERS & AUTHENTICATION (Req 23-29, 63-69)
// ============================================================================

enum UserRole {
  ADMIN // Administrateur (PROFIL 3)
  OPERATOR // Opérateur (PROFIL 2)
  USER // Utilisateur final (PROFIL 1)
}

enum UserStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
  PENDING // En attente de vérification email
}

model User {
  id        String     @id @default(uuid())
  email     String     @unique
  password  String
  firstName String?
  lastName  String?
  phone     String?    @unique
  avatar    String?
  role      UserRole   @default(USER)
  status    UserStatus @default(PENDING)

  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  lastLogin       DateTime?
  emailVerifiedAt DateTime?

  // Relations
  profile          UserProfile?
  vehicles         Vehicle[]
  wallet           Wallet?
  rfidCards        RfidCard[]
  sessions         ChargingSession[]
  payments         Payment[]
  notifications    Notification[]
  subscriptions    Subscription[]
  loyaltyPoints    LoyaltyPoint[]
  supportTickets   SupportTicket[]
  reviews          Review[]
  favoriteStations FavoriteStation[]
  systemLogs       SystemLog[]
  operatedStations ChargingStation[] @relation("StationOperator")

  @@index([email])
  @@index([phone])
  @@index([status])
  @@index([role])
  @@map("users")
}

model UserProfile {
  id     String @id @default(uuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  avatar      String?
  address     String?
  city        String?
  country     String    @default("Guinea")
  postalCode  String?
  dateOfBirth DateTime?

  // Preferences (Req 31)
  language           String  @default("fr")
  notifications      Boolean @default(true)
  emailNotifications Boolean @default(true)
  smsNotifications   Boolean @default(false)
  pushNotifications  Boolean @default(true)

  // KYC
  idCardNumber     String?
  idCardVerified   Boolean   @default(false)
  idCardVerifiedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("user_profiles")
}

// ============================================================================
// CHARGING STATIONS (Req 1-8, 43-48, 70-75)
// ============================================================================

enum StationStatus {
  AVAILABLE // Disponible
  OCCUPIED // En cours d'utilisation
  OUT_OF_SERVICE // Hors service
  MAINTENANCE // En maintenance
  OFFLINE // Hors ligne
}

enum ConnectorType {
  TYPE1 // J1772
  TYPE2 // Mennekes
  CCS_COMBO // CCS Combo
  CHADEMO // CHAdeMO
  GB_T // GB/T (Chine)
  TESLA // Tesla Supercharger
}

model ChargingStation {
  id        String  @id @default(uuid())
  stationId String  @unique // ID CitrineOS
  name      String
  code      String  @unique // Code pour scan manuel (Req 7)
  qrCode    String? // QR Code data (Req 6)

  // Location (Req 1-5)
  address    String
  city       String
  postalCode String?
  latitude   Float
  longitude  Float

  // Details (Req 3)
  power         Float // kW
  connectorType ConnectorType
  numberOfPorts Int           @default(1)
  status        StationStatus @default(AVAILABLE)

  // Pricing (Req 48, 74)
  pricePerKwh Float // GNF/kWh

  // Operator (Req 73)
  operatorId String?
  operator   User?   @relation("StationOperator", fields: [operatorId], references: [id])

  // Images
  photos String[] // Array of image URLs

  // Metadata
  isPublic    Boolean  @default(true)
  description String?
  amenities   String[] // ["WiFi", "Cafe", "Restroom"]

  // CitrineOS sync
  citrineosSyncedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  sessions        ChargingSession[]
  maintenanceLogs MaintenanceLog[]
  reviews         Review[]
  favoriteBy      FavoriteStation[]

  @@index([stationId])
  @@index([status])
  @@index([city])
  @@index([latitude, longitude])
  @@map("charging_stations")
}

// ============================================================================
// CHARGING OFFERS (Req 9-12, 76-81)
// ============================================================================

enum OfferType {
  QUICK // Rapide (30 min)
  STANDARD // Standard (1h)
  FULL // Complète (2h+)
}

model ChargingOffer {
  id          String  @id @default(uuid())
  name        String // "Recharge Rapide"
  description String?

  // Tarification
  price       Float // GNF (prix fixe ou prix de base)
  pricePerKwh Float? // GNF/kWh (alternative)
  currency    String @default("GNF")

  // Puissance (pour filtrer les bornes compatibles)
  minPower Float? // Puissance minimale (kW)
  maxPower Float? // Puissance maximale (kW)

  // Zones géographiques
  zones String[] // ["Conakry", "Kindia", "All"]

  // Horaires (optionnel - pour tarifs heures pleines/creuses)
  startTime String? // "00:00"
  endTime   String? // "23:59"

  // Jours de la semaine (optionnel)
  activeDays String[] // ["MONDAY", "TUESDAY", etc.]

  // Type d'offre (optionnel, pour compatibilité)
  type     OfferType? // Si tu veux garder l'enum existant
  duration Int? // Minutes (si type est défini)
  power    Float? // kW (si type est défini)

  // Promo (Req 80-81)
  isPromo    Boolean   @default(false)
  promoPrice Float?
  promoStart DateTime?
  promoEnd   DateTime?

  // Visibilité
  isActive Boolean @default(true)
  isPublic Boolean @default(true)

  // Métadonnées
  metadata Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  sessions ChargingSession[]

  @@index([isActive])
  @@index([type])
  @@map("charging_offers")
}

// ============================================================================
// VEHICLES (User vehicles)
// ============================================================================

enum VehicleType {
  CAR
  MOTORCYCLE
  TRUCK
  BUS
  VAN
}

model Vehicle {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  make             String
  model            String
  year             Int?
  color            String?
  licensePlate     String?     @unique
  vehicleType      VehicleType @default(CAR)
  batteryCapacity  Float? // kWh
  maxChargingPower Float? // kW
  photo            String?
  isDefault        Boolean     @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@map("vehicles")
}

// ============================================================================
// RFID CARDS
// ============================================================================

enum RfidCardStatus {
  ACTIVE
  BLOCKED
  EXPIRED
  LOST
  STOLEN
}

model RfidCard {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  cardNumber        String         @unique
  cardName          String?
  status            RfidCardStatus @default(ACTIVE)
  issueDate         DateTime       @default(now())
  expiryDate        DateTime?
  citrineosSyncedAt DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([cardNumber])
  @@index([userId])
  @@map("rfid_cards")
}

// ============================================================================
// CHARGING SESSIONS (Req 18-22, 26-29, 54-58, 118-122)
// ============================================================================

enum SessionStatus {
  PENDING
  ACTIVE
  COMPLETED
  FAILED
  CANCELLED
  STOPPED
}

model ChargingSession {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  stationId String
  station   ChargingStation @relation(fields: [stationId], references: [id])

  connectorId   Int
  transactionId Int?

  status    SessionStatus @default(PENDING)
  startTime DateTime      @default(now())
  endTime   DateTime?
  duration  Int? // Seconds

  // Energy (Req 22)
  meterStart     Float? // Wh
  meterStop      Float? // Wh
  energyConsumed Float? // kWh

  // Cost (Req 121)
  pricePerKwh Float?
  cost        Float? // GNF

  // Payment
  paymentId String?
  payment   Payment? @relation(fields: [paymentId], references: [id])
  isPaid    Boolean  @default(false)

  // Relation offre
  offerId String?
  offer   ChargingOffer? @relation(fields: [offerId], references: [id], onDelete: SetNull)

  // Metadata
  stopReason    String?
  failureReason String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([stationId])
  @@index([status])
  @@index([transactionId])
  @@map("charging_sessions")
}

// ============================================================================
// PAYMENTS (Req 13-17, 82-88)
// ============================================================================

enum PaymentStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}

enum PaymentMethod {
  MOBILE_MONEY // NG Wallet, Orange Money, MTN
  CARD // Visa, Mastercard
  WALLET // Portefeuille interne
  CASH
}

model Payment {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Cinetpay (Req 14)
  cinetpayTransactionId String? @unique
  cinetpayPaymentToken  String?
  cinetpayPaymentUrl    String?
  cinetpayOperator      String? // OMGN, MTN, etc.

  amount      Float
  currency    String         @default("GNF")
  method      PaymentMethod?
  status      PaymentStatus  @default(PENDING)
  reference   String         @unique
  description String?

  // ⬇️ CHAMPS AJOUTÉS POUR REFUND ET FAILURE
  failureReason String? // Raison de l'échec du paiement
  refundReason  String? // Raison du remboursement
  refundedAt    DateTime? // Date du remboursement

  // Metadata
  metadata  Json?
  ipAddress String?
  userAgent String?

  // Relations
  sessions ChargingSession[]

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  completedAt DateTime?
  failedAt    DateTime?

  @@index([userId])
  @@index([status])
  @@index([reference])
  @@map("payments")
}

// ============================================================================
// SUBSCRIPTIONS (Req 34-38, 89-93)
// ============================================================================

enum SubscriptionStatus {
  ACTIVE
  EXPIRED
  CANCELLED
  SUSPENDED
}

model SubscriptionPlan {
  id          String  @id @default(uuid())
  name        String // "Premium Monthly"
  description String?

  // Pricing
  price    Float // GNF/month
  duration Int // Days (30, 90, 365)

  // Benefits
  benefits Json // {"freeKwh": 100, "discount": 20}

  // Limits
  maxSessions Int? // Max sessions per month

  isActive Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  subscriptions Subscription[]

  @@index([isActive])
  @@map("subscription_plans")
}

model Subscription {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  planId String
  plan   SubscriptionPlan @relation(fields: [planId], references: [id])

  status    SubscriptionStatus @default(ACTIVE)
  startDate DateTime           @default(now())
  endDate   DateTime
  autoRenew Boolean            @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@map("subscriptions")
}

// ============================================================================
// LOYALTY POINTS (Req 37-38)
// ============================================================================

enum LoyaltyTransactionType {
  EARNED // Points gagnés
  REDEEMED // Points dépensés
  EXPIRED // Points expirés
}

model LoyaltyPoint {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  points      Int // +100 or -50
  type        LoyaltyTransactionType
  description String?
  expiresAt   DateTime?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([expiresAt])
  @@map("loyalty_points")
}

// ============================================================================
// SUPPORT TICKETS (Req 39-42, 107-111)
// ============================================================================

enum TicketStatus {
  OPEN
  IN_PROGRESS
  RESOLVED
  CLOSED
}

enum TicketPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

model SupportTicket {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  subject     String
  description String
  status      TicketStatus   @default(OPEN)
  priority    TicketPriority @default(MEDIUM)

  // Assignment (Req 108)
  assignedToId String?

  // Station related
  stationId String?

  // Attachments
  attachments String[] // URLs

  // Resolution
  resolvedAt DateTime?
  resolution String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([userId])
  @@index([status])
  @@index([priority])
  @@map("support_tickets")
}

// ============================================================================
// MAINTENANCE LOGS (Req 49-53, 57)
// ============================================================================

enum MaintenanceType {
  PREVENTIVE // Préventive
  CORRECTIVE // Corrective
  EMERGENCY // Urgence
}

enum MaintenanceStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model MaintenanceLog {
  id        String          @id @default(uuid())
  stationId String
  station   ChargingStation @relation(fields: [stationId], references: [id])

  type        MaintenanceType
  status      MaintenanceStatus @default(SCHEDULED)
  description String

  // Scheduling (Req 50)
  scheduledAt DateTime?
  startedAt   DateTime?
  completedAt DateTime?

  // Technician
  technicianName String?
  notes          String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stationId])
  @@index([status])
  @@map("maintenance_logs")
}

// ============================================================================
// REVIEWS (Req 110)
// ============================================================================

model Review {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  stationId String
  station   ChargingStation @relation(fields: [stationId], references: [id])

  rating  Int // 1-5 stars
  comment String?

  // Moderation (Req 111)
  isModerated Boolean @default(false)
  isApproved  Boolean @default(true)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([stationId])
  @@index([userId])
  @@map("reviews")
}

// ============================================================================
// FAVORITE STATIONS (User feature)
// ============================================================================

model FavoriteStation {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  stationId String
  station   ChargingStation @relation(fields: [stationId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, stationId])
  @@index([userId])
  @@map("favorite_stations")
}

// ============================================================================
// NOTIFICATIONS (Req 30-33, 112-117)
// ============================================================================

enum NotificationType {
  INFO
  SUCCESS
  WARNING
  ERROR
  SESSION_STARTED
  SESSION_COMPLETED
  SESSION_FAILED
  PAYMENT_REQUIRED
  PAYMENT_SUCCESS
  PAYMENT_FAILED
  RFID_EXPIRING
  SUBSCRIPTION_RENEWAL
  MAINTENANCE_ALERT
  PROMOTION
  WELCOME
  LOW_BALANCE
  STATION_OFFLINE
  MAINTENANCE_SCHEDULED
}

enum NotificationStatus {
  PENDING
  SENDING
  SENT
  DELIVERED
  FAILED
  BOUNCED
}

model Notification {
  id     String @id @default(uuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Template utilisé
  templateId String?
  template   NotificationTemplate? @relation(fields: [templateId], references: [id], onDelete: SetNull)

  // Type et contenu
  type    NotificationType
  channel NotificationChannel? // ⬅️ AJOUTER pour savoir le canal utilisé

  // Contenu (peut être généré depuis template OU personnalisé)
  title     String
  subject   String? // Pour emails
  message   String // Corps principal (ou "body")
  recipient String? // Email ou numéro de téléphone

  // Statut d'envoi
  status      NotificationStatus @default(PENDING)
  sentAt      DateTime?
  deliveredAt DateTime?

  // UI (lecture dans l'app)
  read   Boolean   @default(false)
  readAt DateTime?

  // Actions
  actionUrl  String?
  actionText String?

  // Métadonnées
  metadata Json?

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([read])
  @@index([status])
  @@index([createdAt])
  @@map("notifications")
}

model NotificationTemplate {
  id      String              @id @default(uuid())
  name    String              @unique // "welcome_email", "session_completed_sms"
  type    NotificationType
  channel NotificationChannel

  // Contenu
  subject   String? // Pour emails uniquement
  body      String // Template avec variables {{variable}}
  variables String[] // ["userName", "amount", etc.]

  // Configuration
  isActive Boolean @default(true)
  language String  @default("fr")

  // Métadonnées
  metadata Json?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // ⬇️ AJOUTER CETTE LIGNE (relation inverse)
  notifications Notification[]

  @@index([type])
  @@index([channel])
  @@index([isActive])
  @@map("notification_templates")
}

// ============================================================================
// WALLETS (NG Wallet - Portefeuille interne)
// ============================================================================

model Wallet {
  id     String @id @default(uuid())
  userId String @unique
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  balance Float @default(0) // GNF

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  transactions WalletTransaction[]

  @@index([userId])
  @@map("wallets")
}

enum WalletTransactionType {
  CREDIT // Recharge du wallet
  DEBIT // Déduction pour charge
  REFUND // Remboursement
  BONUS // Bonus/Promotion
}

model WalletTransaction {
  id       String @id @default(uuid())
  walletId String
  wallet   Wallet @relation(fields: [walletId], references: [id], onDelete: Cascade)

  type          WalletTransactionType
  amount        Float // GNF (+ pour crédit, - pour débit)
  balanceBefore Float
  balanceAfter  Float
  description   String?

  // Référence optionnelle à une session ou paiement
  sessionId String?
  paymentId String?

  createdAt DateTime @default(now())

  @@index([walletId])
  @@index([createdAt])
  @@map("wallet_transactions")
}

// ============================================================================
// SETTINGS & CONFIGURATION MODULE (Req 94-106, 112-117)
// ============================================================================

// ==================== APP SETTINGS ====================

enum SettingType {
  STRING
  NUMBER
  BOOLEAN
  JSON
  EMAIL
  URL
}

enum SettingCategory {
  GENERAL // Nom app, logo, etc.
  EMAIL // SMTP config
  SMS // SMS provider config
  PAYMENT // Orange Money, MTN, etc.
  NOTIFICATION // Templates notifications
  SECURITY // Rate limiting, etc.
  BILLING // Facturation
  OTHER
}

model AppSetting {
  id       String          @id @default(uuid())
  key      String          @unique // "app.name", "smtp.host", etc.
  value    String // Valeur du paramètre
  type     SettingType     @default(STRING)
  category SettingCategory @default(GENERAL)

  description String?
  isPublic    Boolean @default(false) // Visible dans l'API publique
  isEditable  Boolean @default(true) // Modifiable via UI

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@index([category])
  @@index([key])
  @@map("app_settings")
}

// ==================== NOTIFICATION TEMPLATES ====================

enum NotificationChannel {
  EMAIL
  SMS
  PUSH
  IN_APP
}

// ==================== SYSTEM LOGS ====================

enum LogLevel {
  DEBUG
  INFO
  WARN
  ERROR
  CRITICAL
}

enum LogCategory {
  SYSTEM
  AUTH
  SESSION
  PAYMENT
  NOTIFICATION
  API
  DATABASE
  SECURITY
  OTHER
}

model SystemLog {
  id String @id @default(uuid())

  // Type de log
  level    LogLevel    @default(INFO)
  category LogCategory @default(SYSTEM)

  // Contexte
  userId String?
  user   User?   @relation(fields: [userId], references: [id], onDelete: SetNull)

  // Contenu
  message String
  details Json?

  // Trace
  stackTrace String?

  // Métadonnées
  ipAddress  String?
  userAgent  String?
  endpoint   String?
  method     String?
  statusCode Int?
  duration   Int? // Durée en ms

  createdAt DateTime @default(now())

  @@index([level])
  @@index([category])
  @@index([userId])
  @@index([createdAt])
  @@map("system_logs")
}
