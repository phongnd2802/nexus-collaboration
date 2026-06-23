import type { ZodTypeAny } from 'zod';

export function normalizeBySchema<T>(schema: ZodTypeAny, data: unknown): T {
  return schema.parse(data) as T;
}
