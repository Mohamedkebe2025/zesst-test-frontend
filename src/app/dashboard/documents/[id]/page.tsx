'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, Typography, Button, message, Spin, Breadcrumb, Tabs, List, Tooltip } from 'antd';
import {
    SaveOutlined,
    ArrowLeftOutlined,
    HistoryOutlined,
    FileAddOutlined,
    LinkOutlined,
    ShareAltOutlined,
    LockOutlined
} from '@ant-design/icons';
import { Descendant } from 'slate';
import supabase from '@/utils/supabase';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocuments, Document, DocumentVersion } from '@/contexts/DocumentsContext';
import BlockEditor from '@/components/BlockEditor';
import DocumentReferences from '@/components/DocumentReferences';
import DocumentPermissions from '@/components/DocumentPermissions';

const { Title } = Typography;
const { TabPane } = Tabs;

export default function DocumentPage() {
    const params = useParams();
    const router = useRouter();
    const { currentWorkspace } = useWorkspace();
    const {
        fetchDocumentById,
        updateDocument,
        createDocumentVersion,
        fetchChildDocuments,
        childDocuments,
        documentVersions,
        createDocument,
        setCurrentDocument
    } = useDocuments();

    const editorRef = useRef<any>(null);

    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState<string>('');
    const [editorContent, setEditorContent] = useState<Descendant[]>([
        {
            type: 'paragraph',
            children: [{ text: '' }],
        },
    ]);
    const [activeTab, setActiveTab] = useState('content');
    const [creatingChildDoc, setCreatingChildDoc] = useState(false);
    const [childDocTitle, setChildDocTitle] = useState('');

    // Fetch document when component mounts
    useEffect(() => {
        const loadDocument = async () => {
            if (!params.id) return;

            try {
                const doc = await fetchDocumentById(params.id as string);
                if (doc) {
                    setDocument(doc);
                    setContent(doc.content || '');
                    setCurrentDocument(doc);

                    // Handle content based on content_type
                    if (doc.content_type === 'json' && doc.content) {
                        try {
                            const parsedContent = JSON.parse(doc.content);
                            setEditorContent(parsedContent);
                        } catch (e) {
                            console.error('Error parsing document content:', e);
                            // Fallback to plain text
                            setEditorContent([
                                {
                                    type: 'paragraph',
                                    children: [{ text: doc.content || '' }],
                                },
                            ]);
                        }
                    } else {
                        // Convert plain text to Slate format
                        setEditorContent([
                            {
                                type: 'paragraph',
                                children: [{ text: doc.content || '' }],
                            },
                        ]);
                    }
                }
            } catch (error) {
                console.error('Error fetching document:', error);
                message.error('Failed to fetch document');
            } finally {
                setLoading(false);
            }
        };

        loadDocument();

        // Cleanup function
        return () => {
            setCurrentDocument(null);
        };
    }, [params.id, fetchDocumentById, setCurrentDocument]);

    // Save document content
    const saveDocument = async () => {
        if (!document) return;

        setSaving(true);

        try {
            // Serialize the Slate content to JSON
            const contentJson = JSON.stringify(editorContent);

            // Also create a plain text version for backward compatibility and search
            const plainText = editorContent
                .map(node => {
                    if ('children' in node) {
                        return node.children.map(child => {
                            if ('text' in child) return child.text;
                            return '';
                        }).join('');
                    }
                    return '';
                })
                .join('\n');

            const success = await updateDocument(document.id, {
                content: contentJson,
                content_type: 'json'
            });

            if (success) {
                message.success('Document saved successfully');
                setContent(contentJson);

                // Create a version of the document
                await createDocumentVersion(document.id, 'Auto-saved version');
            } else {
                throw new Error('Failed to update document');
            }
        } catch (error) {
            console.error('Error saving document:', error);
            message.error('Failed to save document');
        } finally {
            setSaving(false);
        }
    };

    // Create a child document
    const handleCreateChildDocument = async () => {
        if (!document || !childDocTitle.trim()) return;

        setCreatingChildDoc(true);

        try {
            const newDoc = await createDocument(
                childDocTitle,
                '',
                document.folder_id,
                document.id // Set parent_document_id to current document
            );

            if (newDoc) {
                message.success(`Child document "${childDocTitle}" created`);
                setChildDocTitle('');
                // Refresh child documents
                await fetchChildDocuments(document.id);
            } else {
                throw new Error('Failed to create child document');
            }
        } catch (error) {
            console.error('Error creating child document:', error);
            message.error('Failed to create child document');
        } finally {
            setCreatingChildDoc(false);
        }
    };

    // Handle back button click
    const handleBack = () => {
        router.push('/dashboard/documents');
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Spin size="large" />
            </div>
        );
    }

    if (!document) {
        return (
            <div className="flex flex-col items-center justify-center h-full">
                <Title level={3}>Document not found</Title>
                <Button type="primary" onClick={handleBack}>
                    Back to Documents
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <div>
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={handleBack}
                        className="mr-4"
                    >
                        Back
                    </Button>
                    <Title level={3} style={{ display: 'inline-block', margin: 0 }}>
                        {document.title}
                    </Title>
                </div>
                <div>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={saveDocument}
                        loading={saving}
                        className="mr-2"
                    >
                        Save
                    </Button>
                    <Tooltip title="Create Child Document">
                        <Button
                            icon={<FileAddOutlined />}
                            onClick={() => setActiveTab('children')}
                        />
                    </Tooltip>
                </div>
            </div>

            <Card>
                <Tabs activeKey={activeTab} onChange={setActiveTab}>
                    <TabPane tab="Content" key="content">
                        <BlockEditor
                            initialValue={editorContent}
                            onChange={setEditorContent}
                        />
                    </TabPane>

                    <TabPane tab="Child Documents" key="children">
                        <div className="p-4">
                            <div className="mb-4">
                                <Title level={4}>Child Documents</Title>
                                <div className="flex items-center mb-4">
                                    <input
                                        type="text"
                                        placeholder="New child document title"
                                        value={childDocTitle}
                                        onChange={(e) => setChildDocTitle(e.target.value)}
                                        className="p-2 border rounded mr-2 flex-grow"
                                    />
                                    <Button
                                        type="primary"
                                        onClick={handleCreateChildDocument}
                                        loading={creatingChildDoc}
                                        disabled={!childDocTitle.trim()}
                                    >
                                        Create
                                    </Button>
                                </div>

                                {childDocuments.length > 0 ? (
                                    <List
                                        itemLayout="horizontal"
                                        dataSource={childDocuments}
                                        renderItem={item => (
                                            <List.Item
                                                actions={[
                                                    <Button
                                                        key="open"
                                                        type="link"
                                                        onClick={() => router.push(`/dashboard/documents/${item.id}`)}
                                                    >
                                                        Open
                                                    </Button>
                                                ]}
                                            >
                                                <List.Item.Meta
                                                    title={item.title}
                                                    description={`Created: ${new Date(item.created_at || '').toLocaleString()}`}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                ) : (
                                    <div className="text-center text-gray-500 py-4">
                                        No child documents yet
                                    </div>
                                )}
                            </div>
                        </div>
                    </TabPane>

                    <TabPane tab="References" key="references">
                        <div className="p-4">
                            {document && <DocumentReferences documentId={document.id} />}
                        </div>
                    </TabPane>

                    <TabPane tab="Permissions" key="permissions">
                        <div className="p-4">
                            {document && (
                                <DocumentPermissions
                                    documentId={document.id}
                                    currentUserId={document.created_by || ''}
                                />
                            )}
                        </div>
                    </TabPane>

                    <TabPane tab="Versions" key="versions">
                        <div className="p-4">
                            <Title level={4}>Document Versions</Title>
                            {documentVersions.length > 0 ? (
                                <List
                                    itemLayout="horizontal"
                                    dataSource={documentVersions}
                                    renderItem={version => (
                                        <List.Item
                                            actions={[
                                                <Button
                                                    key="restore"
                                                    type="link"
                                                    onClick={() => {
                                                        if (version.content) {
                                                            try {
                                                                // Try to parse as JSON first (for newer versions)
                                                                const parsedContent = JSON.parse(version.content);
                                                                setEditorContent(parsedContent);
                                                            } catch (e) {
                                                                // Fallback to plain text (for older versions)
                                                                setEditorContent([
                                                                    {
                                                                        type: 'paragraph',
                                                                        children: [{ text: version.content }],
                                                                    },
                                                                ]);
                                                            }
                                                            setContent(version.content);
                                                            setActiveTab('content');
                                                            message.success('Version content loaded. Click Save to apply changes.');
                                                        }
                                                    }}
                                                >
                                                    Restore
                                                </Button>
                                            ]}
                                        >
                                            <List.Item.Meta
                                                title={version.version_note || 'Unnamed version'}
                                                description={`Created: ${new Date(version.created_at).toLocaleString()}`}
                                            />
                                        </List.Item>
                                    )}
                                />
                            ) : (
                                <div className="text-center text-gray-500 py-4">
                                    No versions available
                                </div>
                            )}
                        </div>
                    </TabPane>
                </Tabs>
            </Card>
        </div>
    );
}