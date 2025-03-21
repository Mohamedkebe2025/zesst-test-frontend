'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import supabase from '@/utils/supabase';
import { useWorkspace } from './WorkspaceContext';
import { useFolders } from './FoldersContext';

// Define types for our document structure
export interface Document {
    id: string;
    title: string;
    content: string | null;
    content_type: string;
    folder_id: string | null;
    parent_document_id: string | null;
    created_by: string | null;
    created_at: string | null;
    is_template: boolean;
    permissions: any;
}

export interface DocumentVersion {
    id: string;
    document_id: string;
    content: string | null;
    created_at: string;
    created_by: string | null;
    version_note: string | null;
}

export interface DocumentReference {
    id: string;
    source_document_id: string;
    target_document_id: string;
    reference_type: string;
    metadata: any;
    created_at: string;
}

interface DocumentsContextType {
    documents: Document[];
    currentDocument: Document | null;
    childDocuments: Document[];
    documentVersions: DocumentVersion[];
    documentReferences: DocumentReference[];
    isLoading: boolean;
    error: string | null;
    createDocument: (title: string, content: string, folderId?: string | null, parentDocumentId?: string | null) => Promise<Document | null>;
    updateDocument: (id: string, data: Partial<Document>) => Promise<boolean>;
    deleteDocument: (id: string) => Promise<boolean>;
    duplicateDocument: (id: string) => Promise<Document | null>;
    createDocumentVersion: (documentId: string, versionNote?: string) => Promise<DocumentVersion | null>;
    addDocumentReference: (sourceId: string, targetId: string, referenceType: string, metadata?: any) => Promise<DocumentReference | null>;
    setCurrentDocument: (document: Document | null) => void;
    fetchDocumentById: (id: string) => Promise<Document | null>;
    fetchChildDocuments: (parentId: string) => Promise<Document[]>;
    refreshDocuments: () => Promise<void>;
}

const DocumentsContext = createContext<DocumentsContextType | undefined>(undefined);

export const DocumentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [currentDocument, setCurrentDocument] = useState<Document | null>(null);
    const [childDocuments, setChildDocuments] = useState<Document[]>([]);
    const [documentVersions, setDocumentVersions] = useState<DocumentVersion[]>([]);
    const [documentReferences, setDocumentReferences] = useState<DocumentReference[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    const { currentWorkspace } = useWorkspace();
    const { refreshFolders } = useFolders();

    // Fetch documents when workspace changes
    useEffect(() => {
        if (currentWorkspace?.workspaceId) {
            refreshDocuments();
        }
    }, [currentWorkspace?.workspaceId]);

    // Fetch child documents when current document changes
    useEffect(() => {
        if (currentDocument?.id) {
            fetchChildDocuments(currentDocument.id);
            fetchDocumentVersions(currentDocument.id);
            fetchDocumentReferences(currentDocument.id);
        }
    }, [currentDocument?.id]);

    // Fetch all documents
    const refreshDocuments = async () => {
        if (!currentWorkspace?.workspaceId) return;

        setIsLoading(true);
        setError(null);

        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*');
            // Note: workspace_id column doesn't exist in documents table yet
            // .eq('workspace_id', currentWorkspace.workspaceId);

            if (error) throw error;

            setDocuments(data || []);
        } catch (err: any) {
            console.error('Error fetching documents:', err);
            setError(err.message || 'Failed to fetch documents');
        } finally {
            setIsLoading(false);
        }
    };

    // Fetch a document by ID
    const fetchDocumentById = async (id: string): Promise<Document | null> => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (err: any) {
            console.error('Error fetching document:', err);
            setError(err.message || 'Failed to fetch document');
            return null;
        }
    };

    // Fetch child documents for a parent document
    const fetchChildDocuments = async (parentId: string): Promise<Document[]> => {
        try {
            const { data, error } = await supabase
                .from('documents')
                .select('*')
                .eq('parent_document_id', parentId);

            if (error) throw error;

            setChildDocuments(data || []);
            return data || [];
        } catch (err: any) {
            console.error('Error fetching child documents:', err);
            setError(err.message || 'Failed to fetch child documents');
            return [];
        }
    };

    // Fetch document versions
    const fetchDocumentVersions = async (documentId: string) => {
        try {
            const { data, error } = await supabase
                .from('document_versions')
                .select('*')
                .eq('document_id', documentId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            setDocumentVersions(data || []);
        } catch (err: any) {
            console.error('Error fetching document versions:', err);
            setError(err.message || 'Failed to fetch document versions');
        }
    };

    // Fetch document references
    const fetchDocumentReferences = async (documentId: string) => {
        try {
            const { data, error } = await supabase
                .from('document_references')
                .select('*')
                .eq('source_document_id', documentId);

            if (error) throw error;

            setDocumentReferences(data || []);
        } catch (err: any) {
            console.error('Error fetching document references:', err);
            setError(err.message || 'Failed to fetch document references');
        }
    };

    // Create a new document
    const createDocument = async (
        title: string,
        content: string,
        folderId: string | null = null,
        parentDocumentId: string | null = null
    ): Promise<Document | null> => {
        try {
            const { data: userData } = await supabase.auth.getUser();

            const newDocument = {
                title,
                content,
                content_type: content.startsWith('{') && content.endsWith('}') ? 'json' : 'text',
                folder_id: folderId,
                parent_document_id: parentDocumentId,
                created_by: userData.user?.id || null,
                is_template: false,
                permissions: {}
            };

            const { data, error } = await supabase
                .from('documents')
                .insert([newDocument])
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setDocuments(prev => [...prev, data]);

            // Refresh folders to update folder items
            refreshFolders();

            return data;
        } catch (err: any) {
            console.error('Error creating document:', err);
            setError(err.message || 'Failed to create document');
            return null;
        }
    };

    // Update a document
    const updateDocument = async (id: string, data: Partial<Document>): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('documents')
                .update(data)
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setDocuments(prev =>
                prev.map(doc =>
                    doc.id === id ? { ...doc, ...data } : doc
                )
            );

            // If current document is updated, update it too
            if (currentDocument?.id === id) {
                setCurrentDocument(prev => prev ? { ...prev, ...data } : null);
            }

            return true;
        } catch (err: any) {
            console.error('Error updating document:', err);
            setError(err.message || 'Failed to update document');
            return false;
        }
    };

    // Delete a document
    const deleteDocument = async (id: string): Promise<boolean> => {
        try {
            // First check if document has any children
            const children = await fetchChildDocuments(id);
            if (children.length > 0) {
                throw new Error('Cannot delete document with child documents. Delete children first.');
            }

            const { error } = await supabase
                .from('documents')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setDocuments(prev => prev.filter(doc => doc.id !== id));

            // If current document was deleted, set current document to null
            if (currentDocument?.id === id) {
                setCurrentDocument(null);
            }

            // Refresh folders to update folder items
            refreshFolders();

            return true;
        } catch (err: any) {
            console.error('Error deleting document:', err);
            setError(err.message || 'Failed to delete document');
            return false;
        }
    };

    // Duplicate a document
    const duplicateDocument = async (id: string): Promise<Document | null> => {
        try {
            // Find the document to duplicate
            const docToDuplicate = documents.find(doc => doc.id === id);
            if (!docToDuplicate) {
                throw new Error('Document not found');
            }

            // Create a new document with the same properties
            const newTitle = `${docToDuplicate.title} (Copy)`;
            const newDocument = await createDocument(
                newTitle,
                docToDuplicate.content || '',
                docToDuplicate.folder_id,
                docToDuplicate.parent_document_id
            );

            return newDocument;
        } catch (err: any) {
            console.error('Error duplicating document:', err);
            setError(err.message || 'Failed to duplicate document');
            return null;
        }
    };

    // Create a document version
    const createDocumentVersion = async (documentId: string, versionNote?: string): Promise<DocumentVersion | null> => {
        try {
            // Get the current document content
            const doc = await fetchDocumentById(documentId);
            if (!doc) {
                throw new Error('Document not found');
            }

            const { data: userData } = await supabase.auth.getUser();

            const newVersion = {
                document_id: documentId,
                content: doc.content,
                created_by: userData.user?.id || null,
                version_note: versionNote || null
            };

            const { data, error } = await supabase
                .from('document_versions')
                .insert([newVersion])
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setDocumentVersions(prev => [data, ...prev]);

            return data;
        } catch (err: any) {
            console.error('Error creating document version:', err);
            setError(err.message || 'Failed to create document version');
            return null;
        }
    };

    // Add a document reference
    const addDocumentReference = async (
        sourceId: string,
        targetId: string,
        referenceType: string,
        metadata: any = {}
    ): Promise<DocumentReference | null> => {
        try {
            const newReference = {
                source_document_id: sourceId,
                target_document_id: targetId,
                reference_type: referenceType,
                metadata
            };

            const { data, error } = await supabase
                .from('document_references')
                .insert([newReference])
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setDocumentReferences(prev => [...prev, data]);

            return data;
        } catch (err: any) {
            console.error('Error adding document reference:', err);
            setError(err.message || 'Failed to add document reference');
            return null;
        }
    };

    const value = {
        documents,
        currentDocument,
        childDocuments,
        documentVersions,
        documentReferences,
        isLoading,
        error,
        createDocument,
        updateDocument,
        deleteDocument,
        duplicateDocument,
        createDocumentVersion,
        addDocumentReference,
        setCurrentDocument,
        fetchDocumentById,
        fetchChildDocuments,
        refreshDocuments,
    };

    return (
        <DocumentsContext.Provider value={value}>
            {children}
        </DocumentsContext.Provider>
    );
};

export const useDocuments = () => {
    const context = useContext(DocumentsContext);
    if (context === undefined) {
        throw new Error('useDocuments must be used within a DocumentsProvider');
    }
    return context;
};