'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Select, Switch, Modal, message, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined, ShareAltOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { useDocuments } from '@/contexts/DocumentsContext';
import supabase from '@/utils/supabase';

const { Option } = Select;

interface User {
    id: string;
    email: string;
}

interface Permission {
    userId: string;
    userEmail: string;
    access: 'view' | 'edit' | 'admin';
}

interface DocumentPermissionsProps {
    documentId: string;
    currentUserId: string;
}

const DocumentPermissions: React.FC<DocumentPermissionsProps> = ({ documentId, currentUserId }) => {
    const { updateDocument } = useDocuments();

    const [permissions, setPermissions] = useState<Permission[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<string | null>(null);
    const [selectedAccess, setSelectedAccess] = useState<'view' | 'edit' | 'admin'>('view');
    const [isPublic, setIsPublic] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);

    // Fetch document permissions
    useEffect(() => {
        const fetchPermissions = async () => {
            setLoading(true);
            try {
                const { data: document, error } = await supabase
                    .from('documents')
                    .select('permissions')
                    .eq('id', documentId)
                    .single();

                if (error) throw error;

                if (document && document.permissions) {
                    const perms = document.permissions.users || [];
                    setIsPublic(document.permissions.public || false);
                    setShareLink(document.permissions.shareLink || null);

                    // Fetch user emails for each permission
                    const userIds = perms.map((p: any) => p.userId);
                    if (userIds.length > 0) {
                        const { data: userData, error: userError } = await supabase
                            .from('auth.users')
                            .select('id, email')
                            .in('id', userIds);

                        if (userError) throw userError;

                        const userMap = new Map();
                        userData?.forEach(user => {
                            userMap.set(user.id, user.email);
                        });

                        const permissionsWithEmails = perms.map((p: any) => ({
                            userId: p.userId,
                            userEmail: userMap.get(p.userId) || 'Unknown User',
                            access: p.access
                        }));

                        setPermissions(permissionsWithEmails);
                    } else {
                        setPermissions([]);
                    }
                }
            } catch (error) {
                console.error('Error fetching permissions:', error);
                message.error('Failed to fetch permissions');
            } finally {
                setLoading(false);
            }
        };

        fetchPermissions();
    }, [documentId]);

    // Fetch users for permission assignment
    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const { data, error } = await supabase
                    .from('auth.users')
                    .select('id, email');

                if (error) throw error;

                // Filter out users who already have permissions and the current user
                const existingUserIds = new Set(permissions.map(p => p.userId));
                const filteredUsers = data?.filter(user =>
                    !existingUserIds.has(user.id) && user.id !== currentUserId
                ) || [];

                setUsers(filteredUsers);
            } catch (error) {
                console.error('Error fetching users:', error);
            }
        };

        fetchUsers();
    }, [permissions, currentUserId]);

    // Save permissions to the document
    const savePermissions = async (newPermissions: Permission[], isPublic: boolean, shareLink: string | null) => {
        try {
            const permissionsData = {
                users: newPermissions.map(p => ({
                    userId: p.userId,
                    access: p.access
                })),
                public: isPublic,
                shareLink
            };

            const success = await updateDocument(documentId, {
                permissions: permissionsData
            });

            if (success) {
                message.success('Permissions updated successfully');
                return true;
            } else {
                throw new Error('Failed to update permissions');
            }
        } catch (error) {
            console.error('Error saving permissions:', error);
            message.error('Failed to save permissions');
            return false;
        }
    };

    // Add a new permission
    const handleAddPermission = async () => {
        if (!selectedUser) {
            message.error('Please select a user');
            return;
        }

        const selectedUserObj = users.find(u => u.id === selectedUser);
        if (!selectedUserObj) {
            message.error('Selected user not found');
            return;
        }

        const newPermission: Permission = {
            userId: selectedUserObj.id,
            userEmail: selectedUserObj.email,
            access: selectedAccess
        };

        const newPermissions = [...permissions, newPermission];
        const success = await savePermissions(newPermissions, isPublic, shareLink);

        if (success) {
            setPermissions(newPermissions);
            setIsModalVisible(false);
            setSelectedUser(null);
            setSelectedAccess('view');
        }
    };

    // Remove a permission
    const handleRemovePermission = async (userId: string) => {
        const newPermissions = permissions.filter(p => p.userId !== userId);
        const success = await savePermissions(newPermissions, isPublic, shareLink);

        if (success) {
            setPermissions(newPermissions);
        }
    };

    // Toggle public access
    const handleTogglePublic = async (checked: boolean) => {
        const success = await savePermissions(permissions, checked, shareLink);

        if (success) {
            setIsPublic(checked);

            // Generate or remove share link
            if (checked && !shareLink) {
                const newShareLink = `${window.location.origin}/shared/documents/${documentId}`;
                await savePermissions(permissions, checked, newShareLink);
                setShareLink(newShareLink);
            } else if (!checked) {
                await savePermissions(permissions, checked, null);
                setShareLink(null);
            }
        }
    };

    // Copy share link to clipboard
    const copyShareLink = () => {
        if (shareLink) {
            navigator.clipboard.writeText(shareLink);
            message.success('Share link copied to clipboard');
        }
    };

    const columns = [
        {
            title: 'User',
            dataIndex: 'userEmail',
            key: 'userEmail',
        },
        {
            title: 'Access Level',
            dataIndex: 'access',
            key: 'access',
            render: (access: string, record: Permission) => (
                <Select
                    value={access}
                    onChange={(value) => {
                        const newPermissions = permissions.map(p =>
                            p.userId === record.userId ? { ...p, access: value as 'view' | 'edit' | 'admin' } : p
                        );
                        savePermissions(newPermissions, isPublic, shareLink);
                        setPermissions(newPermissions);
                    }}
                    style={{ width: 120 }}
                >
                    <Option value="view">View Only</Option>
                    <Option value="edit">Can Edit</Option>
                    <Option value="admin">Admin</Option>
                </Select>
            ),
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Permission) => (
                <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={() => handleRemovePermission(record.userId)}
                />
            ),
        },
    ];

    return (
        <div className="document-permissions">
            <Card
                title="Document Permissions"
                extra={
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center">
                            <span className="mr-2">Public:</span>
                            <Switch
                                checked={isPublic}
                                onChange={handleTogglePublic}
                                checkedChildren={<UnlockOutlined />}
                                unCheckedChildren={<LockOutlined />}
                            />
                        </div>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={() => setIsModalVisible(true)}
                        >
                            Add User
                        </Button>
                    </div>
                }
            >
                {isPublic && shareLink && (
                    <div className="mb-4 p-3 bg-gray-100 rounded flex justify-between items-center">
                        <div className="truncate flex-grow mr-2">
                            <span className="font-medium">Share Link: </span>
                            <span className="text-gray-600">{shareLink}</span>
                        </div>
                        <Button
                            type="primary"
                            icon={<ShareAltOutlined />}
                            onClick={copyShareLink}
                        >
                            Copy
                        </Button>
                    </div>
                )}

                <Table
                    dataSource={permissions}
                    columns={columns}
                    rowKey="userId"
                    loading={loading}
                    pagination={false}
                    locale={{ emptyText: 'No users have been granted access' }}
                />
            </Card>

            <Modal
                title="Add User Permission"
                open={isModalVisible}
                onOk={handleAddPermission}
                onCancel={() => setIsModalVisible(false)}
                okText="Add"
                confirmLoading={loading}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1">User</label>
                        <Select
                            placeholder="Select a user"
                            style={{ width: '100%' }}
                            value={selectedUser}
                            onChange={setSelectedUser}
                        >
                            {users.map(user => (
                                <Option key={user.id} value={user.id}>{user.email}</Option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block mb-1">Access Level</label>
                        <Select
                            placeholder="Select access level"
                            style={{ width: '100%' }}
                            value={selectedAccess}
                            onChange={value => setSelectedAccess(value as 'view' | 'edit' | 'admin')}
                        >
                            <Option value="view">View Only</Option>
                            <Option value="edit">Can Edit</Option>
                            <Option value="admin">Admin</Option>
                        </Select>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DocumentPermissions;