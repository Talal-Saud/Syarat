import { z } from 'zod';

export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    correlationId: z.string().uuid().optional()
  })
});

export type ApiError = z.infer<typeof apiErrorSchema>;

export type CursorPage<T> = {
  data: T[];
  pageInfo: { nextCursor: string | null };
};
