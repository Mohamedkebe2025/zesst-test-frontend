'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Form, Input, Button, Card, Typography, message, Alert } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();

  // Check for pending invitations in localStorage and URL parameters
  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Check localStorage
    const shouldProcessInvitation = localStorage.getItem('process_pending_invitation') === 'true';
    const workspaceId = localStorage.getItem('pending_workspace_id') ||
      localStorage.getItem('pending_invitation_workspace_id');
    const inviteRole = localStorage.getItem('pending_invite_role') ||
      localStorage.getItem('pending_invitation_role');

    console.log('Login page - Checking for pending invitations:');
    console.log('localStorage - shouldProcessInvitation:', shouldProcessInvitation);
    console.log('localStorage - workspaceId:', workspaceId);
    console.log('localStorage - inviteRole:', inviteRole);

    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isInvitation = urlParams.get('invitation') === 'true';
    const urlWorkspaceId = urlParams.get('workspace_id');

    console.log('URL parameters - isInvitation:', isInvitation);
    console.log('URL parameters - workspaceId:', urlWorkspaceId);

    // If we have invitation parameters in the URL, store them in localStorage
    if (isInvitation && urlWorkspaceId) {
      localStorage.setItem('process_pending_invitation', 'true');
      localStorage.setItem('pending_workspace_id', urlWorkspaceId);
      const urlRole = urlParams.get('invite_role');
      if (urlRole) {
        localStorage.setItem('pending_invite_role', urlRole);
      }
    }
  }, []);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);

    try {
      console.log('Login attempt for email:', values.email);

      // We can't use admin API on the client side, so we'll just log the login attempt
      console.log('Attempting to sign in with provided credentials');

      // First, try to sign in
      const { error: signInError } = await signIn(values.email, values.password);

      if (signInError) {
        console.error('Sign in error:', signInError);
        setError('Invalid email or password');
        return;
      }

      // If sign-in is successful, check for both regular invitations and confirmed email invitations
      let shouldProcessInvitation = false;
      let workspaceId = null;
      let inviteRole = 'member';
      let pendingConfirmationUserId = null;
      let pendingConfirmationEmail = null;

      // Only access localStorage in browser environment
      if (typeof window !== 'undefined') {
        // Check for regular invitations
        shouldProcessInvitation = localStorage.getItem('process_pending_invitation') === 'true';
        workspaceId = localStorage.getItem('pending_workspace_id') ||
          localStorage.getItem('pending_invitation_workspace_id');
        inviteRole = localStorage.getItem('pending_invite_role') ||
          localStorage.getItem('pending_invitation_role') ||
          'member';

        // Check for pending confirmation data from the accept-invitation page
        pendingConfirmationUserId = localStorage.getItem('pending_confirmation_user_id');
        pendingConfirmationEmail = localStorage.getItem('pending_confirmation_email');
        const pendingConfirmationWorkspaceId = localStorage.getItem('pending_confirmation_workspace_id');

        // If we have pending confirmation data and it matches the current user's email,
        // use that instead of the regular invitation data
        if (pendingConfirmationEmail === values.email && pendingConfirmationWorkspaceId) {
          console.log('Found pending confirmation data for this user');
          shouldProcessInvitation = true;
          workspaceId = pendingConfirmationWorkspaceId;
        }
      }

      if (shouldProcessInvitation && workspaceId) {
        console.log(`Processing invitation for workspace ${workspaceId} with role ${inviteRole}`);

        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          console.error('No user found after sign-in');
          router.push('/dashboard');
          return;
        }

        // Check if we have pending confirmation data from the accept-invitation page
        if (pendingConfirmationUserId && pendingConfirmationEmail === values.email) {
          console.log('Processing confirmed email invitation');

          // Call the confirm-email API to add the user to the workspace
          const confirmResponse = await fetch('/api/auth/confirm-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: values.email,
              userId: user.id
            }),
          });

          if (!confirmResponse.ok) {
            const errorData = await confirmResponse.json();
            console.error('Error processing workspace membership:', errorData);
          } else {
            console.log('Successfully processed workspace membership');
          }
        } else {
          // Regular invitation processing
          // Check if the user is already a member of this workspace
          const { data: existingMember, error: checkError } = await supabase
            .from('workspace_members')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('user_id', user.id)
            .single();

          if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 means no rows found, which is expected if the user is not a member
            console.error('Error checking if user is already a member:', checkError);
          }

          // If the user is already a member, we don't need to do anything
          if (existingMember) {
            console.log(`User ${user.id} is already a member of workspace ${workspaceId}`);
          } else {
            console.log(`Adding user ${user.id} to workspace ${workspaceId} with role ${inviteRole}`);

            // Add the user to the workspace
            const { error: memberError } = await supabase
              .from('workspace_members')
              .insert([
                {
                  workspace_id: workspaceId,
                  user_id: user.id,
                  role: inviteRole
                }
              ]);

            if (memberError) {
              console.error('Error adding user to workspace:', memberError);
            } else {
              console.log(`Successfully added user ${user.id} to workspace ${workspaceId}`);

              // Update the invitation status to accepted
              const { error: invitationError } = await supabase
                .from('workspace_invitations')
                .update({
                  status: 'accepted',
                  accepted_at: new Date().toISOString()
                })
                .eq('workspace_id', workspaceId)
                .eq('email', user.email);

              if (invitationError) {
                console.error('Error updating invitation status:', invitationError);
              }
            }
          }
        }

        // Clear the pending invitation flags and confirmation data
        if (typeof window !== 'undefined') {
          // Clear regular invitation data
          localStorage.removeItem('process_pending_invitation');
          localStorage.removeItem('pending_workspace_id');
          localStorage.removeItem('pending_invitation_workspace_id');
          localStorage.removeItem('pending_invite_role');
          localStorage.removeItem('pending_invitation_role');

          // Clear confirmation data
          localStorage.removeItem('pending_confirmation_user_id');
          localStorage.removeItem('pending_confirmation_email');
          localStorage.removeItem('pending_confirmation_workspace_id');
        }
      }

      // Redirect to dashboard on successful login
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="text-center mb-6">
          <Title level={2} className="mb-2">ZESST Platform</Title>
          <Text className="text-gray-500">Login to your account</Text>
        </div>

        {error && (
          <Alert
            message="Login Error"
            description={error}
            type="error"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          name="login"
          initialValues={{ remember: true }}
          onFinish={onFinish}
          layout="vertical"
          size="large"
        >
          <Form.Item
            name="email"
            rules={[
              { required: true, message: 'Please input your email!' },
              { type: 'email', message: 'Please enter a valid email address!' }
            ]}
          >
            <Input
              prefix={<UserOutlined className="text-gray-400" />}
              placeholder="Email"
              autoComplete="email"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined className="text-gray-400" />}
              placeholder="Password"
              autoComplete="current-password"
            />
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              className="w-full"
              loading={loading}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text className="text-gray-500 text-sm">
            This login form uses Supabase authentication with
            Ant Design 5.15.0, React 18.2.0, and Next.js 14.2.24.
          </Text>
        </div>
      </Card>
    </div>
  );
}