import { BadRequestException, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { extname } from 'node:path';
import sharp, { type FormatEnum, type Metadata } from 'sharp';

export type ProcessedVehicleImage = {
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  extension: 'jpg' | 'png' | 'webp';
  width: number;
  height: number;
  main: Buffer;
  optimized: Buffer;
  thumbnail: Buffer;
};

type ImageUploadMetadata = {
  filename: string;
  mimeType: string;
};

const acceptedFormats = {
  jpeg: {
    mimeType: 'image/jpeg' as const,
    extension: 'jpg' as const,
    sharpFormat: 'jpeg' as keyof FormatEnum,
    filenameExtensions: new Set(['.jpg', '.jpeg'])
  },
  png: {
    mimeType: 'image/png' as const,
    extension: 'png' as const,
    sharpFormat: 'png' as keyof FormatEnum,
    filenameExtensions: new Set(['.png'])
  },
  webp: {
    mimeType: 'image/webp' as const,
    extension: 'webp' as const,
    sharpFormat: 'webp' as keyof FormatEnum,
    filenameExtensions: new Set(['.webp'])
  }
};

@Injectable()
export class ImageProcessingService {
  static readonly maxBytes = 10 * 1024 * 1024;
  private static readonly maxPixels = 30_000_000;
  private static readonly minWidth = 160;
  private static readonly minHeight = 120;

  async processVehicleImage(
    input: Buffer,
    upload: ImageUploadMetadata
  ): Promise<ProcessedVehicleImage> {
    if (input.byteLength === 0 || input.byteLength > ImageProcessingService.maxBytes) {
      throw new PayloadTooLargeException({
        code: 'IMAGE_SIZE_INVALID',
        message: 'حجم الصورة غير مسموح.'
      });
    }

    const source = sharp(input, {
      limitInputPixels: ImageProcessingService.maxPixels,
      failOn: 'error'
    }).rotate();

    let metadata: Metadata;
    try {
      metadata = await source.metadata();
    } catch {
      throw new BadRequestException({
        code: 'IMAGE_DECODE_FAILED',
        message: 'تعذر قراءة محتوى ملف الصورة.'
      });
    }

    const format = metadata.format && acceptedFormats[metadata.format as keyof typeof acceptedFormats];
    if (!format) {
      throw new BadRequestException({
        code: 'IMAGE_TYPE_INVALID',
        message: 'نوع محتوى الصورة غير مدعوم أو لا يطابق توقيع الملف.'
      });
    }

    const extension = extname(upload.filename).toLowerCase();
    if (!format.filenameExtensions.has(extension) || upload.mimeType.toLowerCase() !== format.mimeType) {
      throw new BadRequestException({
        code: 'IMAGE_METADATA_INVALID',
        message: 'امتداد الصورة أو نوع MIME المرسل لا يطابقان محتوى الملف.'
      });
    }

    if (
      !metadata.width ||
      !metadata.height ||
      metadata.width < ImageProcessingService.minWidth ||
      metadata.height < ImageProcessingService.minHeight ||
      metadata.width * metadata.height > ImageProcessingService.maxPixels
    ) {
      throw new BadRequestException({
        code: 'IMAGE_DIMENSIONS_INVALID',
        message: 'أبعاد الصورة غير مسموح بها.'
      });
    }

    const main = await source.clone().toFormat(format.sharpFormat).toBuffer();
    const optimized = await source
      .clone()
      .resize({ width: 1920, height: 1440, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();
    const thumbnail = await source
      .clone()
      .resize({ width: 480, height: 360, fit: 'cover', position: 'centre' })
      .webp({ quality: 78 })
      .toBuffer();

    return {
      ...format,
      width: metadata.width,
      height: metadata.height,
      main,
      optimized,
      thumbnail
    };
  }
}
