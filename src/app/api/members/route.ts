import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Create a Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(request: NextRequest) {
  try {
    // Get the workspace_id from the query parameters
    const searchParams = request.nextUrl.searchParams;
    const workspaceId = searchParams.get('workspace_id');
    
    if (!workspaceId) {
      return NextResponse.json(
        { error: 'Workspace ID is required' },
        { status: 400 }
      );
    }
    
    // Fetch workspace members
    const { data: members, error } = await supabase
      .from('workspace_members')
      .select('workspace_id, user_id, role')
      .eq('workspace_id', workspaceId);
    
    if (error) {
      console.error('Error fetching workspace members:', error);
      return NextResponse.json(
        { error: 'Failed to fetch workspace members' },
        { status: 500 }
      );
    }
    
    // Format the members data
    const formattedMembers = members.map(member => ({
      composite_id: `${member.workspace_id}-${member.user_id}`,
      user_id: member.user_id,
      email: 'User ID: ' + member.user_id.substring(0, 8) + '...',
      role: member.role,
      created_at: new Date().toISOString()
    }));
    
    // Try to fetch emails
    for (const member of formattedMembers) {
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('email')
          .eq('id', member.user_id)
          .single();
        
        if (!userError && userData) {
          member.email = userData.email;
        }
      } catch (emailError) {
        console.error('Error fetching user email:', emailError);
      }
    }
    
    return NextResponse.json({ members: formattedMembers });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}