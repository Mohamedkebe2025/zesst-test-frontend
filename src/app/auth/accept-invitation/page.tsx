'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button, Form, Input, Card, Typography, Alert, Spin } from 'antd';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;

// Client-side only component to prevent hydration errors
function ClientOnly({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient ? <>{children}</> : null;
}

export default function AcceptInvitation() {
  // Initialize form outside of render to prevent hydration mismatch
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [redirectUrl, setRedirectUrl] = useState<string>('');

  const router = useRouter();
  const searchParams = useSearchParams();

  // Set redirect URL on client-side only
  useEffect(() => {
    // Only run in browser environment
    if (typeof window !== 'undefined') {
      setRedirectUrl(`${window.location.origin}/login`);
    }
  }, []);

  // Extract invitation data from URL
  useEffect(() => {
    const email = searchParams.get('email');
    const workspaceId = searchParams.get('workspace_id');
    const inviteRole = searchParams.get('invite_role');
    const workspaceName = searchParams.get('workspace_name');

    if (email && workspaceId) {
      setInvitationData({
        email,
        workspaceId,
        inviteRole: inviteRole || 'member',
        workspaceName: workspaceName || 'Workspace'
      });

      // Set email in form
      form.setFieldsValue({ email });
    } else {
      setError('Invalid invitation link. Missing required parameters.');
    }
  }, [searchParams, form]);

  const onFinish = async (values: { email: string; password: string; confirmPassword: string }) => {
    if (!invitationData) {
      setError('Invalid invitation data');
      return;
    }

    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Accepting invitation for:', values.email);

      // Register the user with Supabase
      // Note: Supabase is configured with mailer_autoconfirm=true, so emails are automatically confirmed
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            workspace_id: invitationData.workspaceId,
            invite_role: invitationData.inviteRole,
            workspace_name: invitationData.workspaceName,
            invitation_accepted: false
          },
          // Use the redirectUrl state that's set client-side only
          emailRedirectTo: redirectUrl
        }
      });

      // Log the signup response for debugging
      console.log('Supabase signUp response:', JSON.stringify(data, null, 2));

      if (signUpError) {
        throw signUpError;
      }

      console.log('User registration successful:', data);

      // Store the user ID and workspace info in localStorage for later use
      // after email confirmation
      if (typeof window !== 'undefined' && data.user) {
        localStorage.setItem('pending_confirmation_user_id', data.user.id);
        localStorage.setItem('pending_confirmation_workspace_id', invitationData.workspaceId);
        localStorage.setItem('pending_confirmation_email', values.email);
      }

      // We're NOT manually confirming the email here anymore
      // Let Supabase send the confirmation email
      console.log('Waiting for email confirmation from Supabase...');

      // Update invitation status in database
      const { error: inviteError } = await supabase
        .from('workspace_invitations')
        .update({
          status: 'accepted',
          accepted_at: new Date().toISOString()
        })
        .eq('workspace_id', invitationData.workspaceId)
        .eq('email', values.email);

      if (inviteError) {
        console.error('Error updating invitation:', inviteError);
      }

      // Show success message
      setSuccess(true);

      // Don't automatically redirect to login page
      // The user needs to check their email for confirmation first
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      setError(error.message || 'Failed to accept invitation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <Title level={3} className="text-center mb-6">Accept Invitation</Title>

        <ClientOnly>
          {invitationData && (
            <div className="mb-6">
              <Text>
                You've been invited to join <strong>{invitationData.workspaceName}</strong> as a <strong>{invitationData.inviteRole}</strong>.
              </Text>
            </div>
          )}

          {error && (
            <Alert
              message="Error"
              description={error}
              type="error"
              showIcon
              className="mb-4"
            />
          )}

          {success ? (
            <div>
              <Alert
                message="Success"
                description={
                  <div>
                    <p>Your account has been created successfully!</p>
                    <p>You can now <strong>log in</strong> with your email and password to access your workspace.</p>
                    <p>You may receive a welcome email from the system, but you don't need to wait for it to log in.</p>
                  </div>
                }
                type="success"
                showIcon
                className="mb-4"
              />
              <Button
                type="primary"
                className="w-full mt-4"
                onClick={() => router.push('/login')}
              >
                Go to Login Page
              </Button>
            </div>
          ) : (
            <Form
              form={form}
              name="accept-invitation"
              layout="vertical"
              onFinish={onFinish}
              disabled={loading}
            >
              <Form.Item
                name="email"
                label="Email"
                rules={[{ required: true, message: 'Please input your email!' }]}
              >
                <Input disabled />
              </Form.Item>

              <Form.Item
                name="password"
                label="Password"
                rules={[
                  { required: true, message: 'Please input your password!' },
                  { min: 8, message: 'Password must be at least 8 characters' }
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="Confirm Password"
                rules={[
                  { required: true, message: 'Please confirm your password!' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('The two passwords do not match!'));
                    },
                  }),
                ]}
              >
                <Input.Password />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="w-full"
                  loading={loading}
                >
                  Accept Invitation
                </Button>
              </Form.Item>
            </Form>
          )}

          {loading && (
            <div className="flex justify-center mt-4">
              <Spin />
            </div>
          )}
        </ClientOnly>
      </Card>
    </div>
  );
}