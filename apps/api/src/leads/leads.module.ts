import { Module } from '@nestjs/common';

import { TenancyModule } from '../tenancy/tenancy.module';
import { LeadsController } from './leads.controller';
import { LeadsService } from './leads.service';

@Module({
  imports: [TenancyModule],
  controllers: [LeadsController],
  providers: [LeadsService]
})
export class LeadsModule {}
