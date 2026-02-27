import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seed des bornes...');

  const station1 = await prisma.chargingStation.upsert({
    where: { code: 'CONAKRY-001' },
    update: {},
    create: {
      stationId: 'STATION-KALOUM-001', // ⬅️ Ajouter stationId (requis)
      name: 'Station Kaloum Centre',
      code: 'CONAKRY-001',
      address: 'Avenue de la République',
      city: 'Conakry',
      latitude: 9.5092,
      longitude: -13.7122,
      power: 22,
      connectorType: 'TYPE2',
      numberOfPorts: 2, // ⬅️ numberOfPorts au lieu de numberOfConnectors
      pricePerKwh: 2500,
      status: 'AVAILABLE',
    },
  });
  console.log('✅ Station 1 créée:', station1.name);

  const station2 = await prisma.chargingStation.upsert({
    where: { code: 'CONAKRY-002' },
    update: {},
    create: {
      stationId: 'STATION-DIXINN-002',
      name: 'Station Dixinn',
      code: 'CONAKRY-002',
      address: 'Route de Donka',
      city: 'Conakry',
      latitude: 9.5370,
      longitude: -13.6785,
      power: 50,
      connectorType: 'CCS_COMBO',
      numberOfPorts: 4,
      pricePerKwh: 3000,
      status: 'AVAILABLE',
    },
  });
  console.log('✅ Station 2 créée:', station2.name);

  const station3 = await prisma.chargingStation.upsert({
    where: { code: 'CONAKRY-003' },
    update: {},
    create: {
      stationId: 'STATION-MATAM-003',
      name: 'Station Matam',
      code: 'CONAKRY-003',
      address: 'Boulevard du Commerce',
      city: 'Conakry',
      latitude: 9.5150,
      longitude: -13.6900,
      power: 22,
      connectorType: 'TYPE2',
      numberOfPorts: 3,
      pricePerKwh: 2500,
      status: 'AVAILABLE',
    },
  });
  console.log('✅ Station 3 créée:', station3.name);

  console.log('');
  console.log('📊 3 bornes créées');
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}