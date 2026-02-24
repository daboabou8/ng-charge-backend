# 🚀 Guide de Déploiement - EV Charge Guinée Backend

Guide pour déployer le backend en production sur AWS EC2.

---

## 🎯 Architecture de Production
```
┌─────────────────────────────────────────────┐
│           AWS EC2 (t3.medium)               │
│         54.89.130.36 (Exemple)              │
│                                             │
│  ┌────────────────────────────────────┐    │
│  │  Nginx (Reverse Proxy)             │    │
│  │  Port 80/443                        │    │
│  └──────────┬─────────────────────────┘    │
│             │                               │
│  ┌──────────▼──────────┐  ┌──────────────┐ │
│  │  Backend NestJS     │  │ CitrineOS    │ │
│  │  Port 3000          │  │ Port 8080    │ │
│  └─────────────────────┘  └──────────────┘ │
│             │                               │
│  ┌──────────▼──────────┐                   │
│  │  PostgreSQL         │                   │
│  │  Port 5432          │                   │
│  └─────────────────────┘                   │
└─────────────────────────────────────────────┘
```

---

## 📋 Prérequis

### Instance AWS EC2
- **Type**: t3.medium (2 vCPU, 4 GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30 GB SSD
- **IP Publique**: Oui
- **Security Group**: Ports 80, 443, 22, 3000 ouverts

### Nom de Domaine
- `api.evcharge.gn` → Backend
- `evcharge.gn` → Frontend (futur)

---

## 🛠️ Étape 1 : Préparation de l'Instance EC2

### 1.1 Connexion SSH
```bash
# Depuis votre machine locale
ssh -i "your-key.pem" ubuntu@54.89.130.36

# OU si vous avez configuré un alias
ssh evcharge-backend
```

### 1.2 Mise à jour du système
```bash
# Mettre à jour les packages
sudo apt update
sudo apt upgrade -y

# Installer les outils essentiels
sudo apt install -y curl wget git build-essential
```

---

## 📦 Étape 2 : Installation des Dépendances

### 2.1 Installer Node.js 20
```bash
# Ajouter le repo Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Installer Node.js
sudo apt install -y nodejs

# Vérifier
node -v  # v20.x.x
npm -v   # 10.x.x
```

### 2.2 Installer PostgreSQL 18
```bash
# Ajouter le repo PostgreSQL
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -

# Mettre à jour et installer
sudo apt update
sudo apt install -y postgresql-18

# Vérifier
sudo systemctl status postgresql
```

### 2.3 Configurer PostgreSQL
```bash
# Se connecter à PostgreSQL
sudo -u postgres psql

# Dans psql:
CREATE DATABASE evcharge_prod;
CREATE USER evcharge_user WITH PASSWORD 'MotDePasseTresFort2026!';
GRANT ALL PRIVILEGES ON DATABASE evcharge_prod TO evcharge_user;
ALTER USER evcharge_user CREATEDB;

-- Autoriser les connexions locales
\q

# Éditer pg_hba.conf (optionnel pour connexions externes)
sudo nano /etc/postgresql/18/main/pg_hba.conf

# Ajouter cette ligne si nécessaire:
# host    all             all             0.0.0.0/0               md5

# Redémarrer PostgreSQL
sudo systemctl restart postgresql
```

### 2.4 Installer Nginx
```bash
# Installer Nginx
sudo apt install -y nginx

# Démarrer Nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Vérifier
sudo systemctl status nginx
```

### 2.5 Installer PM2 (Process Manager)
```bash
# Installer PM2 globalement
sudo npm install -g pm2

# Vérifier
pm2 -v
```

---

## 📥 Étape 3 : Déployer le Code

### 3.1 Cloner le Repository
```bash
# Créer le dossier de l'application
sudo mkdir -p /var/www
cd /var/www

# Cloner le repo
sudo git clone https://github.com/your-org/ev-charge-guinee-backend.git
cd ev-charge-guinee-backend

# Donner les permissions à ubuntu
sudo chown -R ubuntu:ubuntu /var/www/ev-charge-guinee-backend
```

### 3.2 Installer les Dépendances
```bash
# Installer les packages
npm install --legacy-peer-deps --production

# Générer Prisma Client
npx prisma generate
```

### 3.3 Configurer les Variables d'Environnement
```bash
# Créer le fichier .env
nano .env
```

**Contenu du `.env` de production :**
```env
# ============================================================================
# DATABASE
# ============================================================================
DATABASE_URL="postgresql://evcharge_user:MotDePasseTresFort2026!@localhost:5432/evcharge_prod?schema=public"

# ============================================================================
# JWT
# ============================================================================
JWT_SECRET="production-secret-super-securise-aleatoire-2026-guinee"
JWT_EXPIRATION="7d"
JWT_REFRESH_SECRET="production-refresh-secret-different-aleatoire-2026"
JWT_REFRESH_EXPIRATION="30d"

# ============================================================================
# APP
# ============================================================================
PORT=3000
NODE_ENV=production
APP_NAME="EV Charge Guinée API"

# ============================================================================
# CITRINEOS (Même serveur)
# ============================================================================
CITRINEOS_API_URL="http://localhost:8080"
CITRINEOS_WS_OCPP16_URL="ws://localhost:8092"
CITRINEOS_WS_OCPP201_URL="ws://localhost:8081"
CITRINEOS_TENANT_ID="1"

# ============================================================================
# CINETPAY (Production)
# ============================================================================
CINETPAY_API_KEY="votre-vraie-api-key-production"
CINETPAY_SITE_ID="votre-vrai-site-id"
CINETPAY_SECRET_KEY="votre-vrai-secret-key"
CINETPAY_NOTIFY_URL="https://api.evcharge.gn/payments/webhook/cinetpay"

# ============================================================================
# FRONTEND
# ============================================================================
FRONTEND_URL="https://evcharge.gn"
MOBILE_DEEP_LINK="evcharge://"
```

**Sauvegarder** : `Ctrl + X`, `Y`, `Enter`

### 3.4 Appliquer les Migrations
```bash
# Appliquer les migrations
npx prisma migrate deploy

# Vérifier les tables
psql -U evcharge_user -d evcharge_prod -h localhost
\dt
\q
```

### 3.5 Créer les Offres de Recharge
```bash
# Se connecter à la DB
psql -U evcharge_user -d evcharge_prod -h localhost

# Copier-coller le SQL
INSERT INTO charging_offers (id, name, description, type, duration, power, price, "pricePerKwh", "isPromo", "isActive", zones, "createdAt", "updatedAt")
VALUES 
  (gen_random_uuid(), 'Recharge Rapide', 'Recharge rapide en 30 minutes', 'QUICK', 30, 50, 12500, 2500, false, true, ARRAY['Conakry', 'Kindia', 'Mamou'], NOW(), NOW()),
  (gen_random_uuid(), 'Recharge Standard', 'Recharge équilibrée en 1 heure', 'STANDARD', 60, 30, 20000, 2000, false, true, ARRAY['Conakry', 'Kindia', 'Mamou', 'Labé'], NOW(), NOW()),
  (gen_random_uuid(), 'Recharge Complète', 'Recharge complète et économique', 'FULL', 120, 22, 30000, 1500, false, true, ARRAY['Conakry', 'Kindia', 'Mamou', 'Labé', 'Kankan'], NOW(), NOW());

\q
```

---

## 🏗️ Étape 4 : Build et Démarrage

### 4.1 Compiler l'Application
```bash
# Build TypeScript → JavaScript
npm run build

# Vérifier que le dossier dist/ existe
ls -la dist/
```

### 4.2 Démarrer avec PM2
```bash
# Démarrer l'application avec PM2
pm2 start dist/main.js --name evcharge-api

# Sauvegarder la configuration PM2
pm2 save

# Configurer le démarrage automatique
pm2 startup
# Copier-coller la commande affichée et l'exécuter

# Vérifier
pm2 status
pm2 logs evcharge-api
```

**Commandes PM2 utiles :**
```bash
pm2 status              # Voir le statut
pm2 logs evcharge-api   # Voir les logs
pm2 restart evcharge-api # Redémarrer
pm2 stop evcharge-api   # Arrêter
pm2 delete evcharge-api # Supprimer
pm2 monit              # Monitoring en temps réel
```

---

## 🌐 Étape 5 : Configurer Nginx

### 5.1 Créer la Configuration Nginx
```bash
# Créer le fichier de configuration
sudo nano /etc/nginx/sites-available/evcharge-api
```

**Contenu :**
```nginx
server {
    listen 80;
    server_name api.evcharge.gn 54.89.130.36;

    # Logs
    access_log /var/log/nginx/evcharge-api-access.log;
    error_log /var/log/nginx/evcharge-api-error.log;

    # Client max body size (pour uploads)
    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3000/;
        access_log off;
    }
}
```

### 5.2 Activer la Configuration
```bash
# Créer le lien symbolique
sudo ln -s /etc/nginx/sites-available/evcharge-api /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier
sudo systemctl status nginx
```

---

## 🔒 Étape 6 : Configurer SSL/TLS (HTTPS)

### 6.1 Installer Certbot
```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx
```

### 6.2 Obtenir un Certificat SSL
```bash
# Obtenir et installer automatiquement le certificat
sudo certbot --nginx -d api.evcharge.gn

# Suivre les instructions:
# 1. Entrer votre email
# 2. Accepter les termes
# 3. Choisir si vous voulez rediriger HTTP → HTTPS (recommandé: Yes)
```

### 6.3 Renouvellement Automatique
```bash
# Tester le renouvellement
sudo certbot renew --dry-run

# Le renouvellement automatique est déjà configuré via cron
```

**Vérifier le certificat :**
```
https://api.evcharge.gn
```

---

## 🔥 Étape 7 : Configuration du Firewall
```bash
# Installer UFW (si pas déjà installé)
sudo apt install -y ufw

# Configurer les règles
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS

# Activer le firewall
sudo ufw enable

# Vérifier
sudo ufw status
```

---

## 📊 Étape 8 : Monitoring et Logs

### 8.1 Logs de l'Application
```bash
# Logs PM2
pm2 logs evcharge-api

# Logs en temps réel
pm2 logs evcharge-api --lines 100

# Logs Nginx
sudo tail -f /var/log/nginx/evcharge-api-access.log
sudo tail -f /var/log/nginx/evcharge-api-error.log
```

### 8.2 Monitoring PM2
```bash
# Interface de monitoring
pm2 monit

# Status détaillé
pm2 show evcharge-api
```

### 8.3 Monitoring Système
```bash
# CPU, RAM, Disk
htop

# Espace disque
df -h

# Processus
ps aux | grep node
```

---

## 🔄 Étape 9 : Script de Déploiement Automatique

### 9.1 Créer le Script
```bash
# Créer le script
nano /var/www/ev-charge-guinee-backend/deploy.sh
```

**Contenu :**
```bash
#!/bin/bash

echo "🚀 Déploiement Backend EV Charge Guinée..."

# Variables
APP_DIR="/var/www/ev-charge-guinee-backend"
APP_NAME="evcharge-api"

# Aller dans le dossier
cd $APP_DIR

# Pull dernières modifications
echo "📥 Pull des modifications..."
git pull origin main

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install --legacy-peer-deps --production

# Générer Prisma Client
echo "🔧 Génération Prisma Client..."
npx prisma generate

# Appliquer les migrations
echo "🗄️ Migrations base de données..."
npx prisma migrate deploy

# Build
echo "🏗️ Build de l'application..."
npm run build

# Redémarrer PM2
echo "🔄 Redémarrage PM2..."
pm2 restart $APP_NAME

# Logs
echo "📊 Logs (Ctrl+C pour quitter):"
pm2 logs $APP_NAME --lines 50
```

**Rendre exécutable :**
```bash
chmod +x /var/www/ev-charge-guinee-backend/deploy.sh
```

### 9.2 Utiliser le Script
```bash
# Déployer
cd /var/www/ev-charge-guinee-backend
./deploy.sh
```

---

## 🧪 Étape 10 : Tests de Production

### 10.1 Test Health Check
```bash
curl https://api.evcharge.gn/
```

### 10.2 Test Register
```bash
curl -X POST https://api.evcharge.gn/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evcharge.gn",
    "password": "Admin2026!",
    "firstName": "Admin",
    "lastName": "EV Charge",
    "phone": "+224620000001",
    "role": "ADMIN"
  }'
```

### 10.3 Test Login
```bash
curl -X POST https://api.evcharge.gn/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@evcharge.gn",
    "password": "Admin2026!"
  }'
```

---

## 🔐 Sécurité en Production

### Checklist Sécurité

- [ ] Variables d'environnement sécurisées
- [ ] JWT secrets forts et aléatoires
- [ ] PostgreSQL password fort
- [ ] SSL/TLS activé (HTTPS)
- [ ] Firewall configuré
- [ ] Accès SSH par clé uniquement
- [ ] Désactiver le root login SSH
- [ ] Rate limiting configuré
- [ ] CORS configuré correctement
- [ ] Logs de sécurité activés
- [ ] Backups automatiques configurés
- [ ] Monitoring actif

---

## 💾 Backups

### Script de Backup Automatique
```bash
# Créer le script
sudo nano /usr/local/bin/backup-evcharge.sh
```

**Contenu :**
```bash
#!/bin/bash

BACKUP_DIR="/var/backups/evcharge"
DATE=$(date +%Y%m%d_%H%M%S)

# Créer le dossier de backup
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
pg_dump -U evcharge_user evcharge_prod > $BACKUP_DIR/db_$DATE.sql

# Compresser
gzip $BACKUP_DIR/db_$DATE.sql

# Garder seulement les 7 derniers jours
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "✅ Backup terminé: $BACKUP_DIR/db_$DATE.sql.gz"
```

**Rendre exécutable et configurer cron :**
```bash
sudo chmod +x /usr/local/bin/backup-evcharge.sh

# Ajouter au cron (tous les jours à 2h du matin)
sudo crontab -e

# Ajouter cette ligne:
0 2 * * * /usr/local/bin/backup-evcharge.sh
```

---

## 📞 Support Production

- **Email**: devops@evcharge.gn
- **Slack**: #prod-alerts
- **On-Call**: +224 XXX XX XX XX

---

**Développé par NG Technologie - Guinée 🇬🇳**