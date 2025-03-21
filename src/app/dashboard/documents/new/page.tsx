'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, Typography, Button, message, Spin, Input, Form, Select } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Descendant } from 'slate';
import supabase from '@/utils/supabase';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useDocuments } from '@/contexts/DocumentsContext';
import { useFolders } from '@/contexts/FoldersContext';
import BlockEditor from '@/components/BlockEditor';

const { Title } = Typography;
const { Option } = Select;

export default function NewDocumentPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { currentWorkspace } = useWorkspace();
    const { createDocument } = useDocuments();
    const { folders } = useFolders();
    const editorRef = useRef<any>(null);
    const [form] = Form.useForm();

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [content, setContent] = useState<string>('');
    const [editorContent, setEditorContent] = useState<Descendant[]>([
        {
            type: 'paragraph',
            children: [{ text: '' }],
        },
    ]);
    const [selectedParentDoc, setSelectedParentDoc] = useState<string | null>(null);
    const [availableParentDocs, setAvailableParentDocs] = useState<{ id: string, title: string }[]>([]);

    // Get folder_id from query params if available
    const folderId = searchParams.get('folder');

    // Fetch available parent documents
    useEffect(() => {
        const fetchParentDocs = async () => {
            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('id, title');

                if (error) throw error;

                setAvailableParentDocs(data || []);
            } catch (error) {
                console.error('Error fetching parent documents:', error);
            }
        };

        fetchParentDocs();
    }, []);

    // Create a new document
    const handleCreateDocument = async (values: { title: string }) => {
        if (!currentWorkspace?.workspaceId) {
            message.error('No workspace selected');
            return;
        }

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

            const newDoc = await createDocument(
                values.title,
                contentJson,
                folderId || null,
                selectedParentDoc
            );

            if (newDoc) {
                message.success(`Document "${values.title}" created successfully`);
                // Navigate to the new document
                router.push(`/dashboard/documents/${newDoc.id}`);
            } else {
                throw new Error('Failed to create document');
            }
        } catch (error) {
            console.error('Error creating document:', error);
            message.error('Failed to create document');
            setSaving(false);
        }
    };

    // Handle back button click
    const handleBack = () => {
        router.push('/dashboard/documents');
    };

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
                        New Document
                    </Title>
                </div>
            </div>

            <Card>
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={handleCreateDocument}
                >
                    <Form.Item
                        name="title"
                        label="Document Title"
                        rules={[{ required: true, message: 'Please enter a title' }]}
                    >
                        <Input placeholder="Enter document title" />
                    </Form.Item>

                    <Form.Item
                        name="folder"
                        label="Folder"
                        initialValue={folderId || undefined}
                    >
                        <Select
                            placeholder="Select a folder (optional)"
                            allowClear
                            onChange={(value) => form.setFieldsValue({ folder: value })}
                        >
                            <Option value={null}>No folder</Option>
                            {folders.map(folder => (
                                <Option key={folder.id} value={folder.id}>{folder.name}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="parent_document"
                        label="Parent Document"
                        tooltip="Make this a child document of another document"
                    >
                        <Select
                            placeholder="Select a parent document (optional)"
                            allowClear
                            onChange={(value) => setSelectedParentDoc(value)}
                        >
                            {availableParentDocs.map(doc => (
                                <Option key={doc.id} value={doc.id}>{doc.title}</Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        label="Content"
                    >
                        <BlockEditor
                            initialValue={editorContent}
                            onChange={setEditorContent}
                        />
                    </Form.Item>

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            icon={<SaveOutlined />}
                            loading={saving}
                        >
                            Create Document
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
}