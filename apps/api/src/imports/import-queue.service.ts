import { ForbiddenException, Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, Queue, Worker } from 'bullmq';
import IORedis from 'ioredis';

import { StorageService } from '../storage/storage.service';
import { TenantContextService } from '../tenancy/tenant-context.service';
import { VehiclesService } from '../vehicles/vehicles.service';
import type { ValidatedImportRow } from './dto/import.dto';
import { ImportValidatorService } from './import-validator.service';
import { ImportsService, type ImportWorkerJob } from './imports.service';

const vehicleImportQueueName = 'vehicle-imports';
const maxAttempts = 3;

type VehicleImportQueueData = {
  importId: string;
  tenantId: string;
};

@Injectable()
export class ImportQueueService implements OnModuleInit, OnModuleDestroy {
  private readonly producerConnection: IORedis;
  private readonly workerConnection: IORedis;
  private readonly queue: Queue<VehicleImportQueueData>;
  private worker: Worker<VehicleImportQueueData> | undefined;

  constructor(
    config: ConfigService,
    private readonly imports: ImportsService,
    private readonly validator: ImportValidatorService,
    private readonly storage: StorageService,
    private readonly tenantContexts: TenantContextService,
    private readonly vehicles: VehiclesService
  ) {
    const redisUrl = config.getOrThrow<string>('REDIS_URL');
    this.producerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.workerConnection = new IORedis(redisUrl, { maxRetriesPerRequest: null });
    this.queue = new Queue<VehicleImportQueueData>(vehicleImportQueueName, {
      connection: this.producerConnection
    });
  }

  onModuleInit(): void {
    this.worker = new Worker<VehicleImportQueueData>(
      vehicleImportQueueName,
      async (job) => this.process(job),
      { connection: this.workerConnection, concurrency: 2 }
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([
      this.worker?.close(),
      this.queue.close(),
      this.producerConnection.quit(),
      this.workerConnection.quit()
    ]);
  }

  async enqueue(data: VehicleImportQueueData): Promise<void> {
    await this.queue.add('process-vehicle-import', data, {
      jobId: data.importId,
      attempts: maxAttempts,
      backoff: { type: 'exponential', delay: 1_000 },
      removeOnComplete: { age: 86_400, count: 1_000 },
      removeOnFail: { age: 604_800, count: 5_000 }
    });
  }

  private async process(job: Job<VehicleImportQueueData>): Promise<void> {
    const importJob = await this.imports.getForWorker(job.data.tenantId, job.data.importId);
    if (
      !importJob ||
      importJob.status !== 'QUEUED'
    ) {
      return;
    }
    if (!(await this.imports.markProcessing(importJob))) return;

    try {
      const context = await this.tenantContexts.resolve({
        userId: importJob.membershipUserId,
        membershipId: importJob.membershipId,
        correlationId: `import-${importJob.id}`
      });
      if (context.tenantId !== importJob.tenantId || !context.permissions.has('vehicles.manage')) {
        throw new ForbiddenException({
          code: 'IMPORT_MEMBERSHIP_INVALID',
          message: 'لا تملك العضوية المسجلة صلاحية معالجة استيراد المركبات.'
        });
      }

      const bytes = await this.storage.getBuffer(importJob.storageKey);
      const preview = await this.validator.validateFile(
        bytes,
        importJob.originalFilename,
        this.mimeFromFilename(importJob.originalFilename)
      );
      const rows = preview.rows.map((row) => ({
        ...row,
        errors: [...row.errors]
      }));
      let importedRows = 0;

      for (const row of rows) {
        if (!row.data) continue;
        try {
          await this.vehicles.create(context, row.data);
          importedRows += 1;
        } catch {
          row.errors.push({
            message: 'تعذر إنشاء المركبة لهذا الصف. تحقق من الفرع والكتالوج ورقم المخزون.'
          });
          delete row.data;
        }
      }

      const invalidRows = rows.filter((row) => row.errors.length > 0).length;
      const validRows = rows.length - invalidRows;
      const errorReportKey = await this.storeErrorReport(importJob, rows, invalidRows);
      await this.imports.complete(importJob, {
        totalRows: rows.length,
        validRows,
        invalidRows,
        importedRows,
        errorReportKey
      });
    } catch (error) {
      if (job.attemptsMade + 1 >= maxAttempts) {
        await this.imports.fail(importJob);
      } else {
        await this.imports.requeue(importJob);
      }
      throw error;
    }
  }

  private async storeErrorReport(
    job: ImportWorkerJob,
    rows: readonly ValidatedImportRow[],
    invalidRows: number
  ): Promise<string | null> {
    if (invalidRows === 0) return null;
    const key = `${this.storage.importPrefix(job.tenantId, job.id)}/error-report.xlsx`;
    await this.storage.put(
      key,
      await this.validator.buildErrorReport(rows),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    return key;
  }

  private mimeFromFilename(filename: string): string {
    return filename.toLowerCase().endsWith('.csv')
      ? 'text/csv'
      : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  }
}
