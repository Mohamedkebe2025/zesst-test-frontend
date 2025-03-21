export type UserRole = 'superadmin' | 'admin' | 'member';

export interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: string;
  isDefault: boolean;
  isSuperadminWorkspace: boolean;
}