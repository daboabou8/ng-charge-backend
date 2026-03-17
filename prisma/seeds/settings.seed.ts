import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedSettings() {
  console.log('🌱 Seeding Settings...');

  // ==================== OFFRES DE RECHARGE ====================
  console.log('📋 Creating Charging Offers...');

  const offers = await Promise.all([
    prisma.chargingOffer.create({
      data: {
        name: 'Recharge Standard',
        description: 'Offre standard pour recharge quotidienne',
        price: 2500, // 2500 GNF/kWh
        minPower: 0,
        maxPower: 22,
        zones: ['Conakry', 'Kindia', 'Labé'],
        isActive: true,
        isPublic: true,
      },
    }),
    prisma.chargingOffer.create({
      data: {
        name: 'Recharge Rapide',
        description: 'Recharge rapide pour bornes haute puissance',
        price: 3500, // 3500 GNF/kWh
        minPower: 22,
        maxPower: 50,
        zones: ['Conakry'],
        isActive: true,
        isPublic: true,
      },
    }),
    prisma.chargingOffer.create({
      data: {
        name: 'Recharge Ultra-Rapide',
        description: 'Recharge ultra-rapide pour déplacements longue distance',
        price: 4500, // 4500 GNF/kWh
        minPower: 50,
        maxPower: 150,
        zones: ['Conakry'],
        isActive: true,
        isPublic: true,
      },
    }),
    prisma.chargingOffer.create({
      data: {
        name: 'Heures Creuses',
        description: 'Tarif réduit de 22h à 6h',
        price: 1800, // 1800 GNF/kWh
        zones: ['All'],
        startTime: '22:00',
        endTime: '06:00',
        isActive: true,
        isPublic: true,
      },
    }),
  ]);

  console.log(`✅ Created ${offers.length} charging offers`);

  // ==================== PARAMÈTRES APP ====================
  console.log('⚙️ Creating App Settings...');

  const settings = await Promise.all([
    // GENERAL
    prisma.appSetting.create({
      data: {
        key: 'app.name',
        value: 'EV Charge Guinée',
        type: 'STRING',
        category: 'GENERAL',
        description: 'Nom de l\'application',
        isPublic: true,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'app.tagline',
        value: 'Rechargez votre véhicule électrique en Guinée',
        type: 'STRING',
        category: 'GENERAL',
        description: 'Slogan de l\'application',
        isPublic: true,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'app.currency',
        value: 'GNF',
        type: 'STRING',
        category: 'GENERAL',
        description: 'Devise par défaut',
        isPublic: true,
        isEditable: false,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'app.language',
        value: 'fr',
        type: 'STRING',
        category: 'GENERAL',
        description: 'Langue par défaut',
        isPublic: true,
        isEditable: true,
      },
    }),

    // EMAIL
    prisma.appSetting.create({
      data: {
        key: 'email.smtp.host',
        value: 'smtp.gmail.com',
        type: 'STRING',
        category: 'EMAIL',
        description: 'Serveur SMTP',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'email.smtp.port',
        value: '587',
        type: 'NUMBER',
        category: 'EMAIL',
        description: 'Port SMTP',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'email.from.name',
        value: 'EV Charge Guinée',
        type: 'STRING',
        category: 'EMAIL',
        description: 'Nom de l\'expéditeur',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'email.from.address',
        value: 'noreply@evcharge.gn',
        type: 'EMAIL',
        category: 'EMAIL',
        description: 'Email de l\'expéditeur',
        isPublic: false,
        isEditable: true,
      },
    }),

    // SMS
    prisma.appSetting.create({
      data: {
        key: 'sms.provider',
        value: 'twilio',
        type: 'STRING',
        category: 'SMS',
        description: 'Fournisseur SMS (twilio, nexmo, orange)',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'sms.sender.name',
        value: 'EV Charge',
        type: 'STRING',
        category: 'SMS',
        description: 'Nom de l\'expéditeur SMS',
        isPublic: false,
        isEditable: true,
      },
    }),

    // PAYMENT
    prisma.appSetting.create({
      data: {
        key: 'payment.methods.enabled',
        value: JSON.stringify(['ORANGE_MONEY', 'MTN_MOBILE_MONEY', 'WALLET']),
        type: 'JSON',
        category: 'PAYMENT',
        description: 'Méthodes de paiement activées',
        isPublic: true,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'payment.min.amount',
        value: '5000',
        type: 'NUMBER',
        category: 'PAYMENT',
        description: 'Montant minimum de paiement (GNF)',
        isPublic: true,
        isEditable: true,
      },
    }),

    // NOTIFICATION
    prisma.appSetting.create({
      data: {
        key: 'notification.email.enabled',
        value: 'true',
        type: 'BOOLEAN',
        category: 'NOTIFICATION',
        description: 'Notifications email activées',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'notification.sms.enabled',
        value: 'true',
        type: 'BOOLEAN',
        category: 'NOTIFICATION',
        description: 'Notifications SMS activées',
        isPublic: false,
        isEditable: true,
      },
    }),

    // SECURITY
    prisma.appSetting.create({
      data: {
        key: 'security.session.timeout',
        value: '3600',
        type: 'NUMBER',
        category: 'SECURITY',
        description: 'Timeout de session en secondes',
        isPublic: false,
        isEditable: true,
      },
    }),
    prisma.appSetting.create({
      data: {
        key: 'security.max.login.attempts',
        value: '5',
        type: 'NUMBER',
        category: 'SECURITY',
        description: 'Nombre maximum de tentatives de connexion',
        isPublic: false,
        isEditable: true,
      },
    }),
  ]);

  console.log(`✅ Created ${settings.length} app settings`);

  // ==================== TEMPLATES NOTIFICATIONS ====================
  console.log('📧 Creating Notification Templates...');

  const templates = await Promise.all([
    // EMAIL - WELCOME
    prisma.notificationTemplate.create({
      data: {
        name: 'welcome_email',
        type: 'WELCOME',
        channel: 'EMAIL',
        subject: 'Bienvenue sur EV Charge Guinée ! 🎉',
        body: `
Bonjour {{userName}},

Bienvenue sur EV Charge Guinée ! 🚗⚡

Votre compte a été créé avec succès. Vous pouvez maintenant :
- Trouver des bornes de recharge près de chez vous
- Recharger votre véhicule électrique facilement
- Suivre vos sessions et vos consommations

Commencez dès maintenant : https://evcharge.gn

Cordialement,
L'équipe EV Charge Guinée
        `,
        variables: ['userName'],
        isActive: true,
        language: 'fr',
      },
    }),

    // EMAIL - SESSION COMPLETED
    prisma.notificationTemplate.create({
      data: {
        name: 'session_completed_email',
        type: 'SESSION_COMPLETED',
        channel: 'EMAIL',
        subject: 'Recharge terminée - Facture #{{sessionId}}',
        body: `
Bonjour {{userName}},

Votre session de recharge est terminée ! ✅

Détails de la session :
- Borne : {{stationName}}
- Énergie consommée : {{energy}} kWh
- Durée : {{duration}}
- Montant : {{cost}} GNF

Vous pouvez consulter le détail de votre facture sur votre compte.

Merci de votre confiance !
L'équipe EV Charge Guinée
        `,
        variables: ['userName', 'sessionId', 'stationName', 'energy', 'duration', 'cost'],
        isActive: true,
        language: 'fr',
      },
    }),

    // SMS - SESSION STARTED
    prisma.notificationTemplate.create({
      data: {
        name: 'session_started_sms',
        type: 'SESSION_STARTED',
        channel: 'SMS',
        body: 'EV Charge: Recharge démarrée à {{stationName}}. Suivez votre session sur l\'app.',
        variables: ['stationName'],
        isActive: true,
        language: 'fr',
      },
    }),

    // SMS - LOW BALANCE
    prisma.notificationTemplate.create({
      data: {
        name: 'low_balance_sms',
        type: 'LOW_BALANCE',
        channel: 'SMS',
        body: 'EV Charge: Votre solde est faible ({{balance}} GNF). Rechargez votre wallet pour continuer à utiliser nos bornes.',
        variables: ['balance'],
        isActive: true,
        language: 'fr',
      },
    }),
  ]);

  console.log(`✅ Created ${templates.length} notification templates`);

  console.log('✅ Settings seeding completed!');
}

seedSettings()
  .catch((e) => {
    console.error('❌ Settings seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });