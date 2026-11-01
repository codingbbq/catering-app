import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

async function main() {
  console.log('Seeding database...');

  // --- Platform admin ---
  const platformAdmin = await prisma.platformUser.upsert({
    where: { email: 'admin@platform.test' },
    update: {},
    create: {
      email: 'admin@platform.test',
      passwordHash: await bcrypt.hash('Admin@12345678', SALT_ROUNDS),
      displayName: 'Platform Admin',
      role: 'super_admin',
    },
  });
  console.log(`Platform admin: ${platformAdmin.email} / Admin@12345678`);

  // --- Demo tenant ---
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'demo-catering' },
    update: {},
    create: {
      slug: 'demo-catering',
      displayName: 'Demo Catering Co',
      status: 'active',
    },
  });

  await prisma.tenantSettings.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      timezone: 'Asia/Kolkata',
      currencyCode: 'INR',
      locale: 'en-IN',
    },
  });
  console.log(`Tenant: ${tenant.displayName} (${tenant.slug})`);

  // --- Tenant owner ---
  const tenantOwner = await prisma.tenantUser.upsert({
    where: { email_tenantId: { email: 'owner@demo.test', tenantId: tenant.id } },
    update: {},
    create: {
      email: 'owner@demo.test',
      passwordHash: await bcrypt.hash('Owner@12345678', SALT_ROUNDS),
      displayName: 'Tenant Owner',
      role: 'owner',
      tenantId: tenant.id,
    },
  });
  console.log(`Tenant owner: ${tenantOwner.email} / Owner@12345678`);

  console.log('\nSeed complete. You can now sign in:');
  console.log('  Platform: POST /platform/auth/sign-in  { email: "admin@platform.test", password: "Admin@12345678" }');
  console.log(`  Tenant:   POST /auth/sign-in/${tenant.slug}  { email: "owner@demo.test", password: "Owner@12345678" }`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
