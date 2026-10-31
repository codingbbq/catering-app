import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect({
        feature: 'FND-001',
        name: 'Tenant Isolation Foundation',
        routeScopes: {
          platform: '/platform/tenancy/*',
          tenant: '/tenant/tenancy/*',
        },
        status: 'ready',
      });
  });

  it('/platform/tenancy/context (GET)', async () => {
    const response = await request(app.getHttpServer()).get('/platform/tenancy/context').expect(200);

    expect(response.headers['x-access-scope']).toBe('platform');
    expect(response.body).toEqual({
      requestContext: {
        scope: 'platform',
      },
      routeScope: 'platform',
      guardrail: 'Platform routes are separated from tenant routes.',
    });
  });

  it('/tenant/tenancy/context (GET) rejects missing tenant headers', () => {
    return request(app.getHttpServer()).get('/tenant/tenancy/context').expect(403);
  });

  it('/tenant/tenancy/context (GET) resolves tenant headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant/tenancy/context')
      .set('x-tenant-id', '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f')
      .set('x-tenant-slug', 'demo-catering')
      .expect(200);

    expect(response.headers['x-access-scope']).toBe('tenant');
    expect(response.headers['x-tenant-id']).toBe('3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f');
    expect(response.body).toEqual({
      requestContext: {
        scope: 'tenant',
        tenantId: '3c8edb98-5ec1-4207-9c1d-f2d5d8803d2f',
        tenantSlug: 'demo-catering',
        tenantStatus: 'active',
      },
      routeScope: 'tenant',
      guardrail: 'Tenant routes require an active tenant context.',
    });
  });

  it('/tenant/tenancy/ownership/:tenantId (GET) rejects cross-tenant access', () => {
    return request(app.getHttpServer())
      .get('/tenant/tenancy/ownership/11111111-1111-1111-1111-111111111111')
      .set('x-tenant-id', '22222222-2222-4222-8222-222222222222')
      .expect(403);
  });

  afterEach(async () => {
    await app.close();
  });
});
