'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Layout, Menu, Button, Typography, Dropdown, Avatar, Spin, Divider } from 'antd';
import type { MenuProps } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  UserOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  FolderOutlined,
  FormOutlined,
  ProjectOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { useAuth } from '@/contexts/AuthContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { FoldersProvider } from '@/contexts/FoldersContext';
import FolderMenu from '@/components/FolderMenu';
import { Tag } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, userRole, signOut, isLoading } = useAuth();
  const { currentWorkspace, exitWorkspace } = useWorkspace();
  const router = useRouter();
  const pathname = usePathname();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  // Show loading spinner while authentication state is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spin size="large" />
      </div>
    );
  }

  // Don't render the layout if user is not authenticated
  if (!user) {
    return null;
  }

  // Safe navigation handler
  const handleNavigation = ({ key }: { key: string }) => {
    // Validate that the key is a safe route before redirecting
    const safeRoutes = [
      '/dashboard',
      '/dashboard/workspaces',
      '/dashboard/members',
      '/dashboard/documents',
      '/dashboard/profile',
      '/dashboard/settings'
    ];

    if (safeRoutes.includes(key)) {
      router.push(key);
    } else {
      console.error(`Attempted navigation to unauthorized route: ${key}`);
      router.push('/dashboard'); // Default safe redirect
    }
  };

  // Determine menu items based on user role
  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/dashboard/workspaces',
      icon: <TeamOutlined />,
      label: 'Workspaces',
      // Only show for superadmin when in their default workspace
      hidden: userRole !== 'superadmin' || (currentWorkspace && !currentWorkspace.isDefault),
    },
    {
      key: '/dashboard/members',
      icon: <TeamOutlined />,
      label: 'Members',
      // Show for workspace admins and for superadmins when they're in a non-superadmin workspace
      hidden: (userRole === 'superadmin' && currentWorkspace?.isSuperadminWorkspace) ||
        (userRole !== 'superadmin' && currentWorkspace?.role !== 'admin'),
    },
    // Documents are now accessible through the folder navigation
    // {
    //   key: '/dashboard/documents',
    //   icon: <FileTextOutlined />,
    //   label: 'Documents',
    //   // Show for all users in a workspace
    //   hidden: !currentWorkspace,
    // },
    {
      key: '/dashboard/profile',
      icon: <UserOutlined />,
      label: 'Profile',
    },
    {
      key: '/dashboard/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ].filter(item => !item.hidden);

  // User dropdown menu items
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profile',
      onClick: () => router.push('/dashboard/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleSignOut,
    },
  ];

  // Determine which role badge to show
  const getRoleBadge = () => {
    if (userRole === 'superadmin') {
      return (
        <div className="mr-4 px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-medium">
          SuperAdmin
        </div>
      );
    } else if (currentWorkspace?.role === 'admin') {
      return (
        <div className="mr-4 px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
          Admin
        </div>
      );
    } else if (currentWorkspace?.role === 'member') {
      return (
        <div className="mr-4 px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium">
          Member
        </div>
      );
    }
    return null;
  };

  return (
    <FoldersProvider>
      <Layout style={{ minHeight: '100vh' }}>
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          theme="light"
          className="shadow-md"
          width={280}
        >
          <div className="p-4 flex items-center justify-center">
            <Title level={collapsed ? 5 : 4} className="m-0">
              {collapsed ? 'Z' : 'ZESST'}
            </Title>
          </div>

          {/* Main Navigation Menu */}
          <Menu
            theme="light"
            mode="inline"
            selectedKeys={[pathname]}
            items={menuItems}
            onClick={handleNavigation}
          />

          {/* Folder Navigation */}
          {!collapsed && currentWorkspace && (
            <>
              <Divider style={{ margin: '12px 0' }} />
              <div className="px-4 overflow-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
                <FolderMenu />
              </div>
            </>
          )}
        </Sider>
        <Layout>
          <Header className="bg-white p-0 px-4 flex justify-between items-center shadow-sm">
            <div className="flex items-center">
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                className="mr-4"
              />
              {currentWorkspace && (
                <div className="flex items-center">
                  <AppstoreOutlined className="mr-2" />
                  <Text strong>{currentWorkspace.workspaceName}</Text>
                  {currentWorkspace.isDefault && <Tag color="blue" className="ml-2">Default</Tag>}
                  {currentWorkspace.isSuperadminWorkspace && <Tag color="purple" className="ml-2">SuperAdmin</Tag>}

                  {/* Exit Workspace button for superadmin when not in default workspace */}
                  {userRole === 'superadmin' && !currentWorkspace.isDefault && (
                    <Button
                      type="link"
                      icon={<ArrowLeftOutlined />}
                      onClick={() => {
                        exitWorkspace();
                        router.push('/dashboard');
                      }}
                      className="ml-2"
                    >
                      Exit Workspace
                    </Button>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center">
              {getRoleBadge()}
              <Dropdown menu={{ items: userMenuItems }} trigger={['click']}>
                <div className="flex items-center cursor-pointer">
                  <Avatar icon={<UserOutlined />} className="mr-2" />
                  <Text>{user?.email}</Text>
                </div>
              </Dropdown>
            </div>
          </Header>
          <Content className="m-4 p-4 bg-white rounded shadow-sm">
            {children}
          </Content>
        </Layout>
      </Layout>
    </FoldersProvider>
  );
}