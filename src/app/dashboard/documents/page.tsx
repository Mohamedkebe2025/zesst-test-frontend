'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Typography, Button, Table, Input, Modal, message, Empty, Breadcrumb, Radio } from 'antd';
import {
    FileTextOutlined,
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    FolderOutlined
} from '@ant-design/icons';
import { useFolders } from '@/contexts/FoldersContext';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import supabase from '@/utils/supabase';

const { Title, Text } = Typography;
const { Search } = Input;
const { confirm } = Modal;

interface Document {
    id: string;
    title: string;
    content: string | null;
    folder_id: string | null;
    created_by: string | null;
    created_at: string | null;
}

export default function DocumentsPage() {
    const router = useRouter();
    const { currentWorkspace } = useWorkspace();
    const { currentFolder, folders, refreshFolders } = useFolders();

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [newDocTitle, setNewDocTitle] = useState('');
    const [newItemType, setNewItemType] = useState<'document' | 'project' | 'form'>('document');
    const [editingDocument, setEditingDocument] = useState<Document | null>(null);

    // Fetch documents when workspace or current folder changes
    useEffect(() => {
        if (currentWorkspace?.workspaceId) {
            fetchDocuments();
        }
    }, [currentWorkspace?.workspaceId, currentFolder]);

    // Fetch documents from the database
    const fetchDocuments = async () => {
        if (!currentWorkspace?.workspaceId) return;

        setLoading(true);

        try {
            let query = supabase
                .from('documents')
                .select('*');

            // Filter by folder if a folder is selected
            if (currentFolder) {
                query = query.eq('folder_id', currentFolder.id);
            } else {
                // If no folder is selected, show only documents without a folder
                query = query.is('folder_id', null);
            }

            const { data, error } = await query;

            if (error) throw error;

            setDocuments(data || []);
        } catch (error) {
            console.error('Error fetching documents:', error);
            // Don't show error message here, it's causing double messages
        } finally {
            setLoading(false);
        }
    };

    // Create a new item (document, project, or form)
    const createDocument = async () => {
        if (!newDocTitle.trim()) {
            message.error('Title cannot be empty');
            return;
        }

        if (!currentWorkspace?.workspaceId) {
            message.error('No workspace selected');
            return;
        }

        try {
            const { data: userData } = await supabase.auth.getUser();

            // Base item data
            const newItem = {
                title: newDocTitle,
                content: '',
                folder_id: currentFolder?.id || null,
                created_by: userData.user?.id || null,
            };

            // Determine which table to insert into based on item type
            let tableName = 'documents';
            let itemType = 'Document';

            switch (newItemType) {
                case 'project':
                    tableName = 'projects';
                    itemType = 'Project';
                    break;
                case 'form':
                    tableName = 'forms';
                    itemType = 'Form';
                    break;
                default:
                    tableName = 'documents';
                    itemType = 'Document';
            }

            const { data, error } = await supabase
                .from(tableName)
                .insert([newItem])
                .select()
                .single();

            if (error) throw error;

            message.success(`${itemType} "${newDocTitle}" created successfully`);
            setNewDocTitle('');
            setNewItemType('document');
            setIsModalVisible(false);

            // If it's a document, add it to the documents list
            if (newItemType === 'document') {
                setDocuments(prev => [...prev, data]);
            } else {
                // For other item types, refresh the folder items
                refreshFolders();
            }

        } catch (error) {
            console.error(`Error creating ${newItemType}:`, error);
            message.error(`Failed to create ${newItemType}`);
        }
    };

    // Delete a document
    const handleDeleteDocument = (document: Document) => {
        confirm({
            title: `Are you sure you want to delete "${document.title}"?`,
            content: 'This action cannot be undone.',
            okText: 'Yes, Delete',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: async () => {
                try {
                    const { error } = await supabase
                        .from('documents')
                        .delete()
                        .eq('id', document.id);

                    if (error) throw error;

                    message.success(`Document "${document.title}" deleted successfully`);

                    // Remove the document from the list
                    setDocuments(prev => prev.filter(doc => doc.id !== document.id));

                } catch (error) {
                    console.error('Error deleting document:', error);
                    message.error('Failed to delete document');
                }
            },
        });
    };

    // Edit document title
    const handleEditDocument = async () => {
        if (!editingDocument) return;

        if (!newDocTitle.trim()) {
            message.error('Document title cannot be empty');
            return;
        }

        try {
            const { error } = await supabase
                .from('documents')
                .update({ title: newDocTitle })
                .eq('id', editingDocument.id);

            if (error) throw error;

            message.success(`Document renamed to "${newDocTitle}" successfully`);

            // Update the document in the list
            setDocuments(prev =>
                prev.map(doc =>
                    doc.id === editingDocument.id ? { ...doc, title: newDocTitle } : doc
                )
            );

            setNewDocTitle('');
            setEditingDocument(null);
            setIsModalVisible(false);

        } catch (error) {
            console.error('Error updating document:', error);
            message.error('Failed to update document');
        }
    };

    // Filter documents by search text
    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchText.toLowerCase())
    );

    // Generate breadcrumb items
    const generateBreadcrumbItems = () => {
        const items = [
            { title: 'Documents', key: 'documents' }
        ];

        if (currentFolder) {
            // If we have a current folder, we need to build the path to it
            const folderPath: { id: string; name: string }[] = [];
            let folder = currentFolder;

            // Add the current folder
            folderPath.unshift({ id: folder.id, name: folder.name });

            // Add all parent folders
            while (folder.parent_folder_id) {
                const parentFolder = folders.find(f => f.id === folder.parent_folder_id);
                if (parentFolder) {
                    folderPath.unshift({ id: parentFolder.id, name: parentFolder.name });
                    folder = parentFolder;
                } else {
                    break;
                }
            }

            // Add all folders to breadcrumb
            folderPath.forEach(f => {
                items.push({ title: f.name, key: f.id });
            });
        }

        return items;
    };

    // Table columns
    const columns = [
        {
            title: 'Title',
            dataIndex: 'title',
            key: 'title',
            render: (text: string, record: Document) => (
                <div className="flex items-center">
                    <FileTextOutlined className="mr-2" />
                    <a href={`/dashboard/documents/${record.id}`}>{text}</a>
                </div>
            ),
        },
        {
            title: 'Created',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (date: string) => date ? new Date(date).toLocaleDateString() : 'N/A',
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_: any, record: Document) => (
                <div className="flex space-x-2">
                    <Button
                        icon={<EditOutlined />}
                        size="small"
                        onClick={() => {
                            setEditingDocument(record);
                            setNewDocTitle(record.title);
                            setIsModalVisible(true);
                        }}
                    />
                    <Button
                        icon={<DeleteOutlined />}
                        size="small"
                        danger
                        onClick={() => handleDeleteDocument(record)}
                    />
                </div>
            ),
        },
    ];

    if (!currentWorkspace) {
        return <div>Please select a workspace</div>;
    }

    return (
        <div>
            <div className="mb-4">
                <Breadcrumb items={generateBreadcrumbItems()} />
            </div>

            <div className="flex justify-between items-center mb-4">
                <Title level={3}>
                    {currentFolder ? (
                        <span>
                            <FolderOutlined className="mr-2" />
                            {currentFolder.name}
                        </span>
                    ) : (
                        'All Documents'
                    )}
                </Title>
                <div className="flex space-x-2">
                    <Search
                        placeholder="Search documents"
                        allowClear
                        onChange={(e) => setSearchText(e.target.value)}
                        style={{ width: 250 }}
                    />
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            // Navigate to the new document page with the current folder as a query parameter
                            const folderParam = currentFolder ? `?folder=${currentFolder.id}` : '';
                            router.push(`/dashboard/documents/new${folderParam}`);
                        }}
                    >
                        New
                    </Button>
                </div>
            </div>

            <Card>
                {filteredDocuments.length > 0 ? (
                    currentFolder ? (
                        // Display as cards when inside a folder
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredDocuments.map(doc => (
                                <Card
                                    key={doc.id}
                                    hoverable
                                    style={{ height: '100%' }}
                                    onClick={() => router.push(`/dashboard/documents/${doc.id}`)}
                                    actions={[
                                        <EditOutlined key="edit" onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingDocument(doc);
                                            setNewDocTitle(doc.title);
                                            setIsModalVisible(true);
                                        }} />,
                                        <DeleteOutlined key="delete" onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteDocument(doc);
                                        }} />
                                    ]}
                                >
                                    <div className="flex items-start">
                                        <FileTextOutlined style={{ fontSize: '24px', marginRight: '12px' }} />
                                        <div>
                                            <div className="font-medium">{doc.title}</div>
                                            <div className="text-gray-500 text-sm">
                                                Created: {new Date(doc.created_at || '').toLocaleDateString()}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    ) : (
                        // Display as table when viewing all documents
                        <Table
                            dataSource={filteredDocuments}
                            columns={columns}
                            rowKey="id"
                            loading={loading}
                            pagination={{ pageSize: 10 }}
                        />
                    )
                ) : (
                    <Empty
                        description={
                            <span>
                                {loading ? 'Loading documents...' : 'No documents found'}
                            </span>
                        }
                    />
                )}
            </Card>

            {/* Modal for creating/editing items */}
            <Modal
                title={editingDocument ? "Edit Document" : "Create New Item"}
                open={isModalVisible}
                onOk={editingDocument ? handleEditDocument : createDocument}
                onCancel={() => {
                    setIsModalVisible(false);
                    setNewDocTitle('');
                    setNewItemType('document');
                    setEditingDocument(null);
                }}
            >
                <div className="space-y-4">
                    {!editingDocument && (
                        <div>
                            <Typography.Text strong>Item Type:</Typography.Text>
                            <Radio.Group
                                value={newItemType}
                                onChange={(e) => setNewItemType(e.target.value)}
                                className="ml-4"
                            >
                                <Radio value="document">Document</Radio>
                                <Radio value="project">Project</Radio>
                                <Radio value="form">Form</Radio>
                            </Radio.Group>
                        </div>
                    )}

                    <Input
                        placeholder="Enter title"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        autoFocus
                    />
                </div>
            </Modal>
        </div>
    );
}