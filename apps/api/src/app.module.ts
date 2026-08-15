import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { parseEnvironment } from '@syarat/config';

import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { LeadsModule } from './leads/leads.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: parseEnvironment
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 60
      }
    ]),
    DatabaseModule,
    AuthModule,
    AdminModule,
    CatalogModule,
    DashboardModule,
    MarketplaceModule,
    LeadsModule,
    OnboardingModule,
    TenancyModule,
    VehiclesModule,
    HealthModule
  ],
  providers: [
    {
      provide: 'ENVIRONMENT',
      useFactory: () => parseEnvironment()
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard
    }
  ]
})
export class AppModule {}
