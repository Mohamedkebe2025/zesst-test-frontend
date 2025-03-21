'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '@/utils/supabase';
import { useAuth } from './AuthContext';

// Define types for workspace and invitation
interface Workspace {
  id: string;
  name: string;
  created_at: string;
  is_default: boolean;
  is_superadmin_workspace: boolean;
  admin_name?: string;
  admin_email?: string;
  member_count?: number;
}

interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  accepted_at: string | null;
  registration_link: string | null;
  workspace_name?: string;
  workspaces?: {
    name: string;
  };
}

interface WorkspaceMembership {
  workspaceId: string;
  workspaceName: string;
  role: string;
  isDefault: boolean;
  isSuperadminWorkspace: boolean;
}

interface WorkspaceContextType {
  workspaces: Workspace[];
  invitations: Invitation[];
  workspaceMemberships: WorkspaceMembership[];
  currentWorkspace: WorkspaceMembership | null;
  loading: boolean;
  fetchWorkspaces: () => Promise<void>;
  createWorkspace: (name: string) => Promise<{ success: boolean; error?: any }>;
  deleteWorkspace: (workspaceId: string) => Promise<{ success: boolean; error?: any }>;
  inviteAdmin: (email: string, workspaceId: string) => Promise<{ success: boolean; registrationLink?: string; error?: any }>;
  resendInvitation: (invitationId: string) => Promise<{ success: boolean; registrationLink?: string; error?: any }>;
  cancelInvitation: (invitationId: string) => Promise<{ success: boolean; error?: any }>;
  switchWorkspace: (workspaceId: string) => void;
  exitWorkspace: () => void;
}

// Create context with default values
const WorkspaceContext = createContext<WorkspaceContextType>({
  workspaces: [],
  invitations: [],
  workspaceMemberships: [],
  currentWorkspace: null,
  loading: false,
  fetchWorkspaces: async () => { },
  createWorkspace: async () => ({ success: false }),
  deleteWorkspace: async () => ({ success: false }),
  inviteAdmin: async () => ({ success: false }),
  resendInvitation: async () => ({ success: false }),
  cancelInvitation: async () => ({ success: false }),
  switchWorkspace: () => { },
  exitWorkspace: () => { },
});

// Custom hook to use the workspace context
export const useWorkspace = () => useContext(WorkspaceContext);

// Workspace provider component
export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [workspaceMemberships, setWorkspaceMemberships] = useState<WorkspaceMembership[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<WorkspaceMembership | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [initialFetchDone, setInitialFetchDone] = useState<boolean>(false);

  // Fetch workspaces and invitations
  const fetchWorkspaces = async () => {
    // Only show loading indicator on initial fetch, not on subsequent fetches
    if (!initialFetchDone) {
      setLoading(true);
    }

    try {
      if (userRole === 'superadmin') {
        // For superadmins, fetch all workspaces
        const { data: workspacesData, error: workspacesError } = await supabase
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: false });

        if (workspacesError) throw workspacesError;

        // Fetch additional information for each workspace
        const enhancedWorkspaces = await Promise.all((workspacesData || []).map(async (workspace) => {
          // Get the admin for this workspace
          console.log(`Fetching admin for workspace: ${workspace.id} (${workspace.name})`);
          const { data: adminData, error: adminError } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspace.id)
            .eq('role', 'admin')
            .single();

          console.log(`Admin data for workspace ${workspace.name}:`, adminData, adminError);

          if (adminError && !adminError.message.includes('No rows found')) {
            console.error('Error fetching admin for workspace:', adminError);
          }

          let adminName = 'Admin Not Assigned';
          let adminEmail = 'No email available';

          // If we found an admin, get their email
          if (adminData && adminData.user_id) {
            try {
              // Use the RPC function to get the admin's email
              console.log(`Fetching email for admin: ${adminData.user_id}`);
              const { data: emailData, error: emailError } = await supabase.rpc('get_user_email', {
                user_id: adminData.user_id
              });

              console.log(`Email data for admin ${adminData.user_id}:`, emailData, emailError);

              if (!emailError && emailData) {
                adminEmail = emailData;
                console.log(`Set admin email to: ${adminEmail}`);
              }

              // Try to get the admin's name directly from the database
              try {
                // Use the RPC function to get the user metadata
                const { data: metadataData, error: metadataError } = await supabase.rpc('get_user_metadata', {
                  user_id: adminData.user_id
                });

                console.log(`Metadata query result:`, metadataData, metadataError);

                if (metadataError) {
                  console.error('Error fetching user metadata:', metadataError);

                  // Fallback to direct query using service role if available
                  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
                  const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

                  if (supabaseServiceRoleKey) {
                    // Create a direct query to get the user metadata
                    const { data: directData, error: directError } = await supabase.rpc('get_user_metadata', {
                      user_id: adminData.user_id
                    });

                    console.log(`Direct metadata query result:`, directData, directError);

                    if (!directError && directData) {
                      const metadata = typeof directData === 'string' ? JSON.parse(directData) : directData;
                      adminName = metadata.full_name || metadata.name || adminEmail.split('@')[0] || 'Admin (No Name Set)';
                      console.log(`Set admin name to: ${adminName} from direct query`);
                    }
                  }
                } else if (metadataData) {
                  // Parse the metadata if it's a string
                  const metadata = typeof metadataData === 'string'
                    ? JSON.parse(metadataData)
                    : metadataData;

                  console.log(`User metadata for admin ${adminData.user_id}:`, metadata);

                  // Extract the name from metadata
                  adminName = metadata.full_name || metadata.name || adminEmail.split('@')[0] || 'Admin (No Name Set)';
                  console.log(`Set admin name to: ${adminName} from metadata`);
                }
              } catch (metadataError) {
                console.error('Error processing user metadata:', metadataError);
              }
            } catch (error) {
              console.error('Error fetching admin email:', error);
            }
          }

          // Get the count of members for this workspace (excluding the admin)
          const { count, error: countError } = await supabase
            .from('workspace_members')
            .select('*', { count: 'exact', head: true })
            .eq('workspace_id', workspace.id)
            .neq('role', 'admin');

          if (countError) {
            console.error('Error counting members for workspace:', countError);
          }

          const enhancedWorkspace = {
            ...workspace,
            admin_name: adminName,
            admin_email: adminEmail,
            member_count: count || 0
          };

          console.log(`Enhanced workspace data for ${workspace.name}:`, enhancedWorkspace);

          return enhancedWorkspace;
        }));

        setWorkspaces(enhancedWorkspaces);

        // Format workspace memberships for superadmin
        const formattedMemberships: WorkspaceMembership[] = enhancedWorkspaces.map(workspace => ({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          role: 'admin', // Superadmins have admin privileges in all workspaces
          isDefault: workspace.is_default,
          isSuperadminWorkspace: workspace.is_superadmin_workspace,
        }));

        setWorkspaceMemberships(formattedMemberships);

        // Set the superadmin's default workspace as the current workspace
        // Only set it if it's not already set
        if (!currentWorkspace) {
          const superadminWorkspace = formattedMemberships.find(
            (w) => w.isSuperadminWorkspace && w.isDefault
          );

          if (superadminWorkspace) {
            setCurrentWorkspace(superadminWorkspace);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_workspace_id', superadminWorkspace.workspaceId);
            }
          } else if (formattedMemberships.length > 0) {
            // Fallback to the first workspace if no superadmin workspace is found
            setCurrentWorkspace(formattedMemberships[0]);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_workspace_id', formattedMemberships[0].workspaceId);
            }
          }
        }

        // Fetch all invitations with workspace names
        const { data: invitationsData, error: invitationsError } = await supabase
          .from('workspace_invitations')
          .select('*, workspaces:workspaces(name)')
          .order('created_at', { ascending: false });

        if (invitationsError) throw invitationsError;

        // Format invitations with workspace names
        const formattedInvitations = invitationsData?.map(invitation => ({
          ...invitation,
          workspace_name: invitation.workspaces?.name || 'Unknown'
        })) || [];

        setInvitations(formattedInvitations);
      } else if (user) {
        // For regular users, fetch only their workspaces
        const { data: userWorkspaces, error: userWorkspacesError } = await supabase
          .from('workspace_members')
          .select('*, workspaces:workspaces(*)')
          .eq('user_id', user.id);

        if (userWorkspacesError) throw userWorkspacesError;

        // Format workspaces
        const formattedWorkspaces = userWorkspaces?.map(membership => membership.workspaces) || [];
        setWorkspaces(formattedWorkspaces);

        // Format workspace memberships for regular users
        const formattedMemberships: WorkspaceMembership[] = userWorkspaces?.map((membership) => {
          // Extract workspace data from the nested workspaces object
          const workspace = membership.workspaces as any;

          return {
            workspaceId: membership.workspace_id,
            workspaceName: workspace?.name || 'Unknown',
            role: membership.role,
            isDefault: workspace?.is_default || false,
            isSuperadminWorkspace: workspace?.is_superadmin_workspace || false,
          };
        }) || [];

        setWorkspaceMemberships(formattedMemberships);

        // Set the user's default workspace as the current workspace
        // Only set it if it's not already set
        if (!currentWorkspace) {
          const defaultWorkspace = formattedMemberships.find((w) => w.isDefault);

          if (defaultWorkspace) {
            setCurrentWorkspace(defaultWorkspace);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_workspace_id', defaultWorkspace.workspaceId);
            }
          } else if (formattedMemberships.length > 0) {
            // Fallback to the first workspace if no default workspace is found
            setCurrentWorkspace(formattedMemberships[0]);
            if (typeof window !== 'undefined') {
              localStorage.setItem('current_workspace_id', formattedMemberships[0].workspaceId);
            }
          }
        }

        // For admins, fetch invitations for their workspaces
        if (userWorkspaces?.some(membership => membership.role === 'admin')) {
          // Get the workspace IDs where the user is an admin
          const adminWorkspaceIds = userWorkspaces
            .filter(membership => membership.role === 'admin')
            .map(membership => membership.workspace_id);

          // Fetch invitations for those workspaces
          const { data: invitationsData, error: invitationsError } = await supabase
            .from('workspace_invitations')
            .select('*, workspaces:workspaces(name)')
            .in('workspace_id', adminWorkspaceIds)
            .order('created_at', { ascending: false });

          if (invitationsError) throw invitationsError;

          // Format invitations with workspace names
          const formattedInvitations = invitationsData?.map(invitation => ({
            ...invitation,
            workspace_name: invitation.workspaces?.name || 'Unknown'
          })) || [];

          setInvitations(formattedInvitations);
        } else {
          // For members, clear invitations
          setInvitations([]);
        }
      }

      setInitialized(true);
      setInitialFetchDone(true);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new workspace
  const createWorkspace = async (name: string) => {
    try {
      const { data, error } = await supabase
        .from('workspaces')
        .insert([
          {
            name,
            created_by: user?.id,
            is_default: false,
            is_superadmin_workspace: false
          }
        ])
        .select();

      if (error) throw error;

      // Update the local state with the new workspace
      if (data && data.length > 0) {
        setWorkspaces(prev => [...prev, data[0]]);
      }

      return { success: true };
    } catch (error) {
      console.error('Error creating workspace:', error);
      return { success: false, error };
    }
  };

  // Delete a workspace
  const deleteWorkspace = async (workspaceId: string) => {
    try {
      // Check if workspace is default or superadmin workspace
      const workspace = workspaces.find(w => w.id === workspaceId);
      if (workspace?.is_default || workspace?.is_superadmin_workspace) {
        return {
          success: false,
          error: 'Cannot delete default or SuperAdmin workspaces'
        };
      }

      // Delete the workspace
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

      if (error) throw error;

      // Update the local state by removing the deleted workspace
      setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));

      return { success: true };
    } catch (error) {
      console.error('Error deleting workspace:', error);
      return { success: false, error };
    }
  };

  // Invite an admin to a workspace
  const inviteAdmin = async (email: string, workspaceId: string) => {
    try {
      // Get the workspace name to include in the invitation
      const workspace = workspaces.find(w => w.id === workspaceId);
      const workspaceName = workspace?.name || 'Unknown Workspace';

      console.log('Inviting admin:', email, 'to workspace:', workspaceId, workspaceName);

      // Use the new API endpoint
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          workspaceId,
          role: 'admin',
          workspaceName
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Invitation API error:', result.error);
        throw new Error(result.error || 'Failed to send invitation');
      }

      console.log('Invitation sent successfully:', result);

      // Refresh invitations list
      await fetchWorkspaces();

      // If there's a registration link in the result, return it
      if (result.registrationLink) {
        return {
          success: true,
          registrationLink: result.registrationLink,
          message: result.message || 'Invitation sent successfully'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error inviting admin:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invitation'
      };
    }
  };

  // Resend invitation
  const resendInvitation = async (invitationId: string) => {
    try {
      const invitation = invitations.find(inv => inv.id === invitationId);
      if (!invitation) {
        return {
          success: false,
          error: 'Invitation not found'
        };
      }

      // Get the workspace name
      const workspace = workspaces.find(w => w.id === invitation.workspace_id);
      const workspaceName = workspace?.name || 'Unknown Workspace';

      console.log('Resending invitation to:', invitation.email, 'for workspace:', invitation.workspace_id);

      // Use the new API endpoint
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          workspaceId: invitation.workspace_id,
          role: invitation.role,
          workspaceName
        }),
      });

      const result = await response.json();

      if (!result.success) {
        console.error('Resend invitation API error:', result.error);
        throw new Error(result.error || 'Failed to resend invitation');
      }

      console.log('Invitation resent successfully:', result);

      // Update the invitation record to show it was resent
      const { error: updateError } = await supabase
        .from('workspace_invitations')
        .update({
          status: 'pending',
          updated_at: new Date().toISOString()
        })
        .eq('id', invitationId);

      if (updateError) {
        console.error('Error updating invitation record:', updateError);
      }

      // Refresh invitations
      await fetchWorkspaces();

      // If there's a registration link in the result, return it
      if (result.registrationLink) {
        return {
          success: true,
          registrationLink: result.registrationLink,
          message: result.message || 'Invitation resent successfully'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('Error resending invitation:', error);
      return { success: false, error };
    }
  };

  // Cancel invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'expired' })
        .eq('id', invitationId);

      if (error) throw error;

      // Update the local state by updating the invitation status
      setInvitations(prev =>
        prev.map(inv =>
          inv.id === invitationId
            ? { ...inv, status: 'expired' as const }
            : inv
        )
      );

      return { success: true };
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      return { success: false, error };
    }
  };

  // Function to switch to a different workspace
  const switchWorkspace = (workspaceId: string) => {
    const workspace = workspaceMemberships.find((w) => w.workspaceId === workspaceId);
    if (workspace) {
      setCurrentWorkspace(workspace);
      // Store the current workspace ID in localStorage for role determination
      if (typeof window !== 'undefined') {
        localStorage.setItem('current_workspace_id', workspaceId);
      }
    }
  };

  // Function to exit the current workspace and return to the default workspace
  const exitWorkspace = () => {
    if (userRole === 'superadmin') {
      // For superadmin, find their superadmin workspace
      const superadminWorkspace = workspaceMemberships.find(
        (w) => w.isSuperadminWorkspace && w.isDefault
      );

      if (superadminWorkspace) {
        setCurrentWorkspace(superadminWorkspace);
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_workspace_id', superadminWorkspace.workspaceId);
        }
      }
    } else {
      // For regular users, find their default workspace
      const defaultWorkspace = workspaceMemberships.find((w) => w.isDefault);

      if (defaultWorkspace) {
        setCurrentWorkspace(defaultWorkspace);
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_workspace_id', defaultWorkspace.workspaceId);
        }
      } else if (workspaceMemberships.length > 0) {
        // Fallback to the first workspace if no default workspace is found
        setCurrentWorkspace(workspaceMemberships[0]);
        if (typeof window !== 'undefined') {
          localStorage.setItem('current_workspace_id', workspaceMemberships[0].workspaceId);
        }
      }
    }
  };

  // Initialize workspaces when the user or role changes
  useEffect(() => {
    if (user) {
      // Fetch workspaces for all users, not just superadmins
      fetchWorkspaces();
    } else {
      // Reset state when user logs out
      setWorkspaces([]);
      setInvitations([]);
      setWorkspaceMemberships([]);
      setCurrentWorkspace(null);
      setInitialized(false);
      setInitialFetchDone(false);
    }
  }, [user, userRole]);

  // Restore current workspace from localStorage when workspaceMemberships change
  useEffect(() => {
    if (workspaceMemberships.length > 0 && !currentWorkspace && typeof window !== 'undefined') {
      const savedWorkspaceId = localStorage.getItem('current_workspace_id');
      if (savedWorkspaceId) {
        const savedWorkspace = workspaceMemberships.find(
          (w) => w.workspaceId === savedWorkspaceId
        );

        if (savedWorkspace) {
          setCurrentWorkspace(savedWorkspace);
        }
      }
    }
  }, [workspaceMemberships, currentWorkspace]);

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        invitations,
        workspaceMemberships,
        currentWorkspace,
        loading,
        fetchWorkspaces,
        createWorkspace,
        deleteWorkspace,
        inviteAdmin,
        resendInvitation,
        cancelInvitation,
        switchWorkspace,
        exitWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
};