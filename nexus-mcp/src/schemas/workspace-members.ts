import { z } from 'zod';

export const workspaceMemberUserOutputShape = {
  id: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  username: z.string().nullable(),
};

export const workspaceMemberOutputShape = {
  id: z.string().min(1),
  workspace_id: z.string().min(1),
  user_id: z.string().min(1),
  role: z.enum(['owner', 'admin', 'member']),
  permissions: z.array(z.string()),
  joined_at: z.string().datetime(),
  invited_at: z.string().datetime().nullable(),
  invited_by: z.string().nullable(),
  is_active: z.boolean(),
  collaborative_data: z.record(z.unknown()),
  user: z.object(workspaceMemberUserOutputShape),
};

export const workspaceMembersGetOutputShape = {
  members: z.array(z.object(workspaceMemberOutputShape)),
};

export const workspaceMembersGetOutputSchema = z.object(workspaceMembersGetOutputShape);
