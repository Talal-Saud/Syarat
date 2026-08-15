import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { parseEnvironment } from '@syarat/config';

import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { ImportsModule } from './imports/imports.module';
import { InventoryModule } from './inventory/inventory.module';
import { StorageModule } from './storage/storage.module';
import { TenancyModule } from './tenancy/tenancy.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: parseEnvironment }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    DatabaseModule,
    AuthModule,
    CatalogModule,
    TenancyModule,
    VehiclesModule,
    InventoryModule,
    ImportsModule,
    StorageModule,
    HealthModule
  ],
  providers: [
    { provide: 'ENVIRONMENT', useFactory: () => parseEnvironment() },
    { provide: APP_GUARD, useClass: ThrottlerGuard }
  ]
})
export class AppModule {}
