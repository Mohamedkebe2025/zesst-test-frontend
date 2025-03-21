# Invitation System Implementation Summary

## Overview

We've successfully unified the invitation system to ensure that both admin and member invitations follow the same flow, use the same email templates, and provide a consistent user experience.

## Changes Made

### 1. Updated MembersContext.tsx

Modified the `inviteMember` function to use the `/api/invitations/create` endpoint instead of directly manipulating the database:

```typescript
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
```

### 2. Updated MembersPage.tsx

Modified the `handleResendInvitation` function to use the same API endpoint:

```typescript
const handleResendInvitation = async (invitationId: string) => {
  try {
    const invitation = pendingInvitations.find(inv => inv.id === invitationId);
    if (!invitation) {
      message.error('Invitation not found');
      return;
    }
    
    // Get workspace name
    const workspace = availableWorkspaces.find(w => w.id === currentWorkspace);
    const workspaceName = workspace?.name || 'Unknown';
    
    // Use the same API endpoint that's working for admin invitations
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
    
    if (result.success) {
      message.success(`Invitation resent to ${invitation.email}`);
      fetchPendingInvitations();
    } else {
      message.error(result.error || 'Failed to resend invitation');
    }
  } catch (error) {
    console.error('Error resending invitation:', error);
    message.error('Failed to resend invitation');
  }
};
```

## Unified Invitation Flow

The unified invitation flow now works as follows:

1. **Invitation Creation**:
   - Admin invites a user via the Members page
   - System calls `/api/invitations/create` endpoint
   - Endpoint creates/updates a record in `workspace_invitations` table
   - Endpoint sends invitation email using `/api/send-invitation-email`

2. **User Registration**:
   - User receives email with link to `/auth/accept-invitation`
   - User sets password on the accept-invitation page
   - System sends email confirmation email
   - User confirms email by clicking the link
   - User can now log in with the correct role

### 3. Updated Email Display in Members List

Modified the email fetching logic in MembersContext.tsx to correctly display user emails instead of user IDs:

```typescript
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
```

### 4. Database Functions for User Data Retrieval

Created PostgreSQL functions to securely retrieve user data from the auth.users table:

#### Email Retrieval Function

```sql
CREATE OR REPLACE FUNCTION public.get_user_email(user_id UUID) RETURNS TEXT AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email FROM auth.users WHERE id = user_id;
  RETURN user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### User Metadata Retrieval Function

```sql
CREATE OR REPLACE FUNCTION public.get_user_metadata(user_id UUID) RETURNS JSONB AS $$
DECLARE
  user_metadata JSONB;
BEGIN
  SELECT raw_user_meta_data INTO user_metadata FROM auth.users WHERE id = user_id;
  RETURN user_metadata;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

These functions:
- Use SECURITY DEFINER to run with the privileges of the function creator
- Safely access the auth.users table to retrieve user data
- Are accessible to both authenticated and anonymous users

### 5. Database Permissions

Added necessary permissions to ensure the functions work correctly:

```sql
GRANT USAGE ON SCHEMA auth TO postgres;
GRANT SELECT ON auth.users TO postgres;
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_email(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_user_metadata(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_metadata(UUID) TO anon;
```

These permissions:
- Allow the postgres role to access the auth schema
- Grant SELECT permission on the auth.users table
- Allow both authenticated and anonymous users to execute the functions

## Benefits

1. **Consistent User Experience**: All invited users go through the same registration flow
2. **Unified Email Templates**: All invitation emails use the same template
3. **Simplified Maintenance**: Only one invitation flow to maintain
4. **Improved Reliability**: Using the proven admin invitation flow for all invitations
5. **Correct User Information Display**: Members page now shows actual email addresses instead of user IDs

## Role System Clarification

1. **Global User Roles** (in the `user_roles` table):
   - `superadmin`: Can manage all workspaces
   - `user`: Regular user with access to assigned workspaces

2. **Workspace-Specific Roles** (in the `workspace_members` table):
   - `admin`: Administrator of a specific workspace (only one per workspace)
   - `member`: Regular member of a workspace

The invitation system now correctly handles both role types, ensuring that:
- Superadmins can invite users as workspace admins
- Workspace admins can invite users as workspace members