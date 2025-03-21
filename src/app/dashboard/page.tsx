'use client';

import React, { useState, useEffect } from 'react';
import { Card, Typography, Row, Col, Statistic, Button, List, Tag, Dropdown, Menu, Table, Tooltip } from 'antd';
import { TeamOutlined, UserOutlined, AppstoreOutlined, DownOutlined, ArrowLeftOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useRouter } from 'next/navigation';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;

export default function DashboardPage() {
  const { user, userRole } = useAuth();
  const {
    workspaces,
    workspaceMemberships,
    currentWorkspace,
    switchWorkspace,
    exitWorkspace
  } = useWorkspace();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';

    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  // Fetch members when workspace changes
  useEffect(() => {
    let isMounted = true;
    
    const fetchMembers = async () => {
      if (!currentWorkspace) return;
      
      setMembersLoading(true);
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', currentWorkspace.workspaceId);
          
        if (error) throw error;
        
        // Only update state if component is still mounted
        if (isMounted) {
          setMembers(data || []);
          setMembersLoading(false);
        }
      } catch (error) {
        console.error('Error fetching members:', error);
        if (isMounted) {
          setMembersLoading(false);
        }
      }
    };
    
    fetchMembers();
    
    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.workspaceId]); // Use workspaceId directly to ensure proper dependency tracking

  // Render different dashboard based on user role
  const renderDashboard = () => {
    if (userRole === 'superadmin') {
      // Check if superadmin is in their default workspace
      const isInSuperadminWorkspace = currentWorkspace?.isSuperadminWorkspace && currentWorkspace?.isDefault;
      
      if (isInSuperadminWorkspace) {
        return renderSuperAdminDashboard();
      } else {
        // Superadmin is in a different workspace
        return renderWorkspaceView();
      }
    } else if (currentWorkspace?.role === 'admin') {
      return renderAdminDashboard();
    } else {
      return renderMemberDashboard();
    }
  };

  // SuperAdmin dashboard (when in their default workspace)
  const renderSuperAdminDashboard = () => {
    // Create workspace selector menu items
    const workspaceMenuItems = workspaceMemberships.map((workspace) => ({
      key: workspace.workspaceId,
      label: (
        <span>
          {workspace.workspaceName}
          {workspace.isDefault && <Tag color="blue" className="ml-2">Default</Tag>}
          {workspace.isSuperadminWorkspace && <Tag color="purple" className="ml-2">SuperAdmin</Tag>}
        </span>
      ),
      disabled: workspace.isSuperadminWorkspace && workspace.isDefault,
      onClick: () => switchWorkspace(workspace.workspaceId)
    }));

    const workspaceMenu = {
      items: workspaceMenuItems
    };

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Title level={2}>SuperAdmin Dashboard</Title>
          <Dropdown menu={workspaceMenu} trigger={['click']}>
            <Button>
              Switch Workspace <DownOutlined />
            </Button>
          </Dropdown>
        </div>

        <Text className="text-gray-500 mb-6 block">
          Manage all workspaces and users from this central dashboard.
        </Text>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Total Workspaces"
                value={workspaces.length}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="Your Role"
                value="SuperAdmin"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="User ID"
                value={user?.id.substring(0, 8) + '...'}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Workspaces" extra={<Button type="primary" onClick={() => router.push('/dashboard/workspaces')}>Manage Workspaces</Button>}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 ant-table-minimal">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky right-0 bg-gray-50 z-10">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workspaces.map((workspace) => {
                  // Find the corresponding workspace membership
                  const membership = workspaceMemberships.find(m => m.workspaceId === workspace.id);
                  const isCurrent = membership?.workspaceId === currentWorkspace?.workspaceId;
                  
                  return (
                    <tr key={workspace.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          <Button
                            type="link"
                            onClick={() => membership && switchWorkspace(membership.workspaceId)}
                            disabled={isCurrent}
                            style={{ padding: 0, height: 'auto' }}
                          >
                            {workspace.name}
                          </Button>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {workspace.admin_name || "Admin Not Assigned"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {workspace.admin_email || "No email available"}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          {workspace.member_count || 0} members
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="mt-1">
                          {workspace.is_default && <Tag color="blue">Default</Tag>}
                          {workspace.is_superadmin_workspace && <Tag color="purple">SuperAdmin</Tag>}
                          {!workspace.is_default && !workspace.is_superadmin_workspace && <Tag color="green">Regular</Tag>}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap sticky right-0 bg-white">
                        {membership && (
                          <Button
                            onClick={() => membership && switchWorkspace(membership.workspaceId)}
                            disabled={isCurrent}
                          >
                            {isCurrent ? 'Current' : 'Enter Workspace'}
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // Workspace view for superadmin when they enter a non-superadmin workspace
  const renderWorkspaceView = () => {
    if (!currentWorkspace) return null;
    
    // Get members from the current workspace
    const workspaceMembers = members.filter(m => m.workspace_id === currentWorkspace.workspaceId);

    return (
      <div>
        <div className="mb-6">
          <Title level={2} className="m-0">{currentWorkspace.workspaceName}</Title>
        </div>
        
        <Text className="text-gray-500 mb-6 block">
          You are currently viewing this workspace as a SuperAdmin.
        </Text>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Your Role"
                value="SuperAdmin"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Workspace"
                value={currentWorkspace.workspaceName}
                prefix={<AppstoreOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Team Management" extra={<Button type="primary" onClick={() => router.push('/dashboard/members')}>Manage Members</Button>}>
          <div className="overflow-x-auto">
            <Table
              loading={membersLoading}
              columns={[
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
                    <Tag color={record.role === 'admin' ? 'blue' : 'default'}>
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
                }
              ]}
              dataSource={workspaceMembers.map(m => ({ ...m, key: m.composite_id || m.id }))}
              rowKey={record => record.composite_id || record.id}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'No members found' }}
            />
          </div>
        </Card>
      </div>
    );
  };

  // Admin dashboard
  const renderAdminDashboard = () => {
    // Get members from the current workspace
    const workspaceMembers = members.filter(m => m.workspace_id === currentWorkspace?.workspaceId);
    
    return (
      <div>
        <Title level={2}>Admin Dashboard</Title>
        <Text className="text-gray-500 mb-6 block">
          Manage your workspace and team members.
        </Text>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Your Role"
                value="Admin"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="User ID"
                value={user?.id.substring(0, 8) + '...'}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Team Management" extra={<Button type="primary" onClick={() => router.push('/dashboard/members')}>Manage Members</Button>}>
          <div className="overflow-x-auto">
            <Table
              loading={membersLoading}
              columns={[
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
                    <Tag color={record.role === 'admin' ? 'blue' : 'default'}>
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
                }
              ]}
              dataSource={workspaceMembers.map(m => ({ ...m, key: m.composite_id || m.id }))}
              rowKey={record => record.composite_id || record.id}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'No members found' }}
            />
          </div>
        </Card>
      </div>
    );
  };

  // Member dashboard
  const renderMemberDashboard = () => {
    return (
      <div>
        <Title level={2}>Member Dashboard</Title>
        <Text className="text-gray-500 mb-6 block">
          View your workspace information and team members.
        </Text>

        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="Your Role"
                value="Member"
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card>
              <Statistic
                title="User ID"
                value={user?.id.substring(0, 8) + '...'}
                prefix={<UserOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Card title="Team Members">
          <div className="overflow-x-auto">
            <Table
              loading={membersLoading}
              columns={[
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
                    <Tag color={record.role === 'admin' ? 'blue' : 'default'}>
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
                }
              ]}
              dataSource={members.filter(m => m.workspace_id === currentWorkspace?.workspaceId).map(m => ({ ...m, key: m.composite_id || m.id }))}
              rowKey={record => record.composite_id || record.id}
              pagination={{ pageSize: 5 }}
              scroll={{ x: 800 }}
              locale={{ emptyText: 'No team members data available' }}
            />
          </div>
        </Card>
      </div>
    );
  };

  return (
    <div>
      {renderDashboard()}
    </div>
  );
}