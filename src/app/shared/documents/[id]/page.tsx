'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Card, Typography, Spin, Alert, Button } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import supabase from '@/utils/supabase';
import BlockEditor from '@/components/BlockEditor';

const { Title, Text } = Typography;

interface Document {
    id: string;
    title: string;
    content: string | null;
    content_type: string;
    permissions: any;
    created_at: string | null;
}

export default function SharedDocumentPage() {
    const params = useParams();
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editorContent, setEditorContent] = useState<any[]>([
        {
            type: 'paragraph',
            children: [{ text: '' }],
        },
    ]);

    // Fetch document when component mounts
    useEffect(() => {
        const fetchDocument = async () => {
            if (!params.id) return;

            try {
                const { data, error } = await supabase
                    .from('documents')
                    .select('*')
                    .eq('id', params.id)
                    .single();

                if (error) throw error;

                // Check if document is public
                if (!data.permissions || !data.permissions.public) {
                    setError('This document is not publicly accessible');
                    setLoading(false);
                    return;
                }

                setDocument(data);

                // Handle content based on content_type
                if (data.content_type === 'json' && data.content) {
                    try {
                        const parsedContent = JSON.parse(data.content);
                        setEditorContent(parsedContent);
                    } catch (e) {
                        console.error('Error parsing document content:', e);
                        // Fallback to plain text
                        setEditorContent([
                            {
                                type: 'paragraph',
                                children: [{ text: data.content || '' }],
                            },
                        ]);
                    }
                } else {
                    // Convert plain text to Slate format
                    setEditorContent([
                        {
                            type: 'paragraph',
                            children: [{ text: data.content || '' }],
                        },
                    ]);
                }
            } catch (error) {
                console.error('Error fetching document:', error);
                setError('Failed to fetch document');
            } finally {
                setLoading(false);
            }
        };

        fetchDocument();
    }, [params.id]);

    // Handle back button click
    const handleBack = () => {
        window.history.back();
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <Spin size="large" />
            </div>
        );
    }

    if (error || !document) {
        return (
            <div className="max-w-4xl mx-auto p-4">
                <Alert
                    message="Error"
                    description={error || 'Document not found'}
                    type="error"
                    showIcon
                    className="mb-4"
                />
                <Button onClick={handleBack} icon={<ArrowLeftOutlined />}>
                    Go Back
                </Button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-4">
            <div className="mb-4">
                <Button
                    icon={<ArrowLeftOutlined />}
                    onClick={handleBack}
                    className="mb-4"
                >
                    Back
                </Button>
                <Title level={2}>{document.title}</Title>
                <Text type="secondary">
                    Shared document • Last updated: {new Date(document.created_at || '').toLocaleString()}
                </Text>
            </div>

            <Card>
                <BlockEditor
                    initialValue={editorContent}
                    onChange={() => { }} // No-op since this is read-only
                    readOnly={true}
                />
            </Card>
        </div>
    );
}