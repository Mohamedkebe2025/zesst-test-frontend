'use client';

import React, { useState, useEffect } from 'react';
import {
  Typography,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  message,
  Spin,
  Select,
  Tooltip
} from 'antd';
import {
  UserAddOutlined,
  DeleteOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useMembers } from '@/contexts/MembersContext';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;
const { Option } = Select;

export default function MembersPage() {
  const { userRole, workspaceRole } = useAuth();
  const {
    members,
    availableWorkspaces,
    currentWorkspace,
    loading,
    setCurrentWorkspace,
    inviteMember,
    removeMember
  } = useMembers();

  const [inviteModalVisible, setInviteModalVisible] = useState<boolean>(false);
  const [inviteForm] = Form.useForm();
  const [pendingInvitations, setPendingInvitations] = useState<any[]>([]);
  const [invitationsLoading, setInvitationsLoading] = useState<boolean>(false);
  const [membersWithMetadata, setMembersWithMetadata] = useState<any[]>([]);

  // Fetch pending invitations
  const fetchPendingInvitations = async () => {
    if (!currentWorkspace) return;

    setInvitationsLoading(true);
    try {
      const { data, error } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', currentWorkspace)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setPendingInvitations(data || []);
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
    } finally {
      setInvitationsLoading(false);
    }
  };

  // Fetch invitations when workspace changes
  useEffect(() => {
    if (currentWorkspace) {
      fetchPendingInvitations();
    }
  }, [currentWorkspace]);

  // Fetch user metadata for members
  useEffect(() => {
    const fetchMetadata = async () => {
      if (!members || members.length === 0) return;
      
      const membersWithMeta = await Promise.all(
        members.map(async (member) => {
          // Extract user_id from composite_id (format: workspace_id:user_id)
          const userId = member.composite_id.split(':')[1];
          if (!userId) return { ...member, metadata: {} };
          
          const metadata = await fetchUserMetadata(userId);
          return { ...member, metadata: metadata || {} };
        })
      );
      
      setMembersWithMetadata(membersWithMeta);
    };
    
    fetchMetadata();
  }, [members]);

  // Handle invite member form submission
  const handleInviteMember = async (values: { email: string }) => {
    const result = await inviteMember(values.email);

    if (result.success) {
      message.success(`Invitation sent to ${values.email}`);
      inviteForm.resetFields();
      setInviteModalVisible(false);
      // Refresh invitations
      fetchPendingInvitations();
    } else {
      message.error(result.error || 'Failed to invite member');
    }
  };

  // Handle remove member
  const handleRemoveMember = async (compositeId: string) => {
    const result = await removeMember(compositeId);

    if (result.success) {
      message.success('Member removed successfully');
    } else {
      message.error(result.error || 'Failed to remove member');
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitationId: string) => {
    try {
      const invitation = pendingInvitations.find(inv => inv.id === invitationId);
      if (!invitation) {
        message.error('Invitation not found');
        return;
      }

      // Get workspace name
      const workspace = availableWorkspaces.find(w => w.id === currentWorkspace);
      const workspaceName = workspace?.name || 'Unknown';

      // Use the same API endpoint that's working for admin invitations
      const response = await fetch('/api/invitations/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: invitation.email,
          workspaceId: invitation.workspace_id,
          role: invitation.role,
          workspaceName
        }),
      });

      const result = await response.json();

      if (result.success) {
        message.success(`Invitation resent to ${invitation.email}`);
        fetchPendingInvitations();
      } else {
        message.error(result.error || 'Failed to resend invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      message.error('Failed to resend invitation');
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .update({ status: 'cancelled' })
        .eq('id', invitationId);

      if (error) throw error;

      message.success('Invitation cancelled');
      fetchPendingInvitations();
    } catch (error) {
      console.error('Error cancelling invitation:', error);
      message.error('Failed to cancel invitation');
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Fetch user metadata for members
  const fetchUserMetadata = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('get_user_metadata', {
        user_id: userId
      });
      
      if (error) {
        console.error('Error fetching user metadata:', error);
        return null;
      }
      
      if (data) {
        try {
          return typeof data === 'string' ? JSON.parse(data) : data;
        } catch (e) {
          console.error('Error parsing user metadata:', e);
          return null;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Error in fetchUserMetadata:', error);
      return null;
    }
  };

  // Member table columns
  const memberColumns = [
    {
      title: 'Name',
      key: 'name',
      render: (record: any) => {
        const metadata = record.metadata || {};
        return <span>{metadata.name || metadata.full_name || 'No name set'}</span>;
      },
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Job Title',
      key: 'job_title',
      render: (record: any) => {
        const metadata = record.metadata || {};
        return <span>{metadata.job_title || 'No job title set'}</span>;
      },
    },
    {
      title: 'Permissions',
      key: 'permissions',
      render: (record: any) => (
        <Tag color="default">
          {record.role === 'admin' ? 'Admin' : 'Standard'}
        </Tag>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      render: () => (
        <Tag color="success" icon={<CheckCircleOutlined />}>
          ACTIVE
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button
            icon={<DeleteOutlined />}
            danger
            onClick={() => handleRemoveMember(record.composite_id)}
            disabled={record.role === 'admin'} // Can't remove admins
          >
            Remove
          </Button>
        </Space>
      ),
      fixed: 'right',
      width: 120,
    },
  ];

  // Invitation table columns
  const invitationColumns = [
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (text: string) => (
        <Tag color={text === 'admin' ? 'blue' : 'green'}>
          {text.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: 'Invited',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (text: string) => (
        <Tooltip title={formatDate(text)}>
          <span>{formatDate(text)}</span>
        </Tooltip>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (text: string) => (
        <Tag color="warning" icon={<ClockCircleOutlined />}>
          PENDING
        </Tag>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (record: any) => (
        <Space>
          <Button
            type="primary"
            onClick={() => handleResendInvitation(record.id)}
          >
            Resend
          </Button>
          <Button
            danger
            onClick={() => handleCancelInvitation(record.id)}
          >
            Cancel
          </Button>
        </Space>
      ),
      fixed: 'right',
      width: 180,
    },
  ];

  // If not admin or superadmin, show access denied
  if (userRole !== 'superadmin' && workspaceRole !== 'admin') {
    return (
      <div className="text-center py-10">
        <Title level={3}>Access Denied</Title>
        <Text>Only Admins can access this page.</Text>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <Title level={2}>Member Management</Title>
        <div className="flex items-center">
          {/* Only show workspace selector for superadmins */}
          {userRole === 'superadmin' && availableWorkspaces.length > 0 && (
            <Select
              className="mr-4"
              style={{ width: 200 }}
              value={currentWorkspace || undefined}
              onChange={setCurrentWorkspace}
              placeholder="Select workspace"
            >
              {availableWorkspaces.map(workspace => (
                <Option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </Option>
              ))}
            </Select>
          )}
          <Button
            type="primary"
            icon={<UserAddOutlined />}
            onClick={() => setInviteModalVisible(true)}
          >
            Invite Member
          </Button>
        </div>
      </div>

      {/* Active Members Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Title level={4} className="mb-0 mr-2">Active Members</Title>
          <Tooltip title="Users who have accepted their invitations and are active in the workspace">
            <InfoCircleOutlined />
          </Tooltip>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={memberColumns}
            dataSource={membersWithMetadata.length > 0 ? membersWithMetadata : members.map(m => ({ ...m, key: m.composite_id, metadata: {} }))}
            rowKey="composite_id"
            scroll={{ x: 1000 }}
          />
        )}
      </div>

      {/* Pending Invitations Section */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <Title level={4} className="mb-0 mr-2">Pending Invitations</Title>
          <Tooltip title="Users who have been invited but haven't accepted yet">
            <InfoCircleOutlined />
          </Tooltip>
        </div>

        {invitationsLoading ? (
          <div className="text-center py-10">
            <Spin size="large" />
          </div>
        ) : (
          <Table
            columns={invitationColumns}
            dataSource={pendingInvitations.map(inv => ({ ...inv, key: inv.id }))}
            rowKey="id"
            locale={{ emptyText: 'No pending invitations' }}
            scroll={{ x: 1000 }}
          />
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal
        title="Invite New Member"
        open={inviteModalVisible}
        onCancel={() => setInviteModalVisible(false)}
        footer={null}
      >
        <Form
          form={inviteForm}
          layout="vertical"
          onFinish={handleInviteMember}
        >
          <Form.Item
            name="email"
            label="Member Email"
            rules={[
              { required: true, message: 'Please enter member email' },
              { type: 'email', message: 'Please enter a valid email' }
            ]}
          >
            <Input placeholder="Enter member email" />
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
