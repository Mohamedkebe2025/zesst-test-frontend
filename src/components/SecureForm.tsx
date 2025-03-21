'use client';

import React, { useState } from 'react';
import { Form, Input, Button, Alert, Typography } from 'antd';
import { 
  isValidEmail, 
  validatePassword, 
  validateUsername,
  isXssSafe
} from '@/utils/inputValidation';
import { sanitizeString } from '@/utils/sanitize';

const { Title } = Typography;

interface FormValues {
  username: string;
  email: string;
  password: string;
  bio: string;
}

/**
 * SecureForm component demonstrates how to use the security utilities
 * for input validation and sanitization in a form
 */
const SecureForm: React.FC = () => {
  const [form] = Form.useForm();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = (values: FormValues) => {
    // Reset messages
    setError(null);
    setSuccess(null);
    
    // Validate email
    if (!isValidEmail(values.email)) {
      setError('Please enter a valid email address');
      return;
    }
    
    // Validate password
    const passwordValidation = validatePassword(values.password);
    if (!passwordValidation.isValid) {
      setError(passwordValidation.message);
      return;
    }
    
    // Validate username
    const usernameValidation = validateUsername(values.username);
    if (!usernameValidation.isValid) {
      setError(usernameValidation.message);
      return;
    }
    
    // Check for XSS in bio
    if (!isXssSafe(values.bio)) {
      setError('Bio contains potentially unsafe content');
      return;
    }
    
    // Sanitize inputs before processing
    const sanitizedValues = {
      username: sanitizeString(values.username),
      email: sanitizeString(values.email),
      password: values.password, // Don't sanitize password as it might contain special characters
      bio: sanitizeString(values.bio),
    };
    
    // Process the form (in a real app, this would submit to an API)
    console.log('Form submitted with sanitized values:', sanitizedValues);
    
    // Show success message
    setSuccess('Form submitted successfully!');
    
    // Reset form
    form.resetFields();
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded shadow-md">
      <Title level={3} className="mb-6">Secure Registration Form</Title>
      
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          showIcon
          className="mb-4"
        />
      )}
      
      {success && (
        <Alert
          message="Success"
          description={success}
          type="success"
          showIcon
          className="mb-4"
        />
      )}
      
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[{ required: true, message: 'Please enter your username' }]}
        >
          <Input placeholder="Enter username" />
        </Form.Item>
        
        <Form.Item
          name="email"
          label="Email"
          rules={[{ required: true, message: 'Please enter your email' }]}
        >
          <Input placeholder="Enter email" />
        </Form.Item>
        
        <Form.Item
          name="password"
          label="Password"
          rules={[{ required: true, message: 'Please enter your password' }]}
          extra="Password must be at least 8 characters with uppercase, lowercase, number, and special character"
        >
          <Input.Password placeholder="Enter password" />
        </Form.Item>
        
        <Form.Item
          name="bio"
          label="Bio"
          extra="Tell us about yourself (no HTML allowed)"
        >
          <Input.TextArea rows={4} placeholder="Enter bio" />
        </Form.Item>
        
        <Form.Item>
          <Button type="primary" htmlType="submit" className="w-full">
            Register
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
};

export default SecureForm;