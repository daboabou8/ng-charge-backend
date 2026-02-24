# 🛠️ Guide d'Installation - EV Charge Guinée Backend

Guide complet pour installer et configurer le backend en local.

---

## 📋 Prérequis

### Système d'exploitation
- Windows 10/11
- macOS 10.15+
- Linux (Ubuntu 20.04+)

### Logiciels requis

| Logiciel | Version | Lien |
|----------|---------|------|
| Node.js | v20.14.0+ | https://nodejs.org |
| npm | v10.8.2+ | (inclus avec Node.js) |
| PostgreSQL | v18.2+ | https://postgresql.org |
| Git | v2.45+ | https://git-scm.com |
| VS Code | Latest | https://code.visualstudio.com |

---

## 📥 Installation

### 1. Cloner le Repository
```bash
# HTTPS
git clone https://github.com/your-org/ev-charge-guinee-backend.git

# SSH
git clone git@github.com:your-org/ev-charge-guinee-backend.git

# Entrer dans le dossier
cd ev-charge-guinee-backend
```

---

### 2. Installer Node.js et npm

#### Windows
```bash
# Télécharger depuis nodejs.org
# Ou utiliser Chocolatey
choco install nodejs

# Vérifier
node -v  # v20.14.0
npm -v   # 10.8.2
```

#### macOS
```bash
# Utiliser Homebrew
brew install node@20

# Vérifier
node -v
npm -v
```

#### Linux (Ubuntu)
```bash
# Installer Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Vérifier
node -v
npm -v
```

---

### 3. Installer PostgreSQL

#### Windows
```bash
# Télécharger depuis postgresql.org
# Ou utiliser Chocolatey
choco install postgresql

# Démarrer le service
net start postgresql-x64-18
```

#### macOS
```bash
# Homebrew
brew install postgresql@18
brew services start postgresql@18
```

#### Linux (Ubuntu)
```bash
# Installer PostgreSQL
sudo apt update
sudo apt install postgresql postgresql-contrib

# Démarrer le service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

---

### 4. Configurer PostgreSQL
```bash
# Se connecter à PostgreSQL
psql -U postgres

# OU sur Linux
sudo -u postgres psql
```

**Dans psql :**
```sql
-- Créer la base de données
CREATE DATABASE evcharge_dev;

-- Créer l'utilisateur
CREATE USER evcharge_user WITH PASSWORD 'VotreMotDePasseSecurise123!';

-- Donner tous les droits
GRANT ALL PRIVILEGES ON DATABASE evcharge_dev TO evcharge_user;

-- Donner le droit de créer des bases (pour shadow DB Prisma)
ALTER USER evcharge_user CREATEDB;

-- Vérifier
\l
\du

-- Quitter
\q
```

---

### 5. Installer les Dépendances du Projet
```bash
# Installer les packages npm
npm install --legacy-peer-deps

# Cela peut prendre 3-5 minutes
```

**Note :** Le flag `--legacy-peer-deps` est nécessaire à cause de conflits de dépendances avec Jest.

---

### 6. Configurer les Variables d'Environnement
```bash
# Copier le fichier exemple
cp .env.example .env

# OU sur Windows
copy .env.example .env
```

**Éditer le fichier `.env` :**
```env
# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL="postgresql://evcharge_user:VotreMotDePasseSecurise123!@localhost:5432/evcharge_dev?schema=public"

# ============================================================================
# JWT
# ============================================================================
JWT_SECRET="changez-moi-en-production-secret-tres-long-et-aleatoire-2026"
JWT_EXPIRATION="7d"
JWT_REFRESH_SECRET="changez-moi-aussi-refresh-secret-different-2026"
JWT_REFRESH_EXPIRATION="30d"

# ============================================================================
# APP
# ============================================================================
PORT=3000
NODE_ENV=development
APP_NAME="EV Charge Guinée API"

# ============================================================================
# CITRINEOS (AWS EC2)
# ============================================================================
CITRINEOS_API_URL="http://54.89.130.36:8080"
CITRINEOS_WS_OCPP16_URL="ws://54.89.130.36:8092"
CITRINEOS_WS_OCPP201_URL="ws://54.89.130.36:8081"
CITRINEOS_TENANT_ID="1"

# ============================================================================
# CINETPAY (Payment Gateway)
# ============================================================================
# Obtenir ces clés sur https://cinetpay.com
CINETPAY_API_KEY="votre-api-key-cinetpay"
CINETPAY_SITE_ID="votre-site-id"
CINETPAY_SECRET_KEY="votre-secret-key"
CINETPAY_NOTIFY_URL="http://localhost:3000/payments/webhook/cinetpay"

# ============================================================================
# FRONTEND
# ============================================================================
FRONTEND_URL="http://localhost:3001"
MOBILE_DEEP_LINK="evcharge://"

# ============================================================================
# EMAIL (Optionnel)
# ============================================================================
SMTP_HOST=""
SMTP_PORT=""
SMTP_USER=""
SMTP_PASSWORD=""
```

---

### 7. Générer le Client Prisma
```bash
# Générer le client Prisma
npx prisma generate

# Sortie attendue:
# ✔ Generated Prisma Client (v5.20.0)
```

---

### 8. Créer les Tables de la Base de Données
```bash
# Appliquer les migrations
npx prisma migrate dev

# Nom de la migration (optionnel)
# Enter a name for the new migration: › initial_setup
```

**✅ Sortie attendue :**
```
✔ Generated Prisma Client
The following migration(s) have been created and applied:

migrations/
  └─ 20260221_initial_setup/
    └─ migration.sql

Your database is now in sync with your schema.
```

**Vérifier les tables :**
```bash
# Se connecter à la DB
psql -U evcharge_user -d evcharge_dev -h localhost

# Lister les tables
\dt

# Sortie attendue: 19 tables
```

---

### 9. Créer des Données de Test (Optionnel)
```bash
# Se connecter à psql
psql -U evcharge_user -d evcharge_dev -h localhost
```

**Créer des offres de recharge :**
```sql
INSERT INTO charging_offers (id, name, description, type, duration, power, price, "pricePerKwh", "isPromo", "isActive", zones, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Recharge Rapide', 'Recharge rapide en 30 minutes', 'QUICK', 30, 50, 12500, 2500, false, true, ARRAY['Conakry', 'Kindia'], NOW(), NOW()),
  (gen_random_uuid(), 'Recharge Standard', 'Recharge équilibrée en 1 heure', 'STANDARD', 60, 30, 20000, 2000, false, true, ARRAY['Conakry', 'Kindia', 'Mamou'], NOW(), NOW()),
  (gen_random_uuid(), 'Recharge Complète', 'Recharge complète et économique', 'FULL', 120, 22, 30000, 1500, false, true, ARRAY['Conakry'], NOW(), NOW());

-- Vérifier
SELECT id, name, type, price FROM charging_offers;
```

---

### 10. Démarrer le Serveur
```bash
# Mode développement (avec hot reload)
npm run start:dev

# Sortie attendue:
# [Nest] LOG [NestFactory] Starting Nest application...
# [Nest] LOG [InstanceLoader] PrismaModule dependencies initialized
# [Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
# ...
# ✅ Database connected successfully
# [Nest] LOG [NestApplication] Nest application successfully started
```

Le serveur démarre sur **http://localhost:3000**

---

## 🧪 Tester l'Installation

### Test 1 : Endpoint de santé
```bash
# Dans un nouveau terminal
curl http://localhost:3000

# Réponse attendue:
# Hello World!
```

### Test 2 : Créer un utilisateur
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@evcharge.gn",
    "password": "Test123!",
    "firstName": "Test",
    "lastName": "User",
    "phone": "+224620000000"
  }'
```

**Réponse attendue :**
```json
{
  "user": {...},
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### Test 3 : Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@evcharge.gn",
    "password": "Test123!"
  }'
```

---

## 🔧 Outils Recommandés

### Extension VS Code
```bash
# Installer les extensions recommandées
code --install-extension Prisma.prisma
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension rangav.vscode-thunder-client
```

### Thunder Client (Test API)

1. Installer l'extension Thunder Client dans VS Code
2. Créer une nouvelle requête
3. Tester les endpoints

### Prisma Studio (GUI Base de données)
```bash
# Ouvrir Prisma Studio
npx prisma studio

# Ouvre un navigateur sur http://localhost:5555
```

---

## 📦 Scripts npm Disponibles
```bash
# Développement
npm run start:dev        # Démarrer avec hot reload
npm run start:debug      # Démarrer en mode debug

# Production
npm run build            # Compiler TypeScript
npm run start:prod       # Démarrer en production

# Base de données
npx prisma studio        # GUI base de données
npx prisma migrate dev   # Créer une migration
npx prisma migrate reset # Reset la DB (⚠️ supprime données)
npx prisma generate      # Regénérer le client

# Tests
npm run test             # Tests unitaires
npm run test:e2e         # Tests end-to-end
npm run test:cov         # Coverage

# Code Quality
npm run lint             # ESLint
npm run format           # Prettier
```

---

## 🐛 Résolution de Problèmes

### Erreur: "Cannot find module '@prisma/client'"
```bash
# Solution
npx prisma generate
```

### Erreur: "P1001: Can't reach database server"
```bash
# Vérifier que PostgreSQL est démarré
# Windows
net start postgresql-x64-18

# macOS
brew services start postgresql@18

# Linux
sudo systemctl start postgresql

# Vérifier la connection
psql -U evcharge_user -d evcharge_dev -h localhost
```

### Erreur: "Port 3000 is already in use"
```bash
# Changer le port dans .env
PORT=3001

# Ou tuer le processus qui utilise le port
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9
```

### Erreur: "npm install" échoue
```bash
# Supprimer node_modules et package-lock
rm -rf node_modules package-lock.json

# OU Windows
rmdir /s /q node_modules
del package-lock.json

# Réinstaller
npm install --legacy-peer-deps
```

### Erreur: "ECONNREFUSED" lors de la migration
```bash
# PostgreSQL n'est pas démarré
# Voir solution ci-dessus

# OU mauvais mot de passe dans .env
# Vérifier DATABASE_URL dans .env
```

---

## ✅ Checklist d'Installation

- [ ] Node.js v20.14.0+ installé
- [ ] PostgreSQL v18.2+ installé et démarré
- [ ] Base de données `evcharge_dev` créée
- [ ] Utilisateur `evcharge_user` créé avec droits
- [ ] Repository cloné
- [ ] `npm install` exécuté avec succès
- [ ] `.env` configuré
- [ ] `npx prisma generate` exécuté
- [ ] Migrations appliquées (`npx prisma migrate dev`)
- [ ] 19 tables créées dans la DB
- [ ] Serveur démarre sur http://localhost:3000
- [ ] Endpoint `/auth/register` fonctionne
- [ ] Endpoint `/auth/login` fonctionne

---

## 📞 Support

- **Email**: support@evcharge.gn
- **Documentation**: https://docs.evcharge.gn
- **Issues**: https://github.com/your-org/ev-charge-guinee-backend/issues

---

**Développé par NG Technologie - Guinée 🇬🇳**