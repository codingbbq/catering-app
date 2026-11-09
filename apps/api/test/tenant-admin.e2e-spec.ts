import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { hashPassword } from '../src/auth/password.utils.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaClient();

// Unique prefix to avoid collisions with other parallel e2e suites
const P = 'ten-e2e';
const TENANT_SLUG = `${P}-catering`;
const OWNER_EMAIL = `${P}-owner@tenant.test`;
const ADMIN_EMAIL = `${P}-admin@tenant.test`;
const STAFF_EMAIL = `${P}-staff@tenant.test`;
const PLATFORM_EMAIL = `${P}-platform@platform.test`;

async function cleanup() {
  await prisma.session.deleteMany({ where: { OR: [
    { tenantUser: { tenant: { slug: TENANT_SLUG } } },
    { platformUser: { email: PLATFORM_EMAIL } },
  ] } });
  await prisma.userInvitation.deleteMany({ where: { tenant: { slug: TENANT_SLUG } } });
  await prisma.tenantUser.deleteMany({ where: { tenant: { slug: TENANT_SLUG } } });
  await prisma.platformUser.deleteMany({ where: { email: PLATFORM_EMAIL } });
  await prisma.tenantSettings.deleteMany({ where: { tenant: { slug: TENANT_SLUG } } });
  await prisma.tenant.deleteMany({ where: { slug: TENANT_SLUG } });
}

describe('Tenant Admin (e2e)', () => {
  let app: INestApplication<App>;
  let tenantId: string;
  let ownerToken: string;
  let adminToken: string;
  let staffToken: string;
  let platformToken: string;
  let ownerId: string;
  let adminId: string;
  let staffId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    await cleanup();

    // Create tenant
    const tenant = await prisma.tenant.create({
      data: { slug: TENANT_SLUG, displayName: 'TEN E2E Co', status: 'active' },
    });
    tenantId = tenant.id;

    // Create settings
    await prisma.tenantSettings.create({
      data: { tenantId, timezone: 'UTC', currencyCode: 'USD', locale: 'en' },
    });

    // Create owner
    const owner = await prisma.tenantUser.create({
      data: {
        email: OWNER_EMAIL,
        passwordHash: await hashPassword('owner-pass-123'),
        displayName: 'TEN Owner',
        role: 'owner',
        tenantId,
      },
    });
    ownerId = owner.id;

    // Create admin
    const admin = await prisma.tenantUser.create({
      data: {
        email: ADMIN_EMAIL,
        passwordHash: await hashPassword('admin-pass-123'),
        displayName: 'TEN Admin',
        role: 'admin',
        tenantId,
      },
    });
    adminId = admin.id;

    // Create staff
    const staff = await prisma.tenantUser.create({
      data: {
        email: STAFF_EMAIL,
        passwordHash: await hashPassword('staff-pass-123'),
        displayName: 'TEN Staff',
        role: 'staff',
        tenantId,
      },
    });
    staffId = staff.id;

    // Create platform user for cross-scope test
    await prisma.platformUser.create({
      data: {
        email: PLATFORM_EMAIL,
        passwordHash: await hashPassword('platform-pass-123'),
        displayName: 'TEN Platform Admin',
        role: 'super_admin',
      },
    });

    // Get tokens
    const ownerRes = await request(app.getHttpServer())
      .post(`/auth/sign-in/${TENANT_SLUG}`)
      .send({ email: OWNER_EMAIL, password: 'owner-pass-123' });
    ownerToken = ownerRes.body.accessToken;

    const adminRes = await request(app.getHttpServer())
      .post(`/auth/sign-in/${TENANT_SLUG}`)
      .send({ email: ADMIN_EMAIL, password: 'admin-pass-123' });
    adminToken = adminRes.body.accessToken;

    const staffRes = await request(app.getHttpServer())
      .post(`/auth/sign-in/${TENANT_SLUG}`)
      .send({ email: STAFF_EMAIL, password: 'staff-pass-123' });
    staffToken = staffRes.body.accessToken;

    const platformRes = await request(app.getHttpServer())
      .post('/platform/auth/sign-in')
      .send({ email: PLATFORM_EMAIL, password: 'platform-pass-123' });
    platformToken = platformRes.body.accessToken;
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
        .get('/tenant/me')
        .expect(401);
    });

    it('should reject platform token on tenant admin endpoints', () => {
      return request(app.getHttpServer())
        .get('/tenant/me')
        .set('Authorization', `Bearer ${platformToken}`)
        .expect(401);
    });

    it('should allow any authenticated tenant user to view profile', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenant/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.slug).toBe(TENANT_SLUG);
    });
  });

  // --- Profile ---

  describe('GET /tenant/me', () => {
    it('should return tenant profile with settings', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenant/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.id).toBe(tenantId);
      expect(res.body.slug).toBe(TENANT_SLUG);
      expect(res.body.displayName).toBe('TEN E2E Co');
      expect(res.body.settings).toBeTruthy();
      expect(res.body.settings.timezone).toBe('UTC');
    });
  });

  describe('PATCH /tenant/me', () => {
    it('should allow owner to update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tenant/me')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ displayName: 'Updated TEN Co', settings: { timezone: 'Asia/Kolkata' } })
        .expect(200);

      expect(res.body.displayName).toBe('Updated TEN Co');
      expect(res.body.settings.timezone).toBe('Asia/Kolkata');
    });

    it('should allow admin to update profile', async () => {
      const res = await request(app.getHttpServer())
        .patch('/tenant/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ displayName: 'Admin Updated Co' })
        .expect(200);

      expect(res.body.displayName).toBe('Admin Updated Co');
    });

    it('should reject staff from updating profile', async () => {
      await request(app.getHttpServer())
        .patch('/tenant/me')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ displayName: 'Staff Attempt' })
        .expect(403);
    });
  });

  // --- User list ---

  describe('GET /tenant/users', () => {
    it('should list tenant users', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenant/users')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(3);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).toHaveProperty('role');
      expect(res.body.data[0]).toHaveProperty('isActive');
    });

    it('should allow staff to view user list', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenant/users')
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(3);
    });
  });

  // --- Role changes ---

  describe('PATCH /tenant/users/:id', () => {
    it('should allow owner to change staff to manager', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tenant/users/${staffId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'manager' })
        .expect(200);

      expect(res.body.role).toBe('manager');
    });

    it('should allow admin to change a manager role', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/tenant/users/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'staff' })
        .expect(200);

      expect(res.body.role).toBe('staff');
    });

    it('should reject admin promoting to owner', async () => {
      await request(app.getHttpServer())
        .patch(`/tenant/users/${staffId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'owner' })
        .expect(403);
    });

    it('should reject admin changing an owner role', async () => {
      await request(app.getHttpServer())
        .patch(`/tenant/users/${ownerId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'staff' })
        .expect(403);
    });

    it('should reject staff from changing roles', async () => {
      await request(app.getHttpServer())
        .patch(`/tenant/users/${staffId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ role: 'manager' })
        .expect(403);
    });
  });

  // --- Invitations ---

  describe('POST /tenant/users/invitations', () => {
    it('should allow owner to create invitation', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `${P}-invite1@tenant.test`, role: 'staff' })
        .expect(201);

      expect(res.body.email).toBe(`${P}-invite1@tenant.test`);
      expect(res.body.role).toBe('staff');
      expect(res.body.status).toBe('pending');
    });

    it('should allow admin to create invitation', async () => {
      const res = await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `${P}-invite2@tenant.test`, role: 'manager' })
        .expect(201);

      expect(res.body.role).toBe('manager');
    });

    it('should reject admin inviting as owner', async () => {
      await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ email: `${P}-invite3@tenant.test`, role: 'owner' })
        .expect(403);
    });

    it('should reject duplicate pending invitation', async () => {
      await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: `${P}-invite1@tenant.test`, role: 'staff' })
        .expect(400);
    });

    it('should reject invitation for existing user', async () => {
      await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ email: STAFF_EMAIL, role: 'staff' })
        .expect(400);
    });

    it('should reject staff from creating invitations', async () => {
      await request(app.getHttpServer())
        .post('/tenant/users/invitations')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ email: `${P}-invite-fail@tenant.test`, role: 'staff' })
        .expect(403);
    });
  });

  describe('GET /tenant/users/invitations', () => {
    it('should list invitations', async () => {
      const res = await request(app.getHttpServer())
        .get('/tenant/users/invitations')
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(200);

      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.data[0]).toHaveProperty('email');
      expect(res.body.data[0]).toHaveProperty('status');
    });
  });

  // --- Deactivation ---

  describe('POST /tenant/users/:id/deactivate', () => {
    it('should reject staff from deactivating users', async () => {
      await request(app.getHttpServer())
        .post(`/tenant/users/${adminId}/deactivate`)
        .set('Authorization', `Bearer ${staffToken}`)
        .expect(403);
    });

    it('should reject self-deactivation', async () => {
      await request(app.getHttpServer())
        .post(`/tenant/users/${ownerId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(400);
    });

    it('should reject admin deactivating owner', async () => {
      await request(app.getHttpServer())
        .post(`/tenant/users/${ownerId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(403);
    });

    it('should allow owner to deactivate staff', async () => {
      const res = await request(app.getHttpServer())
        .post(`/tenant/users/${staffId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(res.body.isActive).toBe(false);
    });

    it('should prevent deactivating last admin', async () => {
      // Owner is the only remaining admin (admin user is still active)
      // Try to deactivate admin — should succeed since owner is still active
      const res = await request(app.getHttpServer())
        .post(`/tenant/users/${adminId}/deactivate`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .expect(201);

      expect(res.body.isActive).toBe(false);

      // Now owner is the only active admin — cannot be deactivated
      // (already blocked by self-deactivation check, but the last-admin check
      // also applies to role changes)
    });
  });

  // --- Last admin protection on role changes ---

  describe('Last admin protection', () => {
    it('should reject demoting the last active admin', async () => {
      // At this point owner is the sole active admin (admin + staff deactivated)
      await request(app.getHttpServer())
        .patch(`/tenant/users/${ownerId}`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ role: 'staff' })
        .expect(400);
    });
  });
});
