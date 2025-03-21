'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Tree, Menu, Dropdown, Button, Input, Modal, message } from 'antd';
import {
    FolderOutlined,
    FileOutlined,
    FormOutlined,
    ProjectOutlined,
    FileTextOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    MoreOutlined,
    DownOutlined,
    CopyOutlined
} from '@ant-design/icons';
import { useFolders, Folder, FolderItem } from '@/contexts/FoldersContext';
import { useRouter, usePathname } from 'next/navigation';
import { useWorkspace } from '@/contexts/WorkspaceContext';

const { DirectoryTree } = Tree;
const { confirm } = Modal;

interface TreeNode {
    key: string;
    title: React.ReactNode;
    icon?: React.ReactNode;
    children?: TreeNode[];
    isLeaf?: boolean;
    selectable?: boolean;
    type: 'folder' | 'form' | 'project' | 'document';
    parentKey?: string;
}

const FolderMenu: React.FC = () => {
    const {
        folders,
        folderItems,
        currentFolder,
        setCurrentFolder,
        createFolder,
        updateFolder,
        deleteFolder,
        duplicateFolder,
        getFolderHierarchy,
        refreshFolders,
        isLoading
    } = useFolders();

    const { currentWorkspace } = useWorkspace();
    const router = useRouter();

    const [treeData, setTreeData] = useState<TreeNode[]>([]);
    const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([]);
    const [newFolderName, setNewFolderName] = useState('');
    const [editFolderName, setEditFolderName] = useState('');
    const [isAddModalVisible, setIsAddModalVisible] = useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = useState(false);
    const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);
    const [parentFolderId, setParentFolderId] = useState<string | null>(null);

    // Build tree data whenever folders or items change
    useEffect(() => {
        if (folders.length > 0 || folderItems.length > 0) {
            const hierarchy = getFolderHierarchy();
            const rootFolders = hierarchy['root'] || [];

            const buildTreeNodes = (foldersList: Folder[], parentKey?: string): TreeNode[] => {
                return foldersList.map(folder => {
                    // Get children folders
                    const childFolders = hierarchy[folder.id] || [];

                    // Get items in this folder
                    const items = folderItems.filter(item => item.folder_id === folder.id);

                    // Build folder node
                    const folderNode: TreeNode = {
                        key: `folder-${folder.id}`,
                        title: folder.name,
                        icon: <FolderOutlined className="flex items-center" />,
                        type: 'folder',
                        parentKey,
                        children: [
                            // Add child folders
                            ...buildTreeNodes(childFolders, `folder-${folder.id}`),
                            // Add folder items
                            ...items.map(item => ({
                                key: `${item.type}-${item.id}`,
                                title: item.name,
                                icon: getItemIcon(item.type),
                                isLeaf: true,
                                type: item.type,
                                parentKey: `folder-${folder.id}`,
                            })),
                        ],
                    };

                    return folderNode;
                });
            };

            // Build the tree starting from root folders
            const newTreeData = buildTreeNodes(rootFolders);

            // Add root items (items without a folder)
            const rootItems = folderItems.filter(item => !item.folder_id);
            rootItems.forEach(item => {
                newTreeData.push({
                    key: `${item.type}-${item.id}`,
                    title: item.name,
                    icon: getItemIcon(item.type),
                    isLeaf: true,
                    type: item.type,
                });
            });

            setTreeData(newTreeData);
        } else {
            setTreeData([]);
        }
    }, [folders, folderItems, getFolderHierarchy]);

    // Get icon based on item type
    const getItemIcon = (type: string) => {
        switch (type) {
            case 'form':
                return <FormOutlined className="flex items-center" />;
            case 'project':
                return <ProjectOutlined className="flex items-center" />;
            case 'document':
                return <FileTextOutlined className="flex items-center" />;
            default:
                return <FileOutlined className="flex items-center" />;
        }
    };

    // Render folder title with dropdown menu
    const renderFolderTitle = (folder: Folder) => {
        // Check if this folder is currently selected
        const isSelected = currentFolder?.id === folder.id;

        const menu = {
            items: [
                {
                    key: 'add',
                    icon: <PlusOutlined />,
                    label: 'Add Subfolder',
                    onClick: () => {
                        setParentFolderId(folder.id);
                        setIsAddModalVisible(true);
                    }
                },
                {
                    key: 'duplicate',
                    icon: <CopyOutlined />,
                    label: 'Duplicate',
                    onClick: async () => {
                        try {
                            const result = await duplicateFolder(folder.id);
                            if (result) {
                                message.success(`Folder "${folder.name}" duplicated successfully`);
                            }
                        } catch (error) {
                            message.error('Failed to duplicate folder');
                        }
                    }
                },
                {
                    type: 'divider'
                },
                {
                    key: 'add-project',
                    icon: <ProjectOutlined />,
                    label: '+ Project',
                    onClick: () => {
                        // Placeholder for add project functionality
                        message.info('Add project functionality will be implemented soon');
                    }
                },
                {
                    key: 'add-form',
                    icon: <FormOutlined />,
                    label: '+ Form',
                    onClick: () => {
                        // Placeholder for add form functionality
                        message.info('Add form functionality will be implemented soon');
                    }
                },
                {
                    key: 'add-document',
                    icon: <FileTextOutlined />,
                    label: '+ Document',
                    onClick: () => {
                        // Navigate to new document page with folder ID
                        router.push(`/dashboard/documents/new?folder=${folder.id}`);
                    }
                },
                {
                    type: 'divider'
                },
                {
                    key: 'edit',
                    icon: <EditOutlined />,
                    label: 'Rename',
                    onClick: () => {
                        setSelectedFolder(folder);
                        setEditFolderName(folder.name);
                        setIsEditModalVisible(true);
                    }
                },
                {
                    key: 'delete',
                    icon: <DeleteOutlined />,
                    label: 'Delete',
                    onClick: () => {
                        handleDeleteFolder(folder);
                    }
                }
            ]
        };

        // Custom styling for selected folder
        const folderStyle = isSelected ? {
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            color: '#1890ff',
            borderRadius: '4px',
            padding: '2px 4px'
        } : {};

        return (
            <div className="flex items-center justify-between w-full group">
                <span
                    className="flex items-center"
                    style={folderStyle}
                >
                    {folder.name}
                </span>
                <Dropdown
                    menu={{ items: menu.items }}
                    trigger={['click']}
                    placement="bottomRight"
                >
                    <Button
                        type="text"
                        size="small"
                        icon={<MoreOutlined />}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center ml-2"
                        style={{ visibility: 'visible' }}
                    />
                </Dropdown>
            </div>
        );
    };

    // Reference to track component mount status
    const isMountedRef = useRef(true);

    // Set up cleanup when component unmounts
    useEffect(() => {
        isMountedRef.current = true;

        // Cleanup function to reset current folder when component unmounts
        return () => {
            isMountedRef.current = false;
            setCurrentFolder(null);
        };
    }, [setCurrentFolder]);

    // Reset selection when pathname changes (navigation)
    const pathname = usePathname();
    useEffect(() => {
        // Reset current folder when navigating away from documents page
        if (!pathname.includes('/dashboard/documents')) {
            setCurrentFolder(null);

            // Also reset the tree selection by clearing expandedKeys
            // This ensures visual feedback that nothing is selected
            setExpandedKeys([]);
        }
    }, [pathname, setCurrentFolder]);

    // Handle tree node selection
    const handleSelect = (selectedKeys: React.Key[], info: any) => {
        const key = selectedKeys[0]?.toString() || '';

        if (key.startsWith('folder-')) {
            const folderId = key.replace('folder-', '');
            const folder = folders.find(f => f.id === folderId) || null;

            // Set current folder and navigate to documents page
            setCurrentFolder(folder);

            // Navigate to the documents page with the folder context
            // This will show all items in the selected folder
            if (pathname !== `/dashboard/documents`) {
                router.push(`/dashboard/documents?folder=${folderId}`);
            }
        } else if (key.includes('-')) {
            const [type, id] = key.split('-');

            // Reset current folder when navigating to a specific item
            setCurrentFolder(null);

            // Navigate based on item type
            switch (type) {
                case 'form':
                    router.push(`/dashboard/forms/${id}`);
                    break;
                case 'project':
                    router.push(`/dashboard/projects/${id}`);
                    break;
                case 'document':
                    router.push(`/dashboard/documents/${id}`);
                    break;
            }
        }
    };

    // Handle tree node expansion
    const handleExpand = (expandedKeys: React.Key[]) => {
        setExpandedKeys(expandedKeys);
    };

    // Custom tree node renderer
    const renderTreeNode = (node: TreeNode) => {
        const isFolder = node.type === 'folder';
        const isSelected = isFolder && currentFolder?.id === node.key.toString().replace('folder-', '');

        // Style for selected folder - only background, no text styling
        const nodeStyle = isSelected ? {
            backgroundColor: 'rgba(24, 144, 255, 0.1)',
            borderRadius: '4px',
            padding: '4px'
        } : {};

        // Separate style for text color
        const textStyle = isSelected ? {
            color: '#1890ff',
            fontWeight: 500
        } : {};

        const handleNodeClick = () => {
            if (isFolder) {
                const folderId = node.key.toString().replace('folder-', '');
                const folder = folders.find(f => f.id === folderId) || null;
                setCurrentFolder(folder);

                // Navigate to documents page with folder context
                if (pathname !== `/dashboard/documents`) {
                    router.push(`/dashboard/documents?folder=${folderId}`);
                }
            } else if (node.key.toString().includes('-')) {
                const [type, id] = node.key.toString().split('-');

                // Reset current folder when navigating to a specific item
                setCurrentFolder(null);

                // Navigate based on item type
                switch (type) {
                    case 'form':
                        router.push(`/dashboard/forms/${id}`);
                        break;
                    case 'project':
                        router.push(`/dashboard/projects/${id}`);
                        break;
                    case 'document':
                        router.push(`/dashboard/documents/${id}`);
                        break;
                }
            }
        };

        return (
            <div key={node.key} className="ml-4 my-2">
                {isFolder ? (
                    // Folder node with dropdown menu
                    <div className="flex items-center justify-between w-full">
                        <div
                            className="flex items-center cursor-pointer flex-grow"
                            onClick={handleNodeClick}
                            style={nodeStyle}
                        >
                            {React.cloneElement(node.icon as React.ReactElement, {
                                style: isSelected ? { color: '#1890ff' } : {}
                            })}
                            <span className="ml-2" style={textStyle}>{node.title}</span>
                        </div>
                        {/* Dropdown menu for folder actions */}
                        <Dropdown
                            menu={{
                                items: [
                                    {
                                        key: 'add',
                                        icon: <PlusOutlined />,
                                        label: 'Add Subfolder',
                                        onClick: () => {
                                            const folderId = node.key.toString().replace('folder-', '');
                                            setParentFolderId(folderId);
                                            setIsAddModalVisible(true);
                                        }
                                    },
                                    {
                                        key: 'duplicate',
                                        icon: <CopyOutlined />,
                                        label: 'Duplicate',
                                        onClick: async () => {
                                            try {
                                                const folderId = node.key.toString().replace('folder-', '');
                                                const result = await duplicateFolder(folderId);
                                                if (result) {
                                                    message.success(`Folder duplicated successfully`);
                                                }
                                            } catch (error) {
                                                message.error('Failed to duplicate folder');
                                            }
                                        }
                                    },
                                    {
                                        type: 'divider'
                                    },
                                    {
                                        key: 'add-project',
                                        icon: <ProjectOutlined />,
                                        label: '+ Project',
                                        onClick: () => {
                                            // Placeholder for add project functionality
                                            message.info('Add project functionality will be implemented soon');
                                        }
                                    },
                                    {
                                        key: 'add-form',
                                        icon: <FormOutlined />,
                                        label: '+ Form',
                                        onClick: () => {
                                            // Placeholder for add form functionality
                                            message.info('Add form functionality will be implemented soon');
                                        }
                                    },
                                    {
                                        key: 'add-document',
                                        icon: <FileTextOutlined />,
                                        label: '+ Document',
                                        onClick: () => {
                                            const folderId = node.key.toString().replace('folder-', '');
                                            // Navigate to new document page with folder ID
                                            router.push(`/dashboard/documents/new?folder=${folderId}`);
                                        }
                                    },
                                    {
                                        type: 'divider'
                                    },
                                    {
                                        key: 'edit',
                                        icon: <EditOutlined />,
                                        label: 'Rename',
                                        onClick: () => {
                                            const folderId = node.key.toString().replace('folder-', '');
                                            const folder = folders.find(f => f.id === folderId) || null;
                                            if (folder) {
                                                setSelectedFolder(folder);
                                                setEditFolderName(folder.name);
                                                setIsEditModalVisible(true);
                                            }
                                        }
                                    },
                                    {
                                        key: 'delete',
                                        icon: <DeleteOutlined />,
                                        label: 'Delete',
                                        onClick: () => {
                                            const folderId = node.key.toString().replace('folder-', '');
                                            const folder = folders.find(f => f.id === folderId) || null;
                                            if (folder) {
                                                handleDeleteFolder(folder);
                                            }
                                        }
                                    }
                                ]
                            }}
                            trigger={['click']}
                            placement="bottomRight"
                        >
                            <Button
                                type="text"
                                size="small"
                                icon={<MoreOutlined />}
                                onClick={(e) => e.stopPropagation()}
                                className="flex items-center"
                            />
                        </Dropdown>
                    </div>
                ) : (
                    // Regular item node
                    <div
                        className="flex items-center cursor-pointer"
                        onClick={handleNodeClick}
                    >
                        {React.cloneElement(node.icon as React.ReactElement, {
                            style: {}
                        })}
                        <span className="ml-2">{node.title}</span>
                    </div>
                )}

                {node.children && node.children.length > 0 && (
                    <div className="ml-4">
                        {node.children.map(child => renderTreeNode(child))}
                    </div>
                )}
            </div>
        );
    };

    // Handle adding a new folder
    const handleAddFolder = async () => {
        if (!newFolderName.trim()) {
            message.error('Folder name cannot be empty');
            return;
        }

        const result = await createFolder(newFolderName, parentFolderId);

        if (result) {
            message.success(`Folder "${newFolderName}" created successfully`);
            setNewFolderName('');
            setIsAddModalVisible(false);
            setParentFolderId(null);

            // Expand the parent folder if it exists
            if (parentFolderId) {
                setExpandedKeys([...expandedKeys, `folder-${parentFolderId}`]);
            }
        }
    };

    // Handle editing a folder
    const handleEditFolder = async () => {
        if (!selectedFolder) return;

        if (!editFolderName.trim()) {
            message.error('Folder name cannot be empty');
            return;
        }

        const result = await updateFolder(selectedFolder.id, editFolderName);

        if (result) {
            message.success(`Folder renamed to "${editFolderName}" successfully`);
            setEditFolderName('');
            setIsEditModalVisible(false);
            setSelectedFolder(null);
        }
    };

    // Handle deleting a folder
    const handleDeleteFolder = (folder: Folder) => {
        confirm({
            title: `Are you sure you want to delete the folder "${folder.name}"?`,
            content: 'This action cannot be undone. All contents must be moved or deleted first.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                const result = await deleteFolder(folder.id);

                if (result) {
                    message.success(`Folder "${folder.name}" deleted successfully`);
                }
            },
        });
    };

    if (!currentWorkspace) {
        return <div>Please select a workspace</div>;
    }

    return (
        <div className="folder-menu">
            <div className="flex justify-between items-center mb-2 px-2">
                <h3 className="text-lg font-medium text-gray-500">Folders</h3>
                <Button
                    type="text"
                    icon={<PlusOutlined />}
                    onClick={() => {
                        setParentFolderId(null);
                        setIsAddModalVisible(true);
                    }}
                    title="Add Root Folder"
                />
            </div>

            {isLoading ? (
                <div className="p-4 text-center">Loading folders...</div>
            ) : (
                <div className="custom-folder-tree">
                    {treeData.map(node => renderTreeNode(node))}
                </div>
            )}

            {/* Add Folder Modal */}
            <Modal
                title={parentFolderId ? "Add Subfolder" : "Add Root Folder"}
                open={isAddModalVisible}
                onOk={handleAddFolder}
                onCancel={() => {
                    setIsAddModalVisible(false);
                    setNewFolderName('');
                    setParentFolderId(null);
                }}
            >
                <Input
                    placeholder="Enter folder name"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    autoFocus
                />
            </Modal>

            {/* Edit Folder Modal */}
            <Modal
                title="Rename Folder"
                open={isEditModalVisible}
                onOk={handleEditFolder}
                onCancel={() => {
                    setIsEditModalVisible(false);
                    setEditFolderName('');
                    setSelectedFolder(null);
                }}
            >
                <Input
                    placeholder="Enter new folder name"
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    autoFocus
                />
            </Modal>
        </div>
    );
};

export default FolderMenu;