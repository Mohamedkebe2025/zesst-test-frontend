'use client';

import React from 'react';
import { Typography, Card, Tabs, Divider, Alert, Space } from 'antd';
import SecureForm from '@/components/SecureForm';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

/**
 * SecurityDemo page showcases the security improvements made to the application
 */
export default function SecurityDemoPage() {
  return (
    <div className="container mx-auto py-8 px-4">
      <Title level={2} className="mb-6">Security Improvements Demo</Title>
      
      <Alert
        message="Security Notice"
        description="This page demonstrates the security improvements made to the application. It is for demonstration purposes only."
        type="info"
        showIcon
        className="mb-6"
      />
      
      <Tabs defaultActiveKey="1" items={[
        {
          key: '1',
          label: 'Secure Form Demo',
          children: (
            <div className="py-4">
              <Paragraph className="mb-4">
                This form demonstrates input validation and sanitization to prevent XSS attacks and other security vulnerabilities.
                Try submitting the form with invalid inputs to see the validation in action.
              </Paragraph>
              
              <SecureForm />
            </div>
          )
        },
        {
          key: '2',
          label: 'Security Headers',
          children: (
            <div className="py-4">
              <Paragraph className="mb-4">
                We've added the following security headers to the application:
              </Paragraph>
              
              <Card className="mb-4">
                <Space direction="vertical">
                  <Text strong>X-DNS-Prefetch-Control:</Text>
                  <Text>Controls DNS prefetching, which can improve performance but may leak information.</Text>
                  
                  <Divider />
                  
                  <Text strong>Strict-Transport-Security:</Text>
                  <Text>Forces browsers to use HTTPS for the website.</Text>
                  
                  <Divider />
                  
                  <Text strong>X-XSS-Protection:</Text>
                  <Text>Enables the browser's built-in XSS filter.</Text>
                  
                  <Divider />
                  
                  <Text strong>X-Frame-Options:</Text>
                  <Text>Prevents the page from being displayed in an iframe, protecting against clickjacking.</Text>
                  
                  <Divider />
                  
                  <Text strong>Permissions-Policy:</Text>
                  <Text>Controls which browser features and APIs can be used.</Text>
                  
                  <Divider />
                  
                  <Text strong>X-Content-Type-Options:</Text>
                  <Text>Prevents browsers from MIME-sniffing a response from the declared content-type.</Text>
                  
                  <Divider />
                  
                  <Text strong>Referrer-Policy:</Text>
                  <Text>Controls how much referrer information is included with requests.</Text>
                  
                  <Divider />
                  
                  <Text strong>Content-Security-Policy:</Text>
                  <Text>Helps prevent XSS attacks by specifying which dynamic resources are allowed to load.</Text>
                </Space>
              </Card>
              
              <Alert
                message="How to Verify"
                description="You can verify these headers are working by opening the browser's developer tools, going to the Network tab, and inspecting the response headers for any request."
                type="success"
                showIcon
              />
            </div>
          )
        },
        {
          key: '3',
          label: 'Security Utilities',
          children: (
            <div className="py-4">
              <Paragraph className="mb-4">
                We've added the following security utilities to the application:
              </Paragraph>
              
              <Card title="Input Sanitization" className="mb-4">
                <Paragraph>
                  The <Text code>sanitize.ts</Text> utility provides functions to sanitize user input and prevent XSS attacks:
                </Paragraph>
                
                <ul className="list-disc pl-6 mb-4">
                  <li><Text code>sanitizeString</Text>: Escapes HTML special characters in strings</li>
                  <li><Text code>sanitizeObject</Text>: Recursively sanitizes all string values in an object</li>
                  <li><Text code>sanitizeUserContent</Text>: Sanitizes user-generated content before rendering</li>
                  <li><Text code>sanitizeUrl</Text>: Validates and sanitizes URLs to prevent javascript: protocol exploits</li>
                </ul>
              </Card>
              
              <Card title="Secure Authentication" className="mb-4">
                <Paragraph>
                  The <Text code>secureAuth.ts</Text> utility provides more secure token handling:
                </Paragraph>
                
                <ul className="list-disc pl-6 mb-4">
                  <li>In-memory token storage instead of localStorage</li>
                  <li>Token expiration checking</li>
                  <li>Secure token parsing</li>
                  <li>Token refresh functionality</li>
                </ul>
              </Card>
              
              <Card title="Input Validation" className="mb-4">
                <Paragraph>
                  The <Text code>inputValidation.ts</Text> utility provides functions to validate user input:
                </Paragraph>
                
                <ul className="list-disc pl-6 mb-4">
                  <li>Email validation</li>
                  <li>Password strength validation</li>
                  <li>Username validation</li>
                  <li>URL validation</li>
                  <li>Workspace name validation</li>
                  <li>SQL injection detection</li>
                  <li>XSS attack vector detection</li>
                </ul>
              </Card>
            </div>
          )
        }
      ]} />
    </div>
  );
}