export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  role: string;
  isDefault: boolean;
  isSuperadminWorkspace: boolean;
}