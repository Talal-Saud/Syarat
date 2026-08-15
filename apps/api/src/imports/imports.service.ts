import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  PayloadTooLargeException
} from '@nestjs/common';
import { ImportJobStatus, type Prisma } from '@syarat/database';
import { randomUUID } from 'node:crypto';
import { basename, extname } from 'node:path';

import { PrismaService } from '../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import type { TenantContext } from '../tenancy/tenant-context';
import { type ImportPreview } from './dto/import.dto';
import { ImportValidatorService } from './import-validator.service';

const jobSelect = {
  id: true,
  status: true,
  originalFilename: true,
  totalRows: true,
  validRows: true,
  invalidRows: true,
  importedRows: true,
  errorReportKey: true,
  createdAt: true,
  updatedAt: true
} satisfies Prisma.ImportJobSelect;

export type TenantImportJob = Prisma.ImportJobGetPayload<{ select: typeof jobSelect }>;

export type ImportWorkerJob = {
  id: string;
  tenantId: string;
  membershipId: string;
  storageKey: string;
  originalFilename: string;
  status: ImportJobStatus;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  importedRows: number;
  membershipUserId: string;
};

@Injectable()
export class ImportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly validator: ImportValidatorService
  ) {}

  async upload(
    context: TenantContext,
    input: { bytes: Buffer; originalFilename: string; mimeType: string }
  ): Promise<TenantImportJob> {
    this.assertUploadBoundary(input);
    const id = randomUUID();
    const extension = extname(input.originalFilename).toLowerCase();
    const storageKey = `${this.storage.importPrefix(context.tenantId, id)}/source${extension}`;
    const originalFilename = basename(input.originalFilename).slice(0, 255) || `vehicles${extension}`;

    await this.prisma.importJob.create({
      data: {
        id,
        tenantId: context.tenantId,
        membershipId: context.membershipId,
        storageKey,
        originalFilename,
        status: ImportJobStatus.UPLOADED
      },
      select: { id: true }
    });

    try {
      await this.storage.put(storageKey, input.bytes, input.mimeType);
    } catch (error) {
      await this.prisma.importJob.deleteMany({
        where: { id, tenantId: context.tenantId }
      });
      throw error;
    }

    return this.get(context, id);
  }

  async validate(context: TenantContext, id: string): Promise<ImportPreview> {
    const job = await this.findJob(context, id);
    if (
      job.status === ImportJobStatus.QUEUED ||
      job.status === ImportJobStatus.PROCESSING ||
      job.status === ImportJobStatus.COMPLETED ||
      job.status === ImportJobStatus.COMPLETED_WITH_ERRORS
    ) {
      throw new ConflictException({
        code: 'IMPORT_VALIDATION_LOCKED',
        message: 'لا يمكن إعادة التحقق بعد بدء معالجة ملف الاستيراد.'
      });
    }

    await this.prisma.importJob.update({
      where: { id: job.id },
      data: { status: ImportJobStatus.VALIDATING }
    });

    try {
      const bytes = await this.storage.getBuffer(job.storageKey);
      const preview = await this.validator.validateFile(
        bytes,
        job.originalFilename,
        this.mimeFromFilename(job.originalFilename)
      );
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: {
          status: ImportJobStatus.PREVIEW_READY,
          totalRows: preview.totalRows,
          validRows: preview.validRows,
          invalidRows: preview.invalidRows,
          importedRows: 0,
          errorReportKey: null
        }
      });
      return preview;
    } catch (error) {
      await this.prisma.importJob.update({
        where: { id: job.id },
        data: { status: ImportJobStatus.FAILED }
      });
      throw error;
    }
  }

  async queue(context: TenantContext, id: string): Promise<TenantImportJob> {
    const updated = await this.prisma.importJob.updateMany({
      where: {
        id,
        tenantId: context.tenantId,
        status: ImportJobStatus.PREVIEW_READY
      },
      data: { status: ImportJobStatus.QUEUED }
    });
    if (updated.count !== 1) {
      const job = await this.findJob(context, id);
      if (job.status !== ImportJobStatus.PREVIEW_READY) {
        throw new ConflictException({
          code: 'IMPORT_NOT_READY',
          message: 'يجب التحقق من ملف الاستيراد قبل وضعه في المعالجة.'
        });
      }
      throw new NotFoundException({
        code: 'IMPORT_JOB_NOT_FOUND',
        message: 'مهمة الاستيراد غير موجودة ضمن المعرض الحالي.'
      });
    }
    return this.get(context, id);
  }

  async restorePreview(context: TenantContext, id: string): Promise<void> {
    await this.prisma.importJob.updateMany({
      where: {
        id,
        tenantId: context.tenantId,
        status: ImportJobStatus.QUEUED
      },
      data: { status: ImportJobStatus.PREVIEW_READY }
    });
  }

  async get(context: TenantContext, id: string): Promise<TenantImportJob> {
    const job = await this.prisma.importJob.findFirst({
      where: { id, tenantId: context.tenantId },
      select: jobSelect
    });
    if (!job) {
      throw new NotFoundException({
        code: 'IMPORT_JOB_NOT_FOUND',
        message: 'مهمة الاستيراد غير موجودة ضمن المعرض الحالي.'
      });
    }
    return job;
  }

  async getErrorReport(context: TenantContext, id: string): Promise<Buffer> {
    const job = await this.get(context, id);
    if (!job.errorReportKey) {
      throw new NotFoundException({
        code: 'IMPORT_ERROR_REPORT_NOT_FOUND',
        message: 'لا يوجد تقرير أخطاء متاح لهذه المهمة.'
      });
    }
    return this.storage.getBuffer(job.errorReportKey);
  }

  async getForWorker(tenantId: string, id: string): Promise<ImportWorkerJob | null> {
    return this.prisma.importJob.findFirst({
      where: { id, tenantId },
      select: {
        id: true,
        tenantId: true,
        membershipId: true,
        storageKey: true,
        originalFilename: true,
        status: true,
        totalRows: true,
        validRows: true,
        invalidRows: true,
        importedRows: true,
        membership: { select: { userId: true } }
      }
    }).then((job) =>
      job
        ? {
            id: job.id,
            tenantId: job.tenantId,
            membershipId: job.membershipId,
            storageKey: job.storageKey,
            originalFilename: job.originalFilename,
            status: job.status,
            totalRows: job.totalRows,
            validRows: job.validRows,
            invalidRows: job.invalidRows,
            importedRows: job.importedRows,
            membershipUserId: job.membership.userId
          }
        : null
    );
  }

  async markProcessing(job: ImportWorkerJob): Promise<boolean> {
    const updated = await this.prisma.importJob.updateMany({
      where: {
        id: job.id,
        tenantId: job.tenantId,
        membershipId: job.membershipId,
        status: ImportJobStatus.QUEUED
      },
      data: { status: ImportJobStatus.PROCESSING }
    });
    return updated.count === 1;
  }

  async complete(
    job: ImportWorkerJob,
    result: {
      totalRows: number;
      validRows: number;
      invalidRows: number;
      importedRows: number;
      errorReportKey: string | null;
    }
  ): Promise<void> {
    await this.prisma.importJob.updateMany({
      where: { id: job.id, tenantId: job.tenantId, status: ImportJobStatus.PROCESSING },
      data: {
        totalRows: result.totalRows,
        validRows: result.validRows,
        invalidRows: result.invalidRows,
        importedRows: result.importedRows,
        errorReportKey: result.errorReportKey,
        status:
          result.invalidRows > 0
            ? ImportJobStatus.COMPLETED_WITH_ERRORS
            : ImportJobStatus.COMPLETED
      }
    });
  }

  async requeue(job: ImportWorkerJob): Promise<void> {
    await this.prisma.importJob.updateMany({
      where: { id: job.id, tenantId: job.tenantId, status: ImportJobStatus.PROCESSING },
      data: { status: ImportJobStatus.QUEUED }
    });
  }

  async fail(job: ImportWorkerJob): Promise<void> {
    await this.prisma.importJob.updateMany({
      where: { id: job.id, tenantId: job.tenantId, status: ImportJobStatus.PROCESSING },
      data: { status: ImportJobStatus.FAILED }
    });
  }

  private async findJob(context: TenantContext, id: string): Promise<{
    id: string;
    storageKey: string;
    originalFilename: string;
    status: ImportJobStatus;
  }> {
    const job = await this.prisma.importJob.findFirst({
      where: { id, tenantId: context.tenantId },
      select: {
        id: true,
        storageKey: true,
        originalFilename: true,
        status: true
      }
    });
    if (!job) {
      throw new NotFoundException({
        code: 'IMPORT_JOB_NOT_FOUND',
        message: 'مهمة الاستيراد غير موجودة ضمن المعرض الحالي.'
      });
    }
    return job;
  }

  private assertUploadBoundary(input: {
    bytes: Buffer;
    originalFilename: string;
    mimeType: string;
  }): void {
    if (input.bytes.byteLength === 0 || input.bytes.byteLength > ImportValidatorService.maxBytes) {
      throw new PayloadTooLargeException({
        code: 'IMPORT_SIZE_INVALID',
        message: 'حجم ملف الاستيراد غير مسموح.'
      });
    }
    const extension = extname(input.originalFilename).toLowerCase();
    const mimeType = input.mimeType.toLowerCase();
    const valid =
      (extension === '.csv' && ['text/csv', 'application/csv', 'text/plain'].includes(mimeType)) ||
      (extension === '.xlsx' &&
        mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    if (!valid) {
      throw new BadRequestException({
        code: 'IMPORT_TYPE_INVALID',
        message: 'يُسمح فقط بملفات CSV أو XLSX المطابقة لنوع MIME والامتداد.'
      });
    }
  }

  private mimeFromFilename(filename: string): string {
    return extname(filename).toLowerCase() === '.csv'
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
}
