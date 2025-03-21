'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import supabase from '@/utils/supabase';
import { WorkspaceMembership } from '@/types/workspace';
import { UserRole } from '@/types/roles';
import {
  handleRefreshTokenError,
  setupGlobalAuthErrorHandler,
  initAuthErrorInterceptor
} from '@/utils/authErrorHandler';

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  userRole: UserRole | null;
  workspaceRole: 'admin' | 'member' | null;
  workspaces: WorkspaceMembership[];
  signIn: (email: string, password: string) => Promise<{ error: any | null }>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  userRole: null,
  workspaceRole: null,
  workspaces: [],
  signIn: async () => ({ error: null }),
  signOut: async () => { },
  switchWorkspace: () => { },
});

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);

// Auth provider component
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [workspaceRole, setWorkspaceRole] = useState<'admin' | 'member' | null>(null);
  const [workspaces, setWorkspaces] = useState<WorkspaceMembership[]>([]);
  const [authError, setAuthError] = useState<any>(null);

  // Initialize auth error interceptor
  useEffect(() => {
    // Set up global auth error handler
    const cleanup = setupGlobalAuthErrorHandler();

    // Initialize the auth error interceptor
    initAuthErrorInterceptor();

    return cleanup;
  }, []);

  // Process pending invitations
  const processPendingInvitations = async (userId: string) => {
    try {
      console.log('Processing pending invitations for user:', userId);

      // Check if there's a pending invitation to process in localStorage
      let shouldProcessInvitation = false;
      let urlInvitation = false;
      let urlWorkspaceId = null;
      let urlInviteRole = null;

      // Only access localStorage and URL parameters if we're in a browser environment
      if (typeof window !== 'undefined') {
        shouldProcessInvitation = localStorage.getItem('process_pending_invitation') === 'true';

        // Check if there's a pending invitation in URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        urlInvitation = urlParams.get('invitation') === 'true';
        urlWorkspaceId = urlParams.get('workspace_id');
        urlInviteRole = urlParams.get('invite_role');

        // If we have invitation parameters in the URL, store them in localStorage
        if (urlInvitation && urlWorkspaceId) {
          localStorage.setItem('process_pending_invitation', 'true');
          localStorage.setItem('pending_workspace_id', urlWorkspaceId);
          if (urlInviteRole) {
            localStorage.setItem('pending_invite_role', urlInviteRole);
          }
        }

        // Log all invitation-related localStorage items
        console.log('Invitation localStorage items:');
        console.log('process_pending_invitation:', localStorage.getItem('process_pending_invitation'));
        console.log('pending_workspace_id:', localStorage.getItem('pending_workspace_id'));
        console.log('pending_invitation_workspace_id:', localStorage.getItem('pending_invitation_workspace_id'));
        console.log('pending_invite_role:', localStorage.getItem('pending_invite_role'));
        console.log('pending_invitation_role:', localStorage.getItem('pending_invitation_role'));
        console.log('pending_invitation_email:', localStorage.getItem('pending_invitation_email'));
        console.log('pending_invitation_workspace_name:', localStorage.getItem('pending_invitation_workspace_name'));
      }

      // Check URL parameters
      console.log('URL invitation parameters:');
      console.log('urlInvitation:', urlInvitation);
      console.log('urlWorkspaceId:', urlWorkspaceId);
      console.log('urlInviteRole:', urlInviteRole);

      // If there's no invitation to process, return
      if (!shouldProcessInvitation && !urlInvitation) {
        console.log('No pending invitations found for user');
        return false;
      }

      console.log('Found pending invitation flag, processing...');
      // Get the invitation details from URL parameters or localStorage
      let workspaceId = urlWorkspaceId;
      let inviteRole = urlInviteRole || 'member';

      // Only access localStorage if we're in a browser environment
      if (typeof window !== 'undefined') {
        workspaceId = workspaceId ||
          localStorage.getItem('pending_workspace_id') ||
          localStorage.getItem('pending_invitation_workspace_id');

        inviteRole = inviteRole ||
          localStorage.getItem('pending_invite_role') ||
          localStorage.getItem('pending_invitation_role') ||
          'member';
      }
      'member';

      if (!workspaceId) {
        console.error('Missing required workspace ID for invitation');
        return false;
      }

      console.log(`Found pending invitation for workspace ${workspaceId} with role ${inviteRole}`);

      // Check if the user is already a member of this workspace
      const { data: existingMember, error: checkError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 means no rows found, which is expected if the user is not a member
        console.error('Error checking if user is already a member:', checkError);
      }

      // If the user is already a member, we don't need to do anything
      if (existingMember) {
        console.log(`User ${userId} is already a member of workspace ${workspaceId}`);

        // Clear the pending invitation flags
        if (typeof window !== 'undefined') {
          localStorage.removeItem('process_pending_invitation');
          localStorage.removeItem('pending_workspace_id');
          localStorage.removeItem('pending_invitation_workspace_id');
          localStorage.removeItem('pending_invite_role');
          localStorage.removeItem('pending_invitation_role');
        }

        return true;
      }

      console.log(`Adding user ${userId} to workspace ${workspaceId} with role ${inviteRole}`);

      // Add the user to the workspace
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert([
          {
            workspace_id: workspaceId,
            user_id: userId,
            role: inviteRole
          }
        ]);

      if (memberError) {
        console.error('Error adding user to workspace:', memberError);
        return false;
      }

      console.log(`Successfully added user ${userId} to workspace ${workspaceId}`);

      // Update the invitation status to accepted
      const { error: invitationError } = await supabase
        .from('workspace_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('workspace_id', workspaceId)
        .eq('email', user?.email);

      if (invitationError) {
        console.error('Error updating invitation status:', invitationError);
      }

      // Clear the pending invitation flags
      if (typeof window !== 'undefined') {
        localStorage.removeItem('process_pending_invitation');
        localStorage.removeItem('pending_workspace_id');
        localStorage.removeItem('pending_invitation_workspace_id');
        localStorage.removeItem('pending_invite_role');
        localStorage.removeItem('pending_invitation_role');
      }

      return true;
    } catch (error) {
      console.error('Error processing pending invitation:', error);
      return false;
    }
  };

  // Fetch user role from the database
  const fetchUserRole = async (userId: string) => {
    try {
      // Check if user is a superadmin
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) {
        console.error('Error fetching user role:', roleError);
        setUserRole(null);
        return;
      }

      // Set the user's global role based on the database
      setUserRole(roleData.role as UserRole);
      console.log(`User global role set to: ${roleData.role}`);

      // If the user is not a superadmin, check their workspace role
      if (roleData.role !== 'superadmin') {
        // Get the user's workspace memberships
        const { data: memberships, error: membershipError } = await supabase
          .from('workspace_members')
          .select('role')
          .eq('user_id', userId);

        if (membershipError) {
          console.error('Error fetching workspace memberships:', membershipError);
          setWorkspaceRole(null);
          return;
        }

        // Check if the user is an admin in any workspace
        const isAdmin = memberships?.some(membership => membership.role === 'admin');

        if (isAdmin) {
          setWorkspaceRole('admin');
          console.log('User workspace role set to: admin');
        } else if (memberships && memberships.length > 0) {
          setWorkspaceRole('member');
          console.log('User workspace role set to: member');
        } else {
          setWorkspaceRole(null);
          console.log('User has no workspace role');
        }
      }

      // Fetch workspaces based on the user's role
      await fetchUserWorkspaces(userId, roleData.role as UserRole);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setUserRole(null);
      setWorkspaceRole(null);
    }
  };

  // Fetch user workspaces based on role
  const fetchUserWorkspaces = async (userId: string, role: UserRole) => {
    try {
      if (role === 'superadmin') {
        // For superadmins, fetch all workspaces
        const { data: allWorkspaces, error: workspacesError } = await supabase
          .from('workspaces')
          .select('*')
          .order('created_at', { ascending: false });

        if (workspacesError) throw workspacesError;

        // Find the superadmin workspace
        const superadminWorkspace = allWorkspaces.find(w => w.is_superadmin_workspace);

        const formattedWorkspaces: WorkspaceMembership[] = allWorkspaces.map(workspace => ({
          id: workspace.id,
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          userId: userId,
          role: workspace.is_superadmin_workspace ? 'superadmin' : 'admin',
          isDefault: workspace.is_default,
          isSuperadminWorkspace: workspace.is_superadmin_workspace
        }));

        setWorkspaces(formattedWorkspaces);
      } else {
        // For regular users, fetch only their assigned workspaces
        const { data: userWorkspaces, error: userError } = await supabase
          .from('workspace_members')
          .select('*, workspaces(*)')
          .eq('user_id', userId);

        if (userError) throw userError;

        if (!userWorkspaces || userWorkspaces.length === 0) {
          setWorkspaces([]);
          return;
        }

        const formattedWorkspaces = userWorkspaces.map(membership => ({
          id: membership.id || `${membership.workspace_id}-${membership.user_id}`,
          workspaceId: membership.workspace_id,
          workspaceName: membership.workspaces.name,
          userId: userId,
          role: membership.role,
          isDefault: membership.workspaces.is_default,
          isSuperadminWorkspace: membership.workspaces.is_superadmin_workspace
        }));

        setWorkspaces(formattedWorkspaces);
      }
    } catch (error) {
      console.error('Error fetching user workspaces:', error);
      setWorkspaces([]);
    }
  };

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      setIsLoading(true);

      try {
        // Get the current session
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error) {
          if (error.message.includes('Invalid Refresh Token') ||
            error.message.includes('Refresh Token Not Found')) {
            handleRefreshTokenError();
            return;
          }
          throw error;
        }

        setSession(session);
        setUser(session?.user || null);

        if (session?.user) {
          // Process any pending invitations
          await processPendingInvitations(session.user.id);

          // Fetch the user's role from the database
          await fetchUserRole(session.user.id);
        }

        // Set up auth state change listener
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (event, session) => {
            setSession(session);
            setUser(session?.user || null);

            if (session?.user) {
              // Process any pending invitations
              await processPendingInvitations(session.user.id);

              // Fetch the user's role from the database
              await fetchUserRole(session.user.id);
            } else {
              setUserRole(null);
              setWorkspaceRole(null);
              setWorkspaces([]);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error initializing auth:', error);
        setAuthError(error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  // Switch workspace
  const switchWorkspace = (workspaceId: string) => {
    // This function is intentionally left minimal as per user's request
    // to avoid potential reloading issues
    console.log(`Switching to workspace: ${workspaceId}`);
  };

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      console.log('AuthContext: Attempting to sign in user:', email);

      // Get user data before sign-in attempt
      try {
        const { data: userData } = await supabase.auth.getUser();
        console.log('Current auth state before sign-in:', userData);
      } catch (e) {
        console.log('Error getting current user before sign-in:', e);
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('AuthContext: Sign-in error:', error);
        return { error };
      }

      console.log('AuthContext: Sign-in successful:', data);
      console.log('User metadata:', data.user?.user_metadata);

      // Check user role in database
      try {
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();

        console.log('User role from database:', roleData, roleError);
      } catch (e) {
        console.log('Error fetching user role:', e);
      }

      // Process any pending invitations
      if (data.user) {
        await processPendingInvitations(data.user.id);
      }

      return { error: null };
    } catch (error) {
      console.error('Error signing in:', error);
      return { error };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUserRole(null);
      setWorkspaceRole(null);
      setWorkspaces([]);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Provide the auth context to children
  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isLoading,
        userRole,
        workspaceRole,
        workspaces,
        signIn,
        signOut,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};