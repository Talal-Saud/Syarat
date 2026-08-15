import { describe, expect, it, vi } from 'vitest';

import { ImportQueueService } from './import-queue.service';
import { ImportValidatorService } from './import-validator.service';
import { ImportsService } from './imports.service';

const context = {
  kind: 'tenant' as const,
  tenantId: '11111111-1111-4111-8111-111111111111',
  userId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  membershipId: '22222222-2222-4222-8222-222222222222',
  role: 'OWNER' as const,
  branchScope: { kind: 'all' as const },
  permissions: new Set(['vehicles.read', 'vehicles.manage'] as const),
  correlationId: 'import-test-correlation'
};

const headers = [
  'branchId',
  'stockNumber',
  'brandId',
  'modelId',
  'year',
  'condition',
  'price',
  'mileage',
  'transmission',
  'fuelType',
  'bodyType',
  'description'
].join(',');

const validRow = [
  '33333333-3333-4333-8333-333333333333',
  'STK-001',
  '44444444-4444-4444-8444-444444444444',
  '55555555-5555-4555-8555-555555555555',
  '2025',
  'USED',
  '120000',
  '45000',
  'AUTOMATIC',
  'GASOLINE',
  'SEDAN',
  'سيارة صالحة'
].join(',');

describe('ImportsService tenant isolation', () => {
  it('لا يعيد مهمة من Tenant آخر حتى لو عُرف المعرّف', async () => {
    const findFirst = vi.fn().mockResolvedValue(null);
    const service = new ImportsService(
      { importJob: { findFirst } } as never,
      {} as never,
      {} as never
    );

    await expect(
      service.get(context, '66666666-6666-4666-8666-666666666666')
    ).rejects.toMatchObject({ response: { code: 'IMPORT_JOB_NOT_FOUND' } });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: context.tenantId })
      })
    );
  });
});

describe('ImportQueueService tenant isolation', () => {
  it('لا يسمح لمهمة Tenant A بإنشاء مركبة لـTenant B حتى لو تم إرسالها للطابور', async () => {
    const getForWorker = vi.fn().mockResolvedValue(null);
    const vehicleCreate = vi.fn();
    const process = (
      ImportQueueService.prototype as unknown as {
        process: (this: object, job: { data: { tenantId: string; importId: string }; attemptsMade: number }) => Promise<void>;
      }
    ).process;

    await process.call(
      {
        imports: { getForWorker },
        vehicles: { create: vehicleCreate }
      },
      {
        data: {
          tenantId: '99999999-9999-4999-8999-999999999999',
          importId: '66666666-6666-4666-8666-666666666666'
        },
        attemptsMade: 0
      }
    );

    expect(getForWorker).toHaveBeenCalledWith(
      '99999999-9999-4999-8999-999999999999',
      '66666666-6666-4666-8666-666666666666'
    );
    expect(vehicleCreate).not.toHaveBeenCalled();
  });

  it('ينشئ الصفوف السليمة فقط ويخزن تقريراً للصفوف الخاطئة', async () => {
    const importJob = {
      id: '66666666-6666-4666-8666-666666666666',
      tenantId: context.tenantId,
      membershipId: context.membershipId,
      membershipUserId: context.userId,
      storageKey: 'tenants/a/imports/job/source.csv',
      originalFilename: 'vehicles.csv',
      status: 'QUEUED' as const,
      totalRows: 2,
      validRows: 1,
      invalidRows: 1,
      importedRows: 0
    };
    const imports = {
      getForWorker: vi.fn().mockResolvedValue(importJob),
      markProcessing: vi.fn().mockResolvedValue(true),
      complete: vi.fn().mockResolvedValue(undefined),
      fail: vi.fn(),
      requeue: vi.fn()
    };
    const storage = {
      getBuffer: vi.fn().mockResolvedValue(
        Buffer.from(`${headers}\n${validRow}\n${validRow.replace('STK-001', 'STK-002').replace('سيارة صالحة', '=1+1')}\n`)
      ),
      importPrefix: vi.fn().mockReturnValue(`tenants/${context.tenantId}/imports/${importJob.id}`),
      put: vi.fn().mockResolvedValue(undefined)
    };
    const worker = Object.assign(Object.create(ImportQueueService.prototype), {
      imports,
      validator: new ImportValidatorService(),
      storage,
      tenantContexts: { resolve: vi.fn().mockResolvedValue(context) },
      vehicles: { create: vi.fn().mockResolvedValue({ id: 'vehicle-id' }) }
    }) as unknown as {
      process: (job: { data: { tenantId: string; importId: string }; attemptsMade: number }) => Promise<void>;
    };

    await worker.process({
      data: { tenantId: context.tenantId, importId: importJob.id },
      attemptsMade: 0
    });

    expect(worker).toBeDefined();
    expect(imports.complete).toHaveBeenCalledWith(
      importJob,
      expect.objectContaining({ importedRows: 1, validRows: 1, invalidRows: 1 })
    );
    expect(storage.put).toHaveBeenCalledWith(
      expect.stringContaining('/error-report.xlsx'),
      expect.any(Buffer),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
  });
});

describe('ImportValidatorService', () => {
  it('يتحقق جزئياً من الصفوف ويرفض صيغة جداول البيانات داخل الصف الخاطئ', async () => {
    const service = new ImportValidatorService();
    const formulaRow = validRow.replace('STK-001', 'STK-002').replace('سيارة صالحة', '=1+1');

    const preview = await service.validateFile(
      Buffer.from(`${headers}\n${validRow}\n${formulaRow}\n`, 'utf8'),
      'vehicles.csv',
      'text/csv'
    );

    expect(preview).toMatchObject({ totalRows: 2, validRows: 1, invalidRows: 1 });
    expect(preview.rows[1]?.errors).toContainEqual(
      expect.objectContaining({ field: 'description' })
    );
  });

  it('يُحيّد قيمة التقرير التي قد تتحول إلى صيغة عند فتح الملف', () => {
    const service = new ImportValidatorService();
    expect(service.escapeForSpreadsheet('=1+1')).toBe("'=1+1");
    expect(service.escapeForSpreadsheet('سيارة آمنة')).toBe('سيارة آمنة');
  });
});
