import { z } from 'zod';

export const ragSearchFileResultOutputSchema = z
  .object({
    file_id: z.string().min(1),
    file_name: z.string().min(1),
    mime_type: z.string().nullable(),
    score: z.number(),
    snippet: z.string(),
    citation: z.string().nullable(),
    retrieval_mode: z.string().nullable(),
    page_numbers: z.array(z.number()),
  })
  .strip();

export const ragSearchFilesOutputSchema = z.object({
  results: z.array(ragSearchFileResultOutputSchema),
});
