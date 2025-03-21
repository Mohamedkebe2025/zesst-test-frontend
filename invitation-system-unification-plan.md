# Unified Invitation System Migration Plan

## 1. Current System Analysis

After examining the database schema and reviewing the code, I've identified two separate invitation flows that need to be unified:

### 1.1 Database Structure

We have three key tables handling user roles and invitations:

1. **user_roles** - Stores global user roles
   - `user_id` (PK) - UUID of the user
   - `role` - Text value (superadmin, user)

2. **workspace_members** - Stores workspace-specific roles
   - `workspace_id` (PK) - UUID of the workspace
   - `user_id` (PK) - UUID of the user
   - `role` - Text value (admin, member)

3. **workspace_invitations** - Stores pending invitations
   - `id` (PK) - UUID of the invitation
   - `workspace_id` - UUID of the workspace
   - `email` - Email of the invited user
   - `role` - Role to assign (admin, member)
   - `invited_by` - UUID of the inviting user
   - `registration_link` - Optional registration link
   - `created_at` - Timestamp
   - `status` - Status of invitation (pending, accepted, cancelled)
   - `accepted_at` - Timestamp when accepted

### 1.2 Current Invitation Flows

#### Admin Invitation Flow (Working Correctly)
1. Superadmin invites a user with admin role via `/api/invitations/create` endpoint
2. Endpoint creates/updates a record in `workspace_invitations` table
3. Endpoint sends invitation email using `/api/send-invitation-email`
4. Email contains a link to `/auth/accept-invitation` with query parameters
5. User sets password on accept-invitation page
6. System sends email confirmation email
7. User confirms email by clicking link
8. User can now log in

#### Member Invitation Flow (Needs Fix)
1. Admin invites a user via the Members page
2. `inviteMember` function in `MembersContext` creates a record in `workspace_invitations` table
3. Function generates a registration link but **doesn't send an email**
4. Registration link points to `/auth/register?invitation={id}`
5. There's no clear way for the invited user to receive this link

## 2. Identified Issues

1. **Email Not Sent**: The member invitation flow doesn't send an email
2. **Different Registration Paths**: Admin uses `/auth/accept-invitation` while members use `/auth/register?invitation={id}`
3. **Inconsistent Email Templates**: Different email templates or no email for members
4. **Role Handling**: Admin vs member role handling may be inconsistent

## 3. Migration Plan

### 3.1 Code Changes

#### A. Update MembersContext.tsx

The key issue is in the `inviteMember` function which needs to use the `/api/invitations/create` endpoint instead of directly manipulating the database:

```typescript
// Update inviteMember function in MembersContext.tsx
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

#### B. Update handleResendInvitation Function

The `handleResendInvitation` function in the MembersPage component also needs to be updated to use the same flow:

```typescript
// Update handleResendInvitation in MembersPage component
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

### 3.2 Testing Strategy

1. **Admin to Member Invitation Test**:
   - Log in as an admin
   - Invite a user as a member
   - Verify invitation record is created in the database
   - Verify email is sent with correct template
   - Click the link in the email
   - Complete the registration process
   - Verify user can log in
   - Verify user has the correct member role in the workspace

2. **Resend Invitation Test**:
   - Create a pending invitation
   - Use the "Resend" button
   - Verify a new email is sent
   - Verify the invitation record is updated

## 4. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| Disrupting the working admin flow | Changes are isolated to the member invitation flow; admin flow code remains untouched |
| Email delivery issues | Use the same SendGrid integration that's proven to work for admin invitations |
| Invitation record conflicts | The `/api/invitations/create` endpoint already handles updating existing invitations |
| Role confusion | Always set 'member' role for invitations from the members page |

## 5. Implementation Sequence

1. Create a backup of the current code
2. Update the `inviteMember` function in `MembersContext.tsx`
3. Update the `handleResendInvitation` function in `src/app/dashboard/members/page.tsx`
4. Test the member invitation flow
5. Test the admin invitation flow to verify it still works
6. Update documentation

## 6. Conclusion

This plan ensures a unified approach to invitations while maintaining the working admin invitation flow. By leveraging the existing `/api/invitations/create` endpoint, we ensure that:

1. All invitations use the same email templates
2. All users go through the same `/auth/accept-invitation` flow
3. Email confirmation works consistently
4. Role assignment is handled correctly

The changes are minimal and focused on reusing the working components rather than creating new ones, which reduces the risk of regression.