// Script to clean up users and their records
// Keeps only testsuperadmin@example.com, iluvers.kebe@gmail.com, and kebe.maieutic@gmail.com

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanupUsers() {
  console.log('Starting user cleanup...');
  
  // List of emails to keep
  const emailsToKeep = [
    'testsuperadmin@example.com',
    'iluvers.kebe@gmail.com',
    'kebe.maieutic@gmail.com'
  ];
  
  try {
    // Get all users
    console.log('Fetching users...');
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }
    
    console.log(`Found ${users.users.length} total users`);
    
    // Filter users to delete (those not in the keep list)
    const usersToDelete = users.users.filter(user => 
      !emailsToKeep.includes(user.email)
    );
    
    console.log(`Found ${usersToDelete.length} users to delete`);
    
    // Get IDs of users to delete
    const userIdsToDelete = usersToDelete.map(user => user.id);
    
    if (userIdsToDelete.length === 0) {
      console.log('No users to delete. Exiting.');
      return;
    }
    
    // Delete related records first
    console.log('Deleting workspace members records...');
    const { error: membersError } = await supabase
      .from('workspace_members')
      .delete()
      .in('user_id', userIdsToDelete);
    
    if (membersError) {
      console.error('Error deleting workspace members:', membersError);
    } else {
      console.log('Workspace members deleted successfully');
    }
    
    // Delete user roles
    console.log('Deleting user roles...');
    const { error: rolesError } = await supabase
      .from('user_roles')
      .delete()
      .in('user_id', userIdsToDelete);
    
    if (rolesError) {
      console.error('Error deleting user roles:', rolesError);
    } else {
      console.log('User roles deleted successfully');
    }
    
    // Delete workspace invitations
    console.log('Deleting workspace invitations...');
    const { error: invitationsError } = await supabase
      .from('workspace_invitations')
      .delete()
      .not('email', 'in', `(${emailsToKeep.map(email => `'${email}'`).join(',')})`);
    
    if (invitationsError) {
      console.error('Error deleting workspace invitations:', invitationsError);
    } else {
      console.log('Workspace invitations deleted successfully');
    }
    
    // Delete users one by one
    console.log('Deleting users...');
    for (const userId of userIdsToDelete) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
      
      if (deleteError) {
        console.error(`Error deleting user ${userId}:`, deleteError);
      } else {
        console.log(`User ${userId} deleted successfully`);
      }
    }
    
    console.log('User cleanup completed successfully');
  } catch (error) {
    console.error('Error during cleanup:', error);
  }
}

// Run the cleanup
cleanupUsers();