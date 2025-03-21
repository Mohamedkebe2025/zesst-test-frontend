'use client';

import React, { useState } from 'react';
import {
  Typography,
  Card,
  Form,
  Input,
  Button,
  Divider,
  message,
  Avatar,
  Tag
} from 'antd';
import { UserOutlined, LockOutlined, SaveOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;

export default function ProfilePage() {
  const { user, userRole } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [form] = Form.useForm();

  // Update profile
  const handleUpdateProfile = async (values: { name: string, jobTitle: string }) => {
    setProfileLoading(true);
    try {
      // Update the user's metadata in Supabase
      const { data, error } = await supabase.auth.updateUser({
        data: {
          name: values.name,
          full_name: values.name,
          job_title: values.jobTitle
        }
      });

      if (error) {
        throw error;
      }

      // Update the user object in the AuthContext
      if (user) {
        user.user_metadata = {
          ...user.user_metadata,
          name: values.name,
          full_name: values.name,
          job_title: values.jobTitle
        };
      }

      message.success('Profile updated successfully');

      // Reset the form to clear any validation states
      // This helps ensure the button returns to its normal state
      form.resetFields(['name', 'jobTitle']);
      form.setFieldsValue({
        name: values.name,
        jobTitle: values.jobTitle
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      message.error('Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Change password
  const handleChangePassword = async (values: { currentPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      // Update the user's password in Supabase
      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) {
        throw error;
      }

      message.success('Password changed successfully');
      form.resetFields(['currentPassword', 'newPassword', 'confirmPassword']);
    } catch (error) {
      console.error('Error changing password:', error);
      message.error('Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <Title level={2}>Profile</Title>
      <Text className="text-gray-500 mb-6 block">
        View and update your profile information.
      </Text>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="User Information">
          <div className="flex items-center mb-6">
            <Avatar size={64} icon={<UserOutlined />} className="mr-4" />
            <div>
              <Text strong className="text-lg block">{user.user_metadata?.name || user.user_metadata?.full_name || 'Set your name'}</Text>
              <Text className="text-sm text-gray-500 block">{user.email}</Text>
              <Text className="text-sm text-gray-500 block">{user.user_metadata?.job_title || 'No job title set'}</Text>
              <Tag color={
                userRole === 'superadmin' ? 'blue' :
                  userRole === 'admin' ? 'green' :
                    'default'
              }>
                {userRole?.toUpperCase() || 'MEMBER'}
              </Tag>
            </div>
          </div>

          <Form
            form={form}
            layout="vertical"
            onFinish={handleUpdateProfile}
            initialValues={{
              email: user.email,
              name: user.user_metadata?.name || '',
              jobTitle: user.user_metadata?.job_title || '',
            }}
          >
            <Form.Item
              name="email"
              label="Email"
            >
              <Input disabled />
            </Form.Item>
            <Form.Item
              name="name"
              label="Name"
              rules={[{ required: true, message: 'Please enter your name' }]}
            >
              <Input />
            </Form.Item>
            <Form.Item
              name="jobTitle"
              label="Job Title"
              rules={[{ required: true, message: 'Please enter your job title' }]}
            >
              <Input placeholder="e.g. Software Engineer, Product Manager, etc." />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={profileLoading}
                icon={<SaveOutlined />}
              >
                Update Profile
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Change Password">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              name="currentPassword"
              label="Current Password"
              rules={[{ required: true, message: 'Please enter your current password' }]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              name="newPassword"
              label="New Password"
              rules={[
                { required: true, message: 'Please enter your new password' },
                { min: 8, message: 'Password must be at least 8 characters' }
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item
              name="confirmPassword"
              label="Confirm New Password"
              dependencies={['newPassword']}
              rules={[
                { required: true, message: 'Please confirm your new password' },
                ({ getFieldValue }) => ({
                  validator(_, value) {
                    if (!value || getFieldValue('newPassword') === value) {
                      return Promise.resolve();
                    }
                    return Promise.reject(new Error('The two passwords do not match'));
                  },
                }),
              ]}
            >
              <Input.Password prefix={<LockOutlined />} />
            </Form.Item>
            <Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={passwordLoading}
              >
                Change Password
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}