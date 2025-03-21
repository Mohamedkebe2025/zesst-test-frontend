import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  // Create a Supabase admin client with the service role key
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  if (!supabaseServiceRoleKey) {
    return NextResponse.json(
      { success: false, error: 'Service role key not configured' },
      { status: 500 }
    );
  }

  // Create admin client with service role
  const adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    // Get request body
    const { email, userId } = await request.json();

    if (!email || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    console.log(`Processing workspace membership for user: ${email} (${userId})`);

    // Verify that the user exists and has a confirmed email
    const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(userId);

    if (userError) {
      console.error('Error getting user:', userError);
      return NextResponse.json(
        { success: false, error: 'Failed to get user' },
        { status: 500 }
      );
    }

    if (!userData.user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if the user's email is confirmed
    if (!userData.user.email_confirmed_at) {
      console.log('User email is not confirmed yet');
      return NextResponse.json(
        { success: false, error: 'Email not confirmed yet' },
        { status: 400 }
      );
    }

    console.log('User email is confirmed, processing workspace membership');

    // Get the invitation data
    const { data: inviteData } = await adminClient
      .from('workspace_invitations')
      .select('workspace_id, role')
      .eq('email', email)
      .eq('status', 'pending')
      .single();

    console.log('Invitation data:', inviteData);

    // If we have invitation data, add the user to the workspace
    if (inviteData) {
      console.log(`Adding user ${userId} to workspace ${inviteData.workspace_id} with role ${inviteData.role}`);

      // Add the user to the workspace
      const { error: memberError } = await adminClient
        .from('workspace_members')
        .insert([
          {
            workspace_id: inviteData.workspace_id,
            user_id: userId,
            role: inviteData.role || 'member'
          }
        ]);

      if (memberError) {
        console.error('Error adding user to workspace:', memberError);
        return NextResponse.json(
          { success: false, error: 'Failed to add user to workspace' },
          { status: 500 }
        );
      }

      // Update invitation status
      const { error: updateError } = await adminClient
        .from('workspace_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('workspace_id', inviteData.workspace_id)
        .eq('email', email);

      if (updateError) {
        console.error('Error updating invitation status:', updateError);
      }

      return NextResponse.json({
        success: true,
        message: 'User added to workspace successfully'
      });
    } else {
      console.log('No pending invitation found for this user');
      return NextResponse.json({
        success: false,
        error: 'No pending invitation found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error in confirm-email API:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process workspace membership' },
      { status: 500 }
    );
  }
}