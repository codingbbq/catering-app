import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { TenancyModule } from './tenancy/tenancy.module.js';

@Module({
  imports: [TenancyModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
