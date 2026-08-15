import { BadRequestException } from '@nestjs/common';

export function normalizeSaudiPhone(value: string): string {
  const compact = value.replace(/[\s()-]/g, '');
  const normalized = compact
    .replace(/^00966/, '+966')
    .replace(/^05/, '+9665')
    .replace(/^5/, '+9665');

  if (!/^\+9665\d{8}$/.test(normalized)) {
    throw new BadRequestException({ code: 'INVALID_SAUDI_PHONE', message: 'رقم الجوال السعودي غير صالح.' });
  }

  return normalized;
}
