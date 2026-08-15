import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@syarat/database';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../database/prisma.service';
import { ImageProcessingService } from '../storage/image-processing.service';
import { StorageService } from '../storage/storage.service';
import type { TenantContext } from '../tenancy/tenant-context';

const imageSelect = {
  id: true,
  storageKey: true,
  optimizedStorageKey: true,
  thumbnailStorageKey: true,
  sortOrder: true,
  isPrimary: true,
  width: true,
  height: true,
  mimeType: true,
  byteSize: true,
  createdAt: true
} satisfies Prisma.VehicleImageSelect;

export type TenantVehicleImage = Prisma.VehicleImageGetPayload<{ select: typeof imageSelect }>;

export type VehicleImageUpload = {
  bytes: Buffer;
  filename: string;
  mimeType: string;
};

@Injectable()
export class VehicleImagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly images: ImageProcessingService,
    private readonly storage: StorageService
  ) {}

  async upload(context: TenantContext, vehicleId: string, upload: VehicleImageUpload): Promise<TenantVehicleImage> {
    await this.assertVehicleAccess(context, vehicleId);

    const processed = await this.images.processVehicleImage(upload.bytes, {
      filename: upload.filename,
      mimeType: upload.mimeType
    });
    const prefix = this.storage.vehicleImagePrefix(context.tenantId, vehicleId);
    const id = randomUUID();
    const originalKey = `${prefix}/${id}/original.${processed.extension}`;
    const optimizedKey = `${prefix}/${id}/optimized.webp`;
    const thumbnailKey = `${prefix}/${id}/thumbnail.webp`;

    await Promise.all([
      this.storage.put(originalKey, processed.main, processed.mimeType),
      this.storage.put(optimizedKey, processed.optimized, 'image/webp'),
      this.storage.put(thumbnailKey, processed.thumbnail, 'image/webp')
    ]);

    const sortOrder = await this.prisma.vehicleImage.count({
      where: { tenantId: context.tenantId, vehicleId }
    });

    return this.prisma.vehicleImage.create({
      data: {
        id,
        tenantId: context.tenantId,
        vehicleId,
        storageKey: originalKey,
        optimizedStorageKey: optimizedKey,
        thumbnailStorageKey: thumbnailKey,
        width: processed.width,
        height: processed.height,
        mimeType: processed.mimeType,
        byteSize: processed.main.byteLength,
        sortOrder,
        isPrimary: sortOrder === 0
      },
      select: imageSelect
    });
  }

  async list(context: TenantContext, vehicleId: string): Promise<TenantVehicleImage[]> {
    await this.assertVehicleAccess(context, vehicleId);
    return this.prisma.vehicleImage.findMany({
      where: { tenantId: context.tenantId, vehicleId },
      select: imageSelect,
      orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
    });
  }

  async setPrimary(context: TenantContext, vehicleId: string, imageId: string): Promise<TenantVehicleImage> {
    await this.assertVehicleAccess(context, vehicleId);
    const image = await this.prisma.vehicleImage.findFirst({
      where: { id: imageId, tenantId: context.tenantId, vehicleId },
      select: { id: true }
    });
    if (!image) {
      throw new NotFoundException({
        code: 'VEHICLE_IMAGE_NOT_FOUND',
        message: 'صورة المركبة المطلوبة غير موجودة ضمن المعرض الحالي.'
      });
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.vehicleImage.updateMany({
        where: { tenantId: context.tenantId, vehicleId, isPrimary: true },
        data: { isPrimary: false }
      });
      return tx.vehicleImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
        select: imageSelect
      });
    });
  }

  async remove(context: TenantContext, vehicleId: string, imageId: string): Promise<void> {
    await this.assertVehicleAccess(context, vehicleId);
    const image = await this.prisma.vehicleImage.findFirst({
      where: { id: imageId, tenantId: context.tenantId, vehicleId },
      select: {
        id: true,
        isPrimary: true,
        storageKey: true,
        optimizedStorageKey: true,
        thumbnailStorageKey: true
      }
    });
    if (!image) {
      throw new NotFoundException({
        code: 'VEHICLE_IMAGE_NOT_FOUND',
        message: 'صورة المركبة المطلوبة غير موجودة ضمن المعرض الحالي.'
      });
    }

    const replacement = image.isPrimary
      ? await this.prisma.vehicleImage.findFirst({
          where: { tenantId: context.tenantId, vehicleId, id: { not: imageId } },
          select: { id: true },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        })
      : null;

    await this.prisma.$transaction(async (tx) => {
      await tx.vehicleImage.delete({ where: { id: imageId } });
      if (replacement) {
        await tx.vehicleImage.update({ where: { id: replacement.id }, data: { isPrimary: true } });
      }
    });

    await this.storage.deleteMany(
      [image.storageKey, image.optimizedStorageKey, image.thumbnailStorageKey].filter(
        (key): key is string => key !== null
      )
    );
  }

  private async assertVehicleAccess(context: TenantContext, vehicleId: string): Promise<void> {
    const vehicle = await this.prisma.vehicle.findFirst({
      where: {
        id: vehicleId,
        tenantId: context.tenantId,
        ...(context.branchScope.kind === 'limited'
          ? { branchId: { in: [...context.branchScope.branchIds] } }
          : {})
      },
      select: { id: true }
    });
    if (!vehicle) {
      throw new NotFoundException({
        code: 'VEHICLE_NOT_FOUND',
        message: 'السيارة المطلوبة غير موجودة ضمن المعرض الحالي.'
      });
    }
  }
}
