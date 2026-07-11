import { z } from 'zod';

// The backend returns email/name as null when the user profile cannot be
// resolved (deleted user, lookup failure) — keep them nullable.
export const workspaceMemberUserOutputShape = {
  id: z.string().min(1),
  email: z.string().nullable(),
  name: z.string().nullable(),
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
  user: z.object(workspaceMemberUserOutputShape),
};

export const workspaceMembersGetOutputShape = {
  members: z.array(z.object(workspaceMemberOutputShape)),
};

export const workspaceMembersGetOutputSchema = z.object(workspaceMembersGetOutputShape);
