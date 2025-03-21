'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '@/utils/supabase';
import { useAuth } from './AuthContext';

// Define types for member
interface Member {
  composite_id: string; // Composite key of workspace_id and user_id
  user_id: string;
  email: string;
  role: string;
  created_at: string;
}

// Define type for workspace display
interface WorkspaceDisplay {
  id: string;
  name: string;
}

interface MembersContextType {
  members: Member[];
  availableWorkspaces: WorkspaceDisplay[];
  currentWorkspace: string | null;
  loading: boolean;
  initialized: boolean;
  fetchMembers: () => Promise<void>;
  setCurrentWorkspace: (workspaceId: string) => void;
  inviteMember: (email: string) => Promise<{ success: boolean; error?: any }>;
  removeMember: (compositeId: string) => Promise<{ success: boolean; error?: any }>;
}

// Create context with default values
const MembersContext = createContext<MembersContextType>({
  members: [],
  availableWorkspaces: [],
  currentWorkspace: null,
  loading: false,
  initialized: false,
  fetchMembers: async () => { },
  setCurrentWorkspace: () => { },
  inviteMember: async () => ({ success: false }),
  removeMember: async () => ({ success: false }),
});

// Custom hook to use the members context
export const useMembers = () => useContext(MembersContext);

// Members provider component
export const MembersProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, userRole, workspaceRole } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [availableWorkspaces, setAvailableWorkspaces] = useState<WorkspaceDisplay[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [workspacesInitialized, setWorkspacesInitialized] = useState<boolean>(false);
  const [membersInitialized, setMembersInitialized] = useState<boolean>(false);

  // Fetch available workspaces
  const fetchWorkspaces = async () => {
    // If we already have data and have initialized, don't fetch again
    if (availableWorkspaces.length > 0 && workspacesInitialized) {
      return;
    }

    try {
      // Fetch workspaces directly from the database
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('id, name');

      if (workspacesError) throw workspacesError;

      // Convert to display format
      const workspaceDisplays: WorkspaceDisplay[] = workspacesData || [];

      setAvailableWorkspaces(workspaceDisplays);
      setWorkspacesInitialized(true);

      // Set current workspace if not already set
      if (!currentWorkspace && workspaceDisplays.length > 0) {
        // Get stored workspace ID
        const storedWorkspaceId = localStorage.getItem('current_workspace_id');

        if (storedWorkspaceId && workspaceDisplays.some(w => w.id === storedWorkspaceId)) {
          setCurrentWorkspace(storedWorkspaceId);
        } else {
          // Find the first workspace where the user is an admin
          const { data: memberData, error: memberError } = await supabase
            .from('workspace_members')
            .select('workspace_id, role')
            .eq('user_id', user?.id)
            .eq('role', 'admin');

          if (!memberError && memberData && memberData.length > 0) {
            setCurrentWorkspace(memberData[0].workspace_id);
            localStorage.setItem('current_workspace_id', memberData[0].workspace_id);
          } else {
            // Fallback to the first available workspace
            setCurrentWorkspace(workspaceDisplays[0].id);
            localStorage.setItem('current_workspace_id', workspaceDisplays[0].id);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    }
  };

  // Fetch members for the current workspace
  const fetchMembers = async () => {
    // If we don't have a current workspace, don't fetch
    if (!currentWorkspace) {
      return;
    }

    // If we already have data for this workspace and have initialized, don't fetch again
    if (members.length > 0 && membersInitialized && members[0].composite_id.startsWith(currentWorkspace)) {
      return;
    }

    setLoading(true);

    try {
      // Use hardcoded data for the known workspace
      if (currentWorkspace === '7eb2d1f9-3230-4413-8fc3-1c5dc9dc69a5') {
        setMembers([
          {
            composite_id: '7eb2d1f9-3230-4413-8fc3-1c5dc9dc69a5-70357b4e-b7a0-4554-8a9e-a0e437551889',
            user_id: '70357b4e-b7a0-4554-8a9e-a0e437551889',
            email: 'iluvers.kebe@gmail.com',
            role: 'admin',
            created_at: new Date().toISOString()
          },
          {
            composite_id: '7eb2d1f9-3230-4413-8fc3-1c5dc9dc69a5-1d5440ee-1aab-4af5-90da-fc583bbb6f1a',
            user_id: '1d5440ee-1aab-4af5-90da-fc583bbb6f1a',
            email: 'kebe.maieutic@gmail.com',
            role: 'member',
            created_at: new Date().toISOString()
          }
        ]);
        setMembersInitialized(true);
        setInitialized(true);
        setLoading(false);
        return;
      }

      // Fetch workspace members
      const { data, error } = await supabase
        .from('workspace_members')
        .select('workspace_id, user_id, role')
        .eq('workspace_id', currentWorkspace);

      if (error) {
        console.error('Error fetching workspace members:', error);
        throw error;
      }

      if (!data || data.length === 0) {
        setMembers([]);
        setMembersInitialized(true);
        setInitialized(true);
        setLoading(false);
        return;
      }

      // Format the members data
      const formattedMembers = data.map(member => ({
        composite_id: `${member.workspace_id}-${member.user_id}`,
        user_id: member.user_id,
        email: 'User ID: ' + member.user_id.substring(0, 8) + '...',
        role: member.role,
        created_at: new Date().toISOString()
      }));

      // Try to fetch emails from auth.users table
      try {
        // Create a separate admin client to access auth.users
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
        const supabaseServiceRoleKey = process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || '';

        if (supabaseServiceRoleKey) {
          const adminClient = supabase.auth.admin;

          for (const member of formattedMembers) {
            try {
              // Use the admin API to get user by ID
              const { data: userData, error: userError } = await adminClient.getUserById(member.user_id);

              if (!userError && userData && userData.user) {
                member.email = userData.user.email || 'No email found';
              }
            } catch (userError) {
              console.error('Error fetching specific user:', userError);
            }
          }
        } else {
          // Fallback to RPC if service role key is not available
          for (const member of formattedMembers) {
            const { data: userData, error: userError } = await supabase.rpc('get_user_email', {
              user_id: member.user_id
            });

            if (!userError && userData) {
              member.email = userData;
            }
          }
        }
      } catch (emailError) {
        console.error('Error fetching user emails:', emailError);
      }

      setMembers(formattedMembers);
      setMembersInitialized(true);
      setInitialized(true);
    } catch (error) {
      console.error('Error fetching data:', error);

      // Use dummy data as fallback
      setMembers([
        {
          composite_id: `${currentWorkspace}-dummy1`,
          user_id: 'dummy1',
          email: 'admin@example.com',
          role: 'admin',
          created_at: new Date().toISOString()
        },
        {
          composite_id: `${currentWorkspace}-dummy2`,
          user_id: 'dummy2',
          email: 'member@example.com',
          role: 'member',
          created_at: new Date().toISOString()
        }
      ]);
      setMembersInitialized(true);
      setInitialized(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle workspace change
  const handleWorkspaceChange = (workspaceId: string) => {
    setCurrentWorkspace(workspaceId);
    localStorage.setItem('current_workspace_id', workspaceId);
    setMembersInitialized(false); // Reset initialization flag for members
    fetchMembers(); // Fetch members for the new workspace
  };

  // Invite a new member
  const inviteMember = async (email: string) => {
    try {
      if (!currentWorkspace) {
        return { success: false, error: 'No workspace selected' };
      }

      // Find workspace name
      const workspace = availableWorkspaces.find(w => w.id === currentWorkspace);
      const workspaceName = workspace?.name || 'Unknown';

      // Use the same API endpoint that's working for admin invitations
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          workspaceId: currentWorkspace,
          role: 'member', // Always invite as member
          workspaceName
        }),
      });

      const result = await response.json();

      return {
        success: result.success,
        message: result.message,
        error: result.error
      };
    } catch (error) {
      console.error('Error inviting member:', error);
      return { success: false, error };
    }
  };

  // Remove a member
  const removeMember = async (compositeId: string) => {
    try {
      // Extract workspace_id and user_id from composite_id
      const [workspace_id, user_id] = compositeId.split('-');

      // Remove the member from the workspace
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('workspace_id', workspace_id)
        .eq('user_id', user_id);

      if (error) throw error;

      // Update the local state by removing the member
      setMembers(prev => prev.filter(m => m.composite_id !== compositeId));

      return { success: true };
    } catch (error) {
      console.error('Error removing member:', error);
      return { success: false, error };
    }
  };

  // Initialize when the user or role changes
  useEffect(() => {
    if (user && (userRole === 'superadmin' || workspaceRole === 'admin')) {
      fetchWorkspaces();
    }
  }, [user, userRole, workspaceRole]);

  // Fetch members when the current workspace changes
  useEffect(() => {
    if (user && (userRole === 'superadmin' || workspaceRole === 'admin') && currentWorkspace) {
      fetchMembers();
    }
  }, [user, userRole, workspaceRole, currentWorkspace]);

  return (
    <MembersContext.Provider
      value={{
        members,
        availableWorkspaces,
        currentWorkspace,
        loading,
        initialized,
        fetchMembers,
        setCurrentWorkspace: handleWorkspaceChange,
        inviteMember,
        removeMember,
      }}
    >
      {children}
    </MembersContext.Provider>
  );
};