import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const KEY_LENGTH = 64;
const SCRYPT_PARAMETERS = { N: 16_384, r: 8, p: 1 } as const;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const derivedKey = scryptSync(password, salt, KEY_LENGTH, SCRYPT_PARAMETERS).toString('hex');
  return `scrypt$${SCRYPT_PARAMETERS.N}$${SCRYPT_PARAMETERS.r}$${SCRYPT_PARAMETERS.p}$${salt}$${derivedKey}`;
}

export function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, rawN, rawR, rawP, salt, expected] = encoded.split('$');
  if (algorithm !== 'scrypt' || !rawN || !rawR || !rawP || !salt || !expected) {
    return false;
  }

  const N = Number(rawN);
  const r = Number(rawR);
  const p = Number(rawP);
  if (!Number.isSafeInteger(N) || !Number.isSafeInteger(r) || !Number.isSafeInteger(p)) {
    return false;
  }

  const actual = scryptSync(password, salt, KEY_LENGTH, { N, r, p });
  const expectedBuffer = Buffer.from(expected, 'hex');
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}
