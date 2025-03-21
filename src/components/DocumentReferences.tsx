'use client';

import React, { useState, useEffect } from 'react';
import { List, Button, Input, Select, message, Tooltip, Modal } from 'antd';
import { LinkOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useDocuments, DocumentReference } from '@/contexts/DocumentsContext';

const { Option } = Select;

interface DocumentReferencesProps {
    documentId: string;
}

const DocumentReferences: React.FC<DocumentReferencesProps> = ({ documentId }) => {
    const {
        documentReferences,
        addDocumentReference,
        documents,
        fetchDocumentById
    } = useDocuments();

    const [isModalVisible, setIsModalVisible] = useState(false);
    const [targetDocumentId, setTargetDocumentId] = useState<string | null>(null);
    const [referenceType, setReferenceType] = useState<string>('related');
    const [loading, setLoading] = useState(false);
    const [availableDocuments, setAvailableDocuments] = useState<{ id: string; title: string }[]>([]);

    // Filter references for the current document
    const currentReferences = documentReferences.filter(
        ref => ref.source_document_id === documentId
    );

    // Fetch all documents for reference selection
    useEffect(() => {
        const fetchDocuments = async () => {
            try {
                // Filter out the current document and already referenced documents
                const referencedIds = currentReferences.map(ref => ref.target_document_id);
                const filtered = documents.filter(
                    doc => doc.id !== documentId && !referencedIds.includes(doc.id)
                );
                setAvailableDocuments(filtered.map(doc => ({ id: doc.id, title: doc.title })));
            } catch (error) {
                console.error('Error fetching documents for references:', error);
            }
        };

        fetchDocuments();
    }, [documentId, documents, currentReferences]);

    // Add a new reference
    const handleAddReference = async () => {
        if (!targetDocumentId) {
            message.error('Please select a document to reference');
            return;
        }

        setLoading(true);

        try {
            const newReference = await addDocumentReference(
                documentId,
                targetDocumentId,
                referenceType,
                { createdAt: new Date().toISOString() }
            );

            if (newReference) {
                message.success('Reference added successfully');
                setIsModalVisible(false);
                setTargetDocumentId(null);
                setReferenceType('related');
            } else {
                throw new Error('Failed to add reference');
            }
        } catch (error) {
            console.error('Error adding reference:', error);
            message.error('Failed to add reference');
        } finally {
            setLoading(false);
        }
    };

    // Navigate to a referenced document
    const handleOpenReference = (id: string) => {
        window.open(`/dashboard/documents/${id}`, '_blank');
    };

    // Get document title by ID
    const getDocumentTitle = (id: string) => {
        const doc = documents.find(d => d.id === id);
        return doc ? doc.title : 'Unknown Document';
    };

    // Format reference type for display
    const formatReferenceType = (type: string) => {
        return type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' ');
    };

    return (
        <div className="document-references">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium">Document References</h3>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setIsModalVisible(true)}
                    disabled={availableDocuments.length === 0}
                >
                    Add Reference
                </Button>
            </div>

            {currentReferences.length > 0 ? (
                <List
                    itemLayout="horizontal"
                    dataSource={currentReferences}
                    renderItem={reference => (
                        <List.Item
                            actions={[
                                <Button
                                    key="open"
                                    type="link"
                                    icon={<LinkOutlined />}
                                    onClick={() => handleOpenReference(reference.target_document_id)}
                                >
                                    Open
                                </Button>
                            ]}
                        >
                            <List.Item.Meta
                                title={getDocumentTitle(reference.target_document_id)}
                                description={`Type: ${formatReferenceType(reference.reference_type)}`}
                            />
                        </List.Item>
                    )}
                />
            ) : (
                <div className="text-center text-gray-500 py-4">
                    No references yet
                </div>
            )}

            <Modal
                title="Add Document Reference"
                open={isModalVisible}
                onOk={handleAddReference}
                onCancel={() => setIsModalVisible(false)}
                confirmLoading={loading}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block mb-1">Document</label>
                        <Select
                            placeholder="Select a document to reference"
                            style={{ width: '100%' }}
                            value={targetDocumentId}
                            onChange={setTargetDocumentId}
                        >
                            {availableDocuments.map(doc => (
                                <Option key={doc.id} value={doc.id}>{doc.title}</Option>
                            ))}
                        </Select>
                    </div>

                    <div>
                        <label className="block mb-1">Reference Type</label>
                        <Select
                            placeholder="Select reference type"
                            style={{ width: '100%' }}
                            value={referenceType}
                            onChange={setReferenceType}
                        >
                            <Option value="related">Related</Option>
                            <Option value="parent-child">Parent/Child</Option>
                            <Option value="dependency">Dependency</Option>
                            <Option value="reference">Reference</Option>
                            <Option value="see-also">See Also</Option>
                        </Select>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DocumentReferences;