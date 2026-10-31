import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should expose the tenant isolation foundation status', () => {
      expect(appController.getFoundationStatus()).toEqual({
        feature: 'FND-001',
        name: 'Tenant Isolation Foundation',
        routeScopes: {
          platform: '/platform/tenancy/*',
          tenant: '/tenant/tenancy/*',
        },
        status: 'ready',
      });
    });
  });
});
