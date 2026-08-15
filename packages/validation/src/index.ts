import { z } from 'zod';

export const uuidSchema = z.string().uuid();
export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  cursor: z.string().min(1).optional()
});
