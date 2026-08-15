import {
  BadRequestException,
  Controller,
  Get,
  Header,
  HttpCode,
  Param,
  Post,
  Req,
  ServiceUnavailableException,
  UseGuards
} from '@nestjs/common';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';

import { CurrentTenantContext } from '../tenancy/current-tenant-context.decorator';
import { PermissionGuard } from '../tenancy/permission.guard';
import { RequirePermission } from '../tenancy/require-permission.decorator';
import type { TenantContext } from '../tenancy/tenant-context';
import { TenantContextGuard } from '../tenancy/tenant-context.guard';
import { type ImportPreview } from './dto/import.dto';
import { ImportQueueService } from './import-queue.service';
import { ImportValidatorService } from './import-validator.service';
import { ImportsService, type TenantImportJob } from './imports.service';

@ApiTags('tenant-imports')
@UseGuards(TenantContextGuard, PermissionGuard)
@Controller('tenant/imports')
export class ImportsController {
  constructor(
    private readonly imports: ImportsService,
    private readonly queue: ImportQueueService,
    private readonly validator: ImportValidatorService
  ) {}

  @Get('template')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="syarat-vehicle-import-template.xlsx"')
  @RequirePermission('vehicles.manage')
  template(): Promise<Buffer> {
    return this.validator.buildTemplate();
  }

  @Post('upload')
  @ApiConsumes('multipart/form-data')
  @RequirePermission('vehicles.manage')
  async upload(
    @CurrentTenantContext() context: TenantContext,
    @Req() request: FastifyRequest
  ): Promise<TenantImportJob> {
    const file = await request.file();
    if (!file) {
      throw new BadRequestException({
        code: 'IMPORT_FILE_REQUIRED',
        message: 'يرجى إرفاق ملف استيراد واحد.'
      });
    }

    const bytes = await file.toBuffer();
    if (file.file.truncated) {
      throw new BadRequestException({
        code: 'IMPORT_UPLOAD_TRUNCATED',
        message: 'تجاوز ملف الاستيراد الحد المسموح للرفع.'
      });
    }

    return this.imports.upload(context, {
      bytes,
      originalFilename: file.filename,
      mimeType: file.mimetype
    });
  }

  @Post(':id/validate')
  @RequirePermission('vehicles.manage')
  validate(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') id: string
  ): Promise<ImportPreview> {
    return this.imports.validate(context, id);
  }

  @Post(':id/queue')
  @HttpCode(202)
  @RequirePermission('vehicles.manage')
  async queueImport(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') id: string
  ): Promise<TenantImportJob> {
    const importJob = await this.imports.queue(context, id);
    try {
      await this.queue.enqueue({
        importId: importJob.id,
        tenantId: context.tenantId
      });
    } catch {
      await this.imports.restorePreview(context, id);
      throw new ServiceUnavailableException({
        code: 'IMPORT_QUEUE_UNAVAILABLE',
        message: 'تعذر إرسال ملف الاستيراد للمعالجة. حاول مرة أخرى.'
      });
    }
    return importJob;
  }

  @Get(':id')
  @RequirePermission('vehicles.read')
  get(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') id: string
  ): Promise<TenantImportJob> {
    return this.imports.get(context, id);
  }

  @Get(':id/error-report')
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  @Header('Content-Disposition', 'attachment; filename="syarat-vehicle-import-errors.xlsx"')
  @RequirePermission('vehicles.manage')
  errorReport(
    @CurrentTenantContext() context: TenantContext,
    @Param('id') id: string
  ): Promise<Buffer> {
    return this.imports.getErrorReport(context, id);
  }
}
