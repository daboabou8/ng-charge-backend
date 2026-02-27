import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

export async function main() {
  console.log('🌱 Seed des utilisateurs...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // Admin
  const admin = await prisma.user.upsert({
    where: { email: 'abou.dabo@ngcharge.gn' },
    update: {},
    create: {
      email: 'abou.dabo@ngcharge.gn',
      password: hashedPassword,
      firstName: 'ABOU',
      lastName: 'DABO',
      role: 'ADMIN',
      status: 'ACTIVE',
    }, // ⬅️ Il manquait cette accolade fermante !
  });
  console.log('✅ Admin créé:', admin.email);

  // Operator
  const operator = await prisma.user.upsert({
    where: { email: 'operator@ngcharge.gn' },
    update: {},
    create: {
      email: 'operator@ngcharge.gn',
      password: hashedPassword,
      firstName: 'Operator',
      lastName: 'Team',
      role: 'OPERATOR',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Operator créé:', operator.email);

  // User 1
  const user1 = await prisma.user.upsert({
    where: { email: 'user@ngcharge.gn' },
    update: {},
    create: {
      email: 'user@ngcharge.gn',
      password: hashedPassword,
      firstName: 'Mohamed',
      lastName: 'CISSE',
      phone: '+224621234567',
      role: 'USER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ User créé:', user1.email);

  // User 2
  const user2 = await prisma.user.upsert({
    where: { email: 'aminata@ngcharge.gn' },
    update: {},
    create: {
      email: 'aminata@ngcharge.gn',
      password: hashedPassword,
      firstName: 'Aminata',
      lastName: 'CAMARA',
      phone: '+224622345678',
      role: 'USER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ User créé:', user2.email);

  // User 3
  const user3 = await prisma.user.upsert({
    where: { email: 'ibrahima@ngcharge.gn' },
    update: {},
    create: {
      email: 'ibrahima@ngcharge.gn',
      password: hashedPassword,
      firstName: 'Ibrahima',
      lastName: 'KABA',
      phone: '+224623456789',
      role: 'USER',
      status: 'ACTIVE',
    },
  });
  console.log('✅ User créé:', user3.email);

  console.log('');
  console.log('📝 Credentials (tous les comptes):');
  console.log('   Email: abou.dabo@ngcharge.gn | Password: password123');
  console.log('   Email: operator@ngcharge.gn | Password: password123');
  console.log('   Email: user@ngcharge.gn | Password: password123');
  console.log('   Email: aminata@ngcharge.gn | Password: password123');
  console.log('   Email: ibrahima@ngcharge.gn | Password: password123');
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