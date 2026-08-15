import sharp from 'sharp';
import { describe, expect, it } from 'vitest';

import { ImageProcessingService } from './image-processing.service';

describe('ImageProcessingService', () => {
  it('يرفض المحتوى الذي لا يمكن فك ترميزه كصورة صالحة', async () => {
    const service = new ImageProcessingService();

    await expect(
      service.processVehicleImage(Buffer.from('ليس ملف صورة'), {
        filename: 'vehicle.jpg',
        mimeType: 'image/jpeg'
      })
    ).rejects.toMatchObject({ response: { code: 'IMAGE_DECODE_FAILED' } });
  });

  it('يرفض الصورة التي تتجاوز حد الحجم قبل فك ترميزها', async () => {
    const service = new ImageProcessingService();

    await expect(
      service.processVehicleImage(
        Buffer.alloc(ImageProcessingService.maxBytes + 1),
        { filename: 'vehicle.jpg', mimeType: 'image/jpeg' }
      )
    ).rejects.toMatchObject({ response: { code: 'IMAGE_SIZE_INVALID' } });
  });

  it('يعيد ترميز الصورة الرئيسية والمشتقات دون حفظ بيانات EXIF', async () => {
    const service = new ImageProcessingService();
    const input = await sharp({
      create: { width: 320, height: 240, channels: 3, background: '#3377aa' }
    })
      .withMetadata({ exif: { IFD0: { Copyright: 'private' } } })
      .jpeg()
      .toBuffer();

    const processed = await service.processVehicleImage(input, {
      filename: 'vehicle.jpg',
      mimeType: 'image/jpeg'
    });

    expect(processed).toMatchObject({
      mimeType: 'image/jpeg',
      extension: 'jpg',
      width: 320,
      height: 240
    });
    const mainMetadata = await sharp(processed.main).metadata();
    expect(mainMetadata.exif).toBeUndefined();
    await expect(sharp(processed.thumbnail).metadata()).resolves.toMatchObject({ format: 'webp' });
  });
});
