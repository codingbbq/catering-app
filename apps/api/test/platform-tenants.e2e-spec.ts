import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { hashPassword } from '../src/auth/password.utils.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaClient();

// Unique prefix to avoid collisions with other parallel e2e suites
const P = 'plt-e2e';
const PLATFORM_EMAIL = `${P}-admin@platform.test`;
const EXISTING_SLUG = `${P}-existing`;
const TENANT_EMAIL = `${P}-user@tenant.test`;

// All slugs created by this suite start with P
async function cleanup() {
  await prisma.session.deleteMany({ where: { OR: [
    { platformUser: { email: PLATFORM_EMAIL } },
    { tenantUser: { tenant: { slug: { startsWith: P } } } },
  ] } });
  await prisma.userInvitation.deleteMany({ where: { tenant: { slug: { startsWith: P } } } });
  await prisma.tenantUser.deleteMany({ where: { tenant: { slug: { startsWith: P } } } });
  await prisma.platformUser.deleteMany({ where: { email: PLATFORM_EMAIL } });
  await prisma.tenantSettings.deleteMany({ where: { tenant: { slug: { startsWith: P } } } });
  await prisma.tenant.deleteMany({ where: { slug: { startsWith: P } } });
}

describe('Platform Tenants (e2e)', () => {
  let app: INestApplication<App>;
  let platformToken: string;
  let tenantToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await cleanup();

    // Seed platform admin
    await prisma.platformUser.create({
      data: {
        email: PLATFORM_EMAIL,
        passwordHash: await hashPassword('platform-pass-123'),
        displayName: 'PLT E2E Admin',
        role: 'super_admin',
      },
    });

    // Seed a tenant + tenant user for cross-scope testing
    const existingTenant = await prisma.tenant.create({
      data: {
        slug: EXISTING_SLUG,
        displayName: 'PLT E2E Existing Tenant',
        status: 'active',
      },
    });

    await prisma.tenantUser.create({
      data: {
        email: TENANT_EMAIL,
        passwordHash: await hashPassword('tenant-pass-123'),
        displayName: 'PLT E2E Tenant User',
        role: 'owner',
        tenantId: existingTenant.id,
      },
    });

    // Get platform token
    const platformRes = await request(app.getHttpServer())
      .post('/platform/auth/sign-in')
      .send({ email: PLATFORM_EMAIL, password: 'platform-pass-123' });
    platformToken = platformRes.body.accessToken;

    // Get tenant token
    const tenantRes = await request(app.getHttpServer())
      .post(`/auth/sign-in/${EXISTING_SLUG}`)
      .send({ email: TENANT_EMAIL, password: 'tenant-pass-123' });
    tenantToken = tenantRes.body.accessToken;
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await app.close();
  });

  // --- Authorization ---

  describe('Authorization', () => {
    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/platform/tenants')
        .expect(401);
    });

    it('should reject tenant token on platform endpoints', () => {
      return request(app.getHttpServer())
        .get('/platform/tenants')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(401);
    });
  });

  // --- Tenant CRUD ---

  describe('Tenant CRUD', () => {
    let createdTenantId: string;

    it('should list tenants', async () => {
      const res = await request(app.getHttpServer())
        .get('/platform/tenants')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(1);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('slug');
      expect(res.body.data[0]).toHaveProperty('userCount');
    });

    it('should create a tenant', async () => {
      const res = await request(app.getHttpServer())
        .post('/platform/tenants')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          slug: `${P}-new-co`,
          displayName: 'New Catering Co',
          settings: { timezone: 'America/New_York', currencyCode: 'USD' },
        })
        .expect(201);

      expect(res.body.slug).toBe(`${P}-new-co`);
      expect(res.body.displayName).toBe('New Catering Co');
      expect(res.body.status).toBe('onboarding');
      expect(res.body.settings?.timezone).toBe('America/New_York');
      expect(res.body.userCount).toBe(0);
      createdTenantId = res.body.id;
    });

    it('should reject duplicate tenant slug', async () => {
      await request(app.getHttpServer())
        .post('/platform/tenants')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          slug: `${P}-new-co`,
          displayName: 'Duplicate',
        })
        .expect(409);
    });

    it('should get tenant detail', async () => {
      const res = await request(app.getHttpServer())
        .get(`/platform/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(200);

      expect(res.body.id).toBe(createdTenantId);
      expect(res.body.slug).toBe(`${P}-new-co`);
      expect(res.body.settings).toBeTruthy();
      expect(res.body.userCount).toBe(0);
    });

    it('should return 404 for non-existent tenant', () => {
      return request(app.getHttpServer())
        .get('/platform/tenants/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(404);
    });

    it('should update a tenant', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/platform/tenants/${createdTenantId}`)
        .set('Authorization', `Bearer ${platformToken}`)
        .send({
          displayName: 'Updated Catering Co',
          settings: { timezone: 'Europe/London' },
        })
        .expect(200);

      expect(res.body.displayName).toBe('Updated Catering Co');
      expect(res.body.settings?.timezone).toBe('Europe/London');
    });

    // --- Lifecycle transitions ---

    it('should activate an onboarding tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/activate`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      expect(res.body.status).toBe('active');
    });

    it('should reject activating an already active tenant', () => {
      return request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/activate`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(400);
    });

    it('should suspend an active tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/suspend`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      expect(res.body.status).toBe('suspended');
    });

    it('should reactivate a suspended tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/activate`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      expect(res.body.status).toBe('active');
    });

    it('should archive an active tenant', async () => {
      const res = await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/archive`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      expect(res.body.status).toBe('archived');
    });

    it('should reject any transition from archived', async () => {
      await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/activate`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(400);

      await request(app.getHttpServer())
        .post(`/platform/tenants/${createdTenantId}/suspend`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(400);
    });
  });

  // --- Suspended tenant sign-in enforcement ---

  describe('Suspended tenant enforcement', () => {
    it('should prevent tenant sign-in after suspension', async () => {
      // Create and activate a tenant
      const createRes = await request(app.getHttpServer())
        .post('/platform/tenants')
        .set('Authorization', `Bearer ${platformToken}`)
        .send({ slug: `${P}-suspend`, displayName: 'Suspend Test' })
        .expect(201);
      const suspendTenantId = createRes.body.id;

      // Activate
      await request(app.getHttpServer())
        .post(`/platform/tenants/${suspendTenantId}/activate`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      // Create a user for the tenant
      await prisma.tenantUser.create({
        data: {
          email: `${P}-user@suspend.test`,
          passwordHash: await hashPassword('test-pass-123'),
          displayName: 'Test User',
          role: 'staff',
          tenantId: suspendTenantId,
        },
      });

      // Verify user can sign in
      await request(app.getHttpServer())
        .post(`/auth/sign-in/${P}-suspend`)
        .send({ email: `${P}-user@suspend.test`, password: 'test-pass-123' })
        .expect(201);

      // Suspend the tenant
      await request(app.getHttpServer())
        .post(`/platform/tenants/${suspendTenantId}/suspend`)
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(201);

      // Verify sign-in is now blocked
      await request(app.getHttpServer())
        .post(`/auth/sign-in/${P}-suspend`)
        .send({ email: `${P}-user@suspend.test`, password: 'test-pass-123' })
        .expect(403);
    });
  });
});
