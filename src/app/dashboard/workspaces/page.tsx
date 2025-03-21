'use client';

import React, { useState } from 'react';
import {
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Tabs,
  message,
  Spin
} from 'antd';
import {
  PlusOutlined,
  DeleteOutlined,
  UserAddOutlined,
  MailOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const { Title, Text } = Typography;

// Define types for workspace and invitation
interface Workspace {
  id: string;
  name: string;
  created_at: string;
  is_default: boolean;
  is_superadmin_workspace: boolean;
  admin_name?: string;
  admin_email?: string;
  member_count?: number;
}

interface Invitation {
  id: string;
  workspace_id: string;
  email: string;
  role: string;
  created_at: string;
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  accepted_at: string | null;
  registration_link: string | null;
  workspace_name?: string;
  workspaces?: {
    name: string;
  };
}

export default function WorkspacesPage() {
  const { userRole } = useAuth();
  const {
    workspaces,
    invitations,
    loading,
    createWorkspace,
    deleteWorkspace,
    inviteAdmin,
    resendInvitation,
    cancelInvitation,
    switchWorkspace,
    workspaceMemberships
  } = useWorkspace();

  const [createModalVisible, setCreateModalVisible] = useState<boolean>(false);
  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null);
  const [createForm] = Form.useForm();
  const [inviteForm] = Form.useForm();

  // Create a new workspace
  const handleCreateWorkspace = async (values: { name: string }) => {
    const result = await createWorkspace(values.name);

    if (result.success) {
      message.success('Workspace created successfully');
      createForm.resetFields();
      setCreateModalVisible(false);
    } else {
      message.error('Failed to create workspace');
    }
  };

  // Invite an admin to a workspace
  const handleInviteAdmin = async (values: { email: string; workspace_id: string }) => {
    const result = await inviteAdmin(values.email, values.workspace_id);

    if (result.success) {
      message.success('Invitation sent successfully');
      inviteForm.resetFields();
      setInviteModalVisible(false);
    } else {
      message.error(result.error || 'Failed to invite admin');
    }
  };

  // Delete a workspace
  const handleDeleteWorkspace = async (workspaceId: string) => {
    const result = await deleteWorkspace(workspaceId);

    if (result.success) {
      message.success('Workspace deleted successfully');
    } else {
      if (typeof result.error === 'string') {
        message.error(result.error);
      } else {
        message.error('Failed to delete workspace');
      }
    }
  };

  // Resend invitation
  const handleResendInvitation = async (invitationId: string) => {
    const result = await resendInvitation(invitationId);

    if (result.success) {
      message.success('Invitation resent successfully');
    } else {
      message.error('Failed to resend invitation');
    }
  };

  // Cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    const result = await cancelInvitation(invitationId);

    if (result.success) {
      message.success('Invitation cancelled successfully');
    } else {
      message.error('Failed to cancel invitation');
    }
  };

  // Workspace table columns
  const workspaceColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      width: 150,
      ellipsis: true,
      fixed: 'left' as const,
      render: (text: string, record: Workspace) => {
        // Find the corresponding membership
        const membership = workspaceMemberships.find(m => m.workspaceId === record.id);
        
        return (
          <Button
            type="link"
            onClick={() => {
              if (membership) {
                switchWorkspace(membership.workspaceId);
                window.location.href = '/dashboard'; // Redirect to dashboard after switching
              }
            }}
            disabled={!membership}
            style={{ padding: 0, height: 'auto' }}
          >
            {text}
          </Button>
        );
      },
    },
    {
      title: 'Admin Name',
      dataIndex: 'admin_name',
      key: 'admin_name',
      render: (text: string) => text || 'Admin Not Assigned',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Admin Email',
      dataIndex: 'admin_email',
      key: 'admin_email',
      render: (text: string) => (
        <div className="text-gray-500">{text || 'No email available'}</div>
      ),
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Members',
      dataIndex: 'member_count',
      key: 'member_count',
      render: (count: number) => (
        <Tag color="blue">{count || 0}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Created At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      width: 180,
    },
    {
      title: 'Type',
      key: 'type',
      render: (record: Workspace) => (
        <Space>
          {record.is_default && <Tag color="blue">Default</Tag>}
          {record.is_superadmin_workspace && <Tag color="purple">SuperAdmin</Tag>}
          {!record.is_default && !record.is_superadmin_workspace && <Tag color="green">Regular</Tag>}
        </Space>
      ),
      width: 120,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Workspace) => (
        <Space wrap>
          <Button
            icon={<UserAddOutlined />}
            onClick={() => {
              setSelectedWorkspace(record);
              inviteForm.setFieldsValue({ workspace_id: record.id });
              setInviteModalVisible(true);
            }}
            size="small"
          >
            Invite Admin
          </Button>
          {!record.is_default && !record.is_superadmin_workspace && (
            <Button
              icon={<DeleteOutlined />}
              danger
              onClick={() => handleDeleteWorkspace(record.id)}
              size="small"
            >
              Delete
            </Button>
          )}
        </Space>
      ),
      width: 200,
      fixed: 'right' as const,
    },
  ];

  // Invitation table columns
  const invitationColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 200,
      ellipsis: true,
    },
    {
      title: 'Workspace',
      dataIndex: 'workspace_name',
      key: 'workspace_name',
      width: 150,
      ellipsis: true,
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (text: string) => <Tag color="blue">{text}</Tag>,
      width: 100,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        let color = '';
        let icon = null;

        switch (status) {
          case 'pending':
            color = 'gold';
            icon = <ClockCircleOutlined />;
            break;
          case 'accepted':
            color = 'green';
            icon = <CheckCircleOutlined />;
            break;
          case 'declined':
            color = 'red';
            icon = <CloseCircleOutlined />;
            break;
          case 'expired':
            color = 'gray';
            icon = <CloseCircleOutlined />;
            break;
          default:
            color = 'default';
        }

        return (
          <Tag color={color} icon={icon}>
            {status.toUpperCase()}
          </Tag>
        );
      },
      width: 120,
    },
    {
      title: 'Invited At',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => new Date(text).toLocaleString(),
      width: 180,
    },
    {
      title: 'Accepted At',
      dataIndex: 'accepted_at',
      key: 'accepted_at',
      render: (text: string | null) => text ? new Date(text).toLocaleString() : 'N/A',
      width: 180,
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: Invitation) => (
        <Space wrap>
          {record.status === 'pending' && (
            <>
              <Button
                icon={<MailOutlined />}
                onClick={() => handleResendInvitation(record.id)}
                size="small"
              >
                Resend
              </Button>
              <Button
                icon={<CloseCircleOutlined />}
                danger
                onClick={() => handleCancelInvitation(record.id)}
                size="small"
              >
                Cancel
              </Button>
            </>
          )}
          {record.status === 'expired' && (
            <Button
              icon={<MailOutlined />}
              onClick={() => handleResendInvitation(record.id)}
              size="small"
            >
              Reactivate
            </Button>
          )}
        </Space>
      ),
      width: 200,
      fixed: 'right' as const,
    },
  ];

  // If not superadmin, show access denied
  if (userRole !== 'superadmin') {
    return (
      <div className="text-center py-10">
        <Title level={3}>Access Denied</Title>
        <Text>Only SuperAdmins can access this page.</Text>
      </div>
    );
  }

  // Define tabs items using the new API
  const tabItems = [
    {
      key: 'workspaces',
      label: 'Workspaces',
      children: loading ? (
        <div className="text-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            columns={workspaceColumns}
            dataSource={workspaces.map(w => ({ ...w, key: w.id }))}
            rowKey="id"
            scroll={{ x: 1200 }}
            bordered={false}
            size="middle"
            className="ant-table-minimal"
            pagination={{ pageSize: 10, position: ['bottomCenter'] }}
          />
        </div>
      )
    },
    {
      key: 'invitations',
      label: 'Invitations',
      children: loading ? (
        <div className="text-center py-10">
          <Spin size="large" />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table
            columns={invitationColumns}
            dataSource={invitations.map(i => ({ ...i, key: i.id }))}
            rowKey="id"
            scroll={{ x: 1200 }}
            bordered={false}
            size="middle"
            className="ant-table-minimal"
            pagination={{ pageSize: 10, position: ['bottomCenter'] }}
          />
        </div>
      )
    }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Workspace Management</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          Create Workspace
        </Button>
      </div>

      <Tabs items={tabItems} defaultActiveKey="workspaces" />

      {/* Create Workspace Modal */}
      <Modal
        title="Create New Workspace"
        open={createModalVisible}
        onCancel={() => setCreateModalVisible(false)}
        footer={null}
      >
        <Form
          form={createForm}
          layout="vertical"
          onFinish={handleCreateWorkspace}
        >
          <Form.Item
            name="name"
            label="Workspace Name"
            rules={[{ required: true, message: 'Please enter workspace name' }]}
          >
            <Input placeholder="Enter workspace name" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Create Workspace
            </Button>
          </Form.Item>
        </Form>
      </Modal>

      {/* Invite Admin Modal */}
      <Modal
        title={`Invite Admin to ${selectedWorkspace?.name || 'Workspace'}`}
        open={inviteModalVisible}
        onCancel={() => setInviteModalVisible(false)}
        footer={null}
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={handleInviteAdmin}
        >
          <Form.Item
            name="workspace_id"
            hidden
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="email"
            label="Admin Email"
            rules={[
              { required: true, message: 'Please enter admin email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter admin email" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit">
              Send Invitation
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}