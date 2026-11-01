import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { hashPassword } from '../src/auth/password.utils.js';
import { generateInvitationToken } from '../src/auth/token.utils.js';
import { AppModule } from '../src/app.module.js';

const prisma = new PrismaClient();

describe('Auth (e2e)', () => {
  let app: INestApplication<App>;
  let tenantId: string;
  const tenantSlug = 'test-catering';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Clean up test data
    await prisma.session.deleteMany({});
    await prisma.userInvitation.deleteMany({});
    await prisma.tenantUser.deleteMany({});
    await prisma.platformUser.deleteMany({});
    await prisma.tenantSettings.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.tenant.deleteMany({});

    // Seed a tenant
    const tenant = await prisma.tenant.create({
      data: {
        slug: tenantSlug,
        displayName: 'Test Catering Co',
        status: 'active',
      },
    });
    tenantId = tenant.id;

    // Seed a platform user
    await prisma.platformUser.create({
      data: {
        email: 'admin@platform.test',
        passwordHash: await hashPassword('platform-pass-123'),
        displayName: 'Platform Admin',
        role: 'super_admin',
      },
    });

    // Seed a tenant user
    await prisma.tenantUser.create({
      data: {
        email: 'owner@test-catering.test',
        passwordHash: await hashPassword('tenant-pass-123'),
        displayName: 'Tenant Owner',
        role: 'owner',
        tenantId,
      },
    });
  });

  afterAll(async () => {
    await prisma.session.deleteMany({});
    await prisma.userInvitation.deleteMany({});
    await prisma.tenantUser.deleteMany({});
    await prisma.platformUser.deleteMany({});
    await prisma.tenantSettings.deleteMany({});
    await prisma.auditLog.deleteMany({});
    await prisma.tenant.deleteMany({});
    await prisma.$disconnect();
    await app.close();
  });

  // --- Platform sign-in ---

  describe('POST /platform/auth/sign-in', () => {
    it('should sign in a platform user', async () => {
      const res = await request(app.getHttpServer())
        .post('/platform/auth/sign-in')
        .send({ email: 'admin@platform.test', password: 'platform-pass-123' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('admin@platform.test');
      expect(res.body.user.role).toBe('super_admin');
    });

    it('should reject invalid credentials', async () => {
      await request(app.getHttpServer())
        .post('/platform/auth/sign-in')
        .send({ email: 'admin@platform.test', password: 'wrong-password' })
        .expect(401);
    });

    it('should reject non-existent user', async () => {
      await request(app.getHttpServer())
        .post('/platform/auth/sign-in')
        .send({ email: 'nobody@platform.test', password: 'some-password' })
        .expect(401);
    });
  });

  // --- Tenant sign-in ---

  describe('POST /auth/sign-in/:tenantSlug', () => {
    it('should sign in a tenant user', async () => {
      const res = await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('owner@test-catering.test');
      expect(res.body.user.role).toBe('owner');
      expect(res.body.user.tenantId).toBe(tenantId);
      expect(res.body.user.tenantSlug).toBe(tenantSlug);
    });

    it('should reject invalid tenant slug', async () => {
      await request(app.getHttpServer())
        .post('/auth/sign-in/nonexistent-tenant')
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(404);
    });

    it('should reject wrong password', async () => {
      await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'wrong-password' })
        .expect(401);
    });
  });

  // --- Token refresh ---

  describe('POST /auth/refresh', () => {
    it('should refresh tokens', async () => {
      const signIn = await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: signIn.body.refreshToken })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(signIn.body.refreshToken);
    });

    it('should reject invalid refresh token', async () => {
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: 'invalid-token' })
        .expect(401);
    });
  });

  // --- Sign-out ---

  describe('POST /auth/sign-out', () => {
    it('should sign out and invalidate refresh token', async () => {
      const signIn = await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/sign-out')
        .send({ refreshToken: signIn.body.refreshToken })
        .expect(201);

      // Refresh should now fail
      await request(app.getHttpServer())
        .post('/auth/refresh')
        .send({ refreshToken: signIn.body.refreshToken })
        .expect(401);
    });
  });

  // --- Protected endpoints ---

  describe('Protected endpoints', () => {
    it('should reject unauthenticated access to platform endpoints', async () => {
      await request(app.getHttpServer())
        .get('/platform/tenancy/context')
        .expect(401);
    });

    it('should allow authenticated platform access', async () => {
      const signIn = await request(app.getHttpServer())
        .post('/platform/auth/sign-in')
        .send({ email: 'admin@platform.test', password: 'platform-pass-123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/platform/tenancy/context')
        .set('Authorization', `Bearer ${signIn.body.accessToken}`)
        .expect(200);

      expect(res.body.routeScope).toBe('platform');
    });

    it('should reject unauthenticated access to tenant endpoints', async () => {
      await request(app.getHttpServer())
        .get('/tenant/tenancy/context')
        .expect(401);
    });

    it('should allow authenticated tenant access', async () => {
      const signIn = await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(201);

      const res = await request(app.getHttpServer())
        .get('/tenant/tenancy/context')
        .set('Authorization', `Bearer ${signIn.body.accessToken}`)
        .expect(200);

      expect(res.body.routeScope).toBe('tenant');
    });

    it('should reject platform token on tenant endpoint', async () => {
      const signIn = await request(app.getHttpServer())
        .post('/platform/auth/sign-in')
        .send({ email: 'admin@platform.test', password: 'platform-pass-123' })
        .expect(201);

      await request(app.getHttpServer())
        .get('/tenant/tenancy/context')
        .set('Authorization', `Bearer ${signIn.body.accessToken}`)
        .expect(401);
    });
  });

  // --- Invitation accept ---

  describe('POST /auth/invitations/accept', () => {
    it('should accept an invitation and return tokens', async () => {
      const token = generateInvitationToken();

      await prisma.userInvitation.create({
        data: {
          email: 'newuser@test-catering.test',
          token,
          tenantId,
          role: 'staff',
          invitedBy: 'owner@test-catering.test',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const res = await request(app.getHttpServer())
        .post('/auth/invitations/accept')
        .send({
          token,
          password: 'new-user-pass-123',
          displayName: 'New Staff User',
        })
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.user.email).toBe('newuser@test-catering.test');
      expect(res.body.user.role).toBe('staff');
    });

    it('should reject expired invitation', async () => {
      const token = generateInvitationToken();

      await prisma.userInvitation.create({
        data: {
          email: 'expired@test-catering.test',
          token,
          tenantId,
          role: 'staff',
          invitedBy: 'owner@test-catering.test',
          expiresAt: new Date(Date.now() - 1000), // already expired
        },
      });

      await request(app.getHttpServer())
        .post('/auth/invitations/accept')
        .send({
          token,
          password: 'some-password-123',
          displayName: 'Expired User',
        })
        .expect(403);
    });

    it('should reject invalid invitation token', async () => {
      await request(app.getHttpServer())
        .post('/auth/invitations/accept')
        .send({
          token: 'nonexistent-token',
          password: 'some-password-123',
          displayName: 'Nobody',
        })
        .expect(404);
    });
  });

  // --- Password forgot/reset ---

  describe('Password reset flow', () => {
    it('should always return success message for forgot password', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/password/forgot')
        .send({ email: 'owner@test-catering.test', tenantSlug })
        .expect(201);

      expect(res.body.message).toBeDefined();
    });

    it('should reset password with valid token', async () => {
      // Trigger forgot password to generate a token
      await request(app.getHttpServer())
        .post('/auth/password/forgot')
        .send({ email: 'owner@test-catering.test', tenantSlug });

      // Fetch the reset token from the database
      const user = await prisma.tenantUser.findFirst({
        where: { email: 'owner@test-catering.test', tenant: { slug: tenantSlug } },
      });

      expect(user?.resetToken).toBeDefined();

      const res = await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({ token: user!.resetToken!, password: 'new-tenant-pass-456' })
        .expect(201);

      expect(res.body.message).toBeDefined();

      // Should be able to sign in with new password
      await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'new-tenant-pass-456' })
        .expect(201);

      // Old password should fail
      await request(app.getHttpServer())
        .post(`/auth/sign-in/${tenantSlug}`)
        .send({ email: 'owner@test-catering.test', password: 'tenant-pass-123' })
        .expect(401);
    });

    it('should reject invalid reset token', async () => {
      await request(app.getHttpServer())
        .post('/auth/password/reset')
        .send({ token: 'fake-token', password: 'whatever-pass-123' })
        .expect(403);
    });
  });
});
