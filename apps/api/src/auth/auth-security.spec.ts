import { describe, expect, it } from 'vitest';

import { hashPassword, verifyPassword } from './password-hash';
import { normalizeSaudiPhone } from './phone-normalizer';

describe('normalizeSaudiPhone', () => {
  it.each([
    ['0551234567', '+966551234567'],
    ['+966551234567', '+966551234567'],
    ['00966551234567', '+966551234567']
  ])('normalizes %s', (input, expected) => {
    expect(normalizeSaudiPhone(input)).toBe(expected);
  });

  it('rejects an invalid phone number', () => {
    expect(() => normalizeSaudiPhone('1234')).toThrow();
  });
});

describe('password hashing', () => {
  it('verifies only the original password', () => {
    const hash = hashPassword('a-strong-development-password');
    expect(verifyPassword('a-strong-development-password', hash)).toBe(true);
    expect(verifyPassword('different-password', hash)).toBe(false);
  });
});
