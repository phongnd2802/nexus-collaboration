import { z } from 'zod';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../constants.js';

export const responseFormatSchema = z
  .enum(['markdown', 'json'])
  .default('markdown')
  .describe("Output format. Use 'json' for structured processing or 'markdown' for readable summaries.");

export const workspaceIdSchema = z.string().min(1).describe('Nexus workspace ID.');

export const idSchema = (name: string) => z.string().min(1).describe(`${name} ID.`);

export const limitSchema = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .default(DEFAULT_LIMIT)
  .describe(`Maximum number of items to return, between 1 and ${MAX_LIMIT}.`);

export const offsetSchema = z
  .number()
  .int()
  .min(0)
  .default(0)
  .describe('Number of items to skip for offset pagination.');

export const queryObjectSchema = z
  .record(z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.undefined()]))
  .optional()
  .describe('Optional query parameters to forward to the Nexus backend.');

export const dataObjectSchema = z
  .record(z.unknown())
  .describe('Request body matching the corresponding Nexus backend DTO.');
