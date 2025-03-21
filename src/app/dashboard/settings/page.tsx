'use client';

import React, { useState } from 'react';
import { 
  Typography, 
  Card, 
  Form, 
  Switch, 
  Button, 
  Select,
  message,
  Divider
} from 'antd';
import { SaveOutlined, BellOutlined, EyeOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

export default function SettingsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  // Save notification settings
  const handleSaveNotificationSettings = async (values: any) => {
    setLoading(true);
    try {
      // For simplicity, we're just showing a placeholder implementation
      // In a real implementation, you would save the user's settings in the database
      message.success('Notification settings saved successfully');
    } catch (error) {
      console.error('Error saving notification settings:', error);
      message.error('Failed to save notification settings');
    } finally {
      setLoading(false);
    }
  };

  // Save appearance settings
  const handleSaveAppearanceSettings = async (values: any) => {
    setLoading(true);
    try {
      // For simplicity, we're just showing a placeholder implementation
      // In a real implementation, you would save the user's settings in the database
      message.success('Appearance settings saved successfully');
    } catch (error) {
      console.error('Error saving appearance settings:', error);
      message.error('Failed to save appearance settings');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div>
      <Title level={2}>Settings</Title>
      <Text className="text-gray-500 mb-6 block">
        Configure your application settings.
      </Text>

      <div className="grid grid-cols-1 gap-6">
        <Card title="Notification Settings" extra={<BellOutlined />}>
          <Form
            layout="vertical"
            onFinish={handleSaveNotificationSettings}
            initialValues={{
              emailNotifications: true,
              workspaceUpdates: true,
              memberJoins: true,
              securityAlerts: true,
            }}
          >
            <Form.Item
              name="emailNotifications"
              label="Email Notifications"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="workspaceUpdates"
              label="Workspace Updates"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="memberJoins"
              label="New Member Joins"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item
              name="securityAlerts"
              label="Security Alerts"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                Save Notification Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>

        <Card title="Appearance Settings" extra={<EyeOutlined />}>
          <Form
            layout="vertical"
            onFinish={handleSaveAppearanceSettings}
            initialValues={{
              theme: 'light',
              language: 'en',
            }}
          >
            <Form.Item
              name="theme"
              label="Theme"
            >
              <Select>
                <Option value="light">Light</Option>
                <Option value="dark">Dark</Option>
                <Option value="system">System Default</Option>
              </Select>
            </Form.Item>
            <Form.Item
              name="language"
              label="Language"
            >
              <Select>
                <Option value="en">English</Option>
                <Option value="fr">French</Option>
                <Option value="es">Spanish</Option>
                <Option value="de">German</Option>
              </Select>
            </Form.Item>
            <Form.Item>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={loading}
                icon={<SaveOutlined />}
              >
                Save Appearance Settings
              </Button>
            </Form.Item>
          </Form>
        </Card>
      </div>
    </div>
  );
}