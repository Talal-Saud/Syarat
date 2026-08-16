import { Module } from '@nestjs/common';

import { LeadsService } from './leads.service';
import { PublicQuoteRequestController, TenantLeadsController } from './leads.controller';

@Module({ controllers: [TenantLeadsController, PublicQuoteRequestController], providers: [LeadsService], exports: [LeadsService] })
export class LeadsModule {}
