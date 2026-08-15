import { z } from 'zod';

const booleanFromString = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

export const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'staging', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  API_PREFIX: z.string().trim().min(1).default('v1'),
  CORS_ORIGINS: z.string().trim().min(1),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_ACCESS_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().max(90).default(30),
  OTP_HMAC_SECRET: z.string().min(32),
  OTP_TTL_SECONDS: z.coerce.number().int().positive().max(900).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().trim().min(1),
  S3_BUCKET: z.string().trim().min(3),
  S3_ACCESS_KEY_ID: z.string().trim().min(1),
  S3_SECRET_ACCESS_KEY: z.string().trim().min(1),
  S3_PUBLIC_BASE_URL: z.string().url(),
  AVAILABILITY_CONFIRMATION_DAYS: z.coerce.number().int().positive().default(7),
  AVAILABILITY_GRACE_DAYS: z.coerce.number().int().positive().default(3),
  TRUST_PROXY: booleanFromString.default(false)
});

export type Environment = z.infer<typeof environmentSchema>;

export function parseEnvironment(input: NodeJS.ProcessEnv = process.env): Environment {
  return environmentSchema.parse(input);
}
