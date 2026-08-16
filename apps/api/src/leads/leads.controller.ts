import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AccessTokenGuard } from '../auth/access-token.guard';
import { CurrentPrincipal } from '../auth/current-principal.decorator';
import { type AccessTokenPayload } from '../auth/auth.types';
import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { type TenantContext } from '../tenancy/tenant-context';
import { AssignLeadDto, QuoteRequestDto, UpdateLeadDto } from './dto/lead.dto';
import { LeadsService } from './leads.service';

@ApiTags('tenant-leads')
@Controller('tenant/leads')
@UseGuards(AccessTokenGuard, TenantContextGuard, PermissionGuard)
export class TenantLeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @RequirePermission('leads.read')
  list(@CurrentTenantContext() context: TenantContext): Promise<unknown> { return this.leadsService.list(context); }

  @Get(':id')
  @RequirePermission('leads.read')
  get(@Param('id') id: string, @CurrentTenantContext() context: TenantContext): Promise<unknown> { return this.leadsService.get(id, context); }

  @Patch(':id')
  @RequirePermission('leads.manage')
  update(@Param('id') id: string, @Body() dto: UpdateLeadDto, @CurrentTenantContext() context: TenantContext): Promise<unknown> { return this.leadsService.update(id, dto, context); }

  @Post(':id/assign')
  @RequirePermission('leads.manage')
  assign(@Param('id') id: string, @Body() dto: AssignLeadDto, @CurrentTenantContext() context: TenantContext): Promise<unknown> { return this.leadsService.assign(id, dto, context); }
}

@ApiTags('public-quote-request')
@Controller('public/vehicles')
@UseGuards(AccessTokenGuard)
export class PublicQuoteRequestController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post(':id/quote-request')
  create(@Param('id') publicId: string, @Body() dto: QuoteRequestDto, @CurrentPrincipal() principal: AccessTokenPayload): Promise<unknown> {
    if (principal.kind !== 'customer') throw new ForbiddenException({ code: 'CUSTOMER_SESSION_REQUIRED', message: 'يجب التحقق من رقم الجوال قبل طلب العرض.' });
    return this.leadsService.createQuoteRequest(publicId, dto, principal.sub);
  }
}
