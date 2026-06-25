import { z } from 'zod';

export const workspaceMembershipOutputShape = {
  role: z.enum(['owner', 'admin', 'member']),
  permissions: z.array(z.string()),
  joined_at: z.string().datetime(),
};

export const workspaceGetOutputShape = {
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  is_active: z.boolean(),
  owner_id: z.string().min(1),
  max_storage_gb: z.number().int(),
  settings: z.record(z.unknown()),
  metadata: z.record(z.unknown()),
  collaborative_data: z.record(z.unknown()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  membership: z.object(workspaceMembershipOutputShape),
};
