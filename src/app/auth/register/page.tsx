'use client';

import React, { useState, useEffect } from 'react';
import { Typography, Form, Input, Button, Card, Alert, Spin } from 'antd';
import { useRouter, useSearchParams } from 'next/navigation';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;

const RegisterPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [initializing, setInitializing] = useState(true);
  const [invitationData, setInvitationData] = useState<{
    email: string | null;
    workspaceId: string | null;
    inviteRole: string | null;
    workspaceName: string | null;
  }>({
    email: null,
    workspaceId: null,
    inviteRole: null,
    workspaceName: null,
  });

  // Extract invitation parameters from URL
  useEffect(() => {
    const email = searchParams.get('email');
    const workspaceId = searchParams.get('workspace_id');
    const inviteRole = searchParams.get('invite_role');
    const workspaceName = searchParams.get('workspace_name');

    setInvitationData({
      email,
      workspaceId,
      inviteRole,
      workspaceName,
    });

    // Set the email field value
    if (email) {
      form.setFieldsValue({ email });
    }

    // Store the invitation data in localStorage for later use
    if (typeof window !== 'undefined') {
      localStorage.setItem('is_registration_page', 'true');
      
      if (email) localStorage.setItem('pending_invitation_email', email);
      if (workspaceId) localStorage.setItem('pending_invitation_workspace_id', workspaceId);
      if (inviteRole) localStorage.setItem('pending_invitation_role', inviteRole);
      if (workspaceName) localStorage.setItem('pending_invitation_workspace_name', workspaceName);
      
      // Set process_pending_invitation flag for the AuthContext to process
      localStorage.setItem('process_pending_invitation', 'true');
    }

    // Set initializing to false after a short delay to ensure the form is properly rendered
    setTimeout(() => {
      setInitializing(false);
    }, 300);

    // Cleanup function
    return () => {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('is_registration_page');
      }
    };
  }, [searchParams, form]);

  // Handle form submission
  const handleSubmit = async (values: { email: string; password: string; confirmPassword: string }) => {
    // Validate that passwords match
    if (values.password !== values.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('Registration attempt for email:', values.email);
      console.log('Invitation data:', invitationData);
      
      // Register the user
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            workspace_id: invitationData.workspaceId,
            invite_role: invitationData.inviteRole,
            workspace_name: invitationData.workspaceName,
            invitation_accepted: true
            // Removed email_verified: true to let Supabase handle email verification properly
          },
          emailRedirectTo: `${window.location.origin}/login`,
        }
      });
      
      console.log('Sign up response:', data);
      console.log('User metadata after signup:', data?.user?.user_metadata);

      if (signUpError) {
        // If the error is about the user already existing, try to sign in
        if (signUpError.message.includes('already registered')) {
          console.log('User already exists, trying to sign in');
          
          // Try to sign in with the provided credentials
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email: values.email,
            password: values.password,
          });
          
          if (signInError) {
            throw new Error('This email is already registered. Please use the correct password or reset your password.');
          }
          
          // If sign-in succeeds, redirect to dashboard
          setSuccess(true);
          setTimeout(() => {
            router.push('/dashboard');
          }, 1000);
          return;
        }
        
        throw signUpError;
      }

      // Check if the user was created successfully
      if (!data || !data.user) {
        throw new Error('Failed to create user account');
      }

      console.log('Registration successful:', data);

      // Try to sign in immediately after registration
      try {
        console.log('Attempting auto sign-in after registration');
        
        // Get current session state before sign-in
        const { data: sessionData } = await supabase.auth.getSession();
        console.log('Session before auto sign-in:', sessionData);
        
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
        
        if (signInError) {
          console.log('Auto sign-in failed:', signInError);
          
          // If sign-in fails, show a success message and redirect to login page
          setSuccess(true);
          setError('Your account has been created. Please sign in with your email and password.');
          
          // Redirect to login page after a short delay
          setTimeout(() => {
            router.push('/login');
          }, 2000);
        } else {
          console.log('Auto sign-in successful:', signInData);
          console.log('User metadata after auto sign-in:', signInData?.user?.user_metadata);
          
          // If sign-in succeeds, redirect to dashboard
          router.push('/dashboard');
        }
      } catch (signInError) {
        console.error('Error during auto sign-in:', signInError);
        
        // If sign-in fails, show a success message and redirect to login page
        setSuccess(true);
        setError('Your account has been created. Please sign in with your email and password.');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      }
    } catch (error) {
      console.error('Registration error:', error);
      setError(error instanceof Error ? error.message : 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while initializing
  if (initializing) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Spin size="large" />
      </div>
    );
  }

  // If we don't have the required parameters, show an error
  if (!invitationData.email || !invitationData.workspaceId) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <Card className="w-full max-w-md">
          <Alert
            message="Invalid Invitation"
            description="This invitation link is invalid or has expired. Please contact the workspace administrator for a new invitation."
            type="error"
            showIcon
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <Title level={2}>Complete Your Registration</Title>
          <Text>
            You've been invited to join {invitationData.workspaceName || 'a workspace'} as {invitationData.inviteRole || 'a member'}.
          </Text>
        </div>

        {error && (
          <Alert
            message={success ? "Registration Successful" : "Registration Error"}
            description={error}
            type={success ? "success" : "error"}
            showIcon
            className="mb-4"
          />
        )}

        {success && !error && (
          <Alert
            message="Registration Successful"
            description="Your account has been created successfully. You will be redirected to the login page."
            type="success"
            showIcon
            className="mb-4"
          />
        )}

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          disabled={loading || success}
        >
          <Form.Item
            name="email"
            label="Email"
            rules={[
              { required: true, message: 'Please enter your email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input disabled />
          </Form.Item>

          <Form.Item
            name="password"
            label="Password"
            rules={[
              { required: true, message: 'Please enter your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
            ]}
          >
            <Input.Password />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm Password"
            rules={[
              { required: true, message: 'Please confirm your password' },
              { min: 6, message: 'Password must be at least 6 characters' }
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
              Complete Registration
            </Button>
          </Form.Item>
        </Form>

        <div className="text-center mt-4">
          <Text>
            Already have an account?{' '}
            <a href="/login" className="text-blue-500">
              Sign in
            </a>
          </Text>
        </div>
      </Card>
    </div>
  );
};

export default RegisterPage;