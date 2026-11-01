import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/ (GET) returns foundation status without auth', () => {
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

  it('/platform/tenancy/context (GET) rejects unauthenticated access', () => {
    return request(app.getHttpServer())
      .get('/platform/tenancy/context')
      .expect(401);
  });

  it('/tenant/tenancy/context (GET) rejects unauthenticated access', () => {
    return request(app.getHttpServer())
      .get('/tenant/tenancy/context')
      .expect(401);
  });
});
