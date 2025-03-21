'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import supabase from '@/utils/supabase';
import { useWorkspace } from './WorkspaceContext';

// Define types for our folder structure
export interface Folder {
    id: string;
    name: string;
    workspace_id: string;
    parent_folder_id: string | null;
    created_by: string | null;
    created_at: string | null;
}

export interface FolderItem {
    id: string;
    name: string;
    type: 'form' | 'project' | 'document';
    folder_id: string;
}

interface FoldersContextType {
    folders: Folder[];
    folderItems: FolderItem[];
    currentFolder: Folder | null;
    isLoading: boolean;
    error: string | null;
    createFolder: (name: string, parentFolderId?: string | null) => Promise<Folder | null>;
    updateFolder: (id: string, name: string) => Promise<boolean>;
    deleteFolder: (id: string) => Promise<boolean>;
    duplicateFolder: (id: string) => Promise<Folder | null>;
    setCurrentFolder: (folder: Folder | null) => void;
    getFolderHierarchy: () => { [key: string]: Folder[] };
    getFolderItems: (folderId: string) => FolderItem[];
    refreshFolders: () => Promise<void>;
}

const FoldersContext = createContext<FoldersContextType | undefined>(undefined);

export const FoldersProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [folders, setFolders] = useState<Folder[]>([]);
    const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
    const [currentFolder, setCurrentFolder] = useState<Folder | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const { currentWorkspace } = useWorkspace();

    // Fetch folders when workspace changes
    useEffect(() => {
        if (currentWorkspace?.workspaceId) {
            refreshFolders();
        }
    }, [currentWorkspace?.workspaceId]);

    // Fetch all folders for the current workspace
    const refreshFolders = async () => {
        if (!currentWorkspace?.workspaceId) return;

        setIsLoading(true);
        setError(null);

        try {
            // Fetch folders
            const { data: folderData, error: folderError } = await supabase
                .from('folders')
                .select('*')
                .eq('workspace_id', currentWorkspace.workspaceId);

            if (folderError) throw folderError;

            setFolders(folderData || []);

            // Fetch forms
            const { data: formData, error: formError } = await supabase
                .from('forms')
                .select('id, name, folder_id');
            // Note: workspace_id column doesn't exist in forms table yet
            // .eq('workspace_id', currentWorkspace.workspaceId);

            if (formError) throw formError;

            // Fetch projects
            const { data: projectData, error: projectError } = await supabase
                .from('projects')
                .select('id, name, folder_id');
            // Note: workspace_id column doesn't exist in projects table yet
            // .eq('workspace_id', currentWorkspace.workspaceId);

            if (projectError) throw projectError;

            // Fetch documents
            const { data: documentData, error: documentError } = await supabase
                .from('documents')
                .select('id, title as name, folder_id');
            // Note: workspace_id column doesn't exist in documents table yet
            // .eq('workspace_id', currentWorkspace.workspaceId);

            if (documentError) throw documentError;

            // Combine all items with their types
            const allItems: FolderItem[] = [
                ...(formData || []).map(item => ({
                    id: item.id,
                    name: item.name,
                    folder_id: item.folder_id,
                    type: 'form' as const
                })),
                ...(projectData || []).map(item => ({
                    id: item.id,
                    name: item.name,
                    folder_id: item.folder_id,
                    type: 'project' as const
                })),
                ...(documentData || []).map(item => {
                    // Check if item is a valid object with expected properties
                    if (item && typeof item === 'object' && 'id' in item && 'name' in item && 'folder_id' in item) {
                        // Use type assertion to tell TypeScript this is a valid item
                        const validItem = item as { id: string; name: string; folder_id: string };
                        return {
                            id: validItem.id,
                            name: validItem.name,
                            folder_id: validItem.folder_id,
                            type: 'document' as const
                        };
                    }
                    // Log error for debugging and return a placeholder to avoid runtime errors
                    console.error('Invalid document item:', item);
                    return null;
                }).filter(Boolean) as FolderItem[],
            ];

            setFolderItems(allItems);

        } catch (err: any) {
            console.error('Error fetching folders:', err);
            setError(err.message || 'Failed to fetch folders');
        } finally {
            setIsLoading(false);
        }
    };

    // Create a new folder
    const createFolder = async (name: string, parentFolderId: string | null = null): Promise<Folder | null> => {
        if (!currentWorkspace?.workspaceId) return null;

        try {
            const { data: userData } = await supabase.auth.getUser();

            const newFolder = {
                name,
                workspace_id: currentWorkspace.workspaceId,
                parent_folder_id: parentFolderId,
                created_by: userData.user?.id || null,
            };

            const { data, error } = await supabase
                .from('folders')
                .insert([newFolder])
                .select()
                .single();

            if (error) throw error;

            // Update local state
            setFolders(prev => [...prev, data]);

            return data;
        } catch (err: any) {
            console.error('Error creating folder:', err);
            setError(err.message || 'Failed to create folder');
            return null;
        }
    };

    // Update a folder
    const updateFolder = async (id: string, name: string): Promise<boolean> => {
        try {
            const { error } = await supabase
                .from('folders')
                .update({ name })
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setFolders(prev =>
                prev.map(folder =>
                    folder.id === id ? { ...folder, name } : folder
                )
            );

            return true;
        } catch (err: any) {
            console.error('Error updating folder:', err);
            setError(err.message || 'Failed to update folder');
            return false;
        }
    };

    // Delete a folder
    const deleteFolder = async (id: string): Promise<boolean> => {
        try {
            // First check if folder has any items
            const items = folderItems.filter(item => item.folder_id === id);
            if (items.length > 0) {
                throw new Error('Cannot delete folder with items. Move or delete items first.');
            }

            // Check if folder has any subfolders
            const subfolders = folders.filter(folder => folder.parent_folder_id === id);
            if (subfolders.length > 0) {
                throw new Error('Cannot delete folder with subfolders. Move or delete subfolders first.');
            }

            const { error } = await supabase
                .from('folders')
                .delete()
                .eq('id', id);

            if (error) throw error;

            // Update local state
            setFolders(prev => prev.filter(folder => folder.id !== id));

            // If current folder was deleted, set current folder to null
            if (currentFolder?.id === id) {
                setCurrentFolder(null);
            }

            return true;
        } catch (err: any) {
            console.error('Error deleting folder:', err);
            setError(err.message || 'Failed to delete folder');
            return false;
        }
    };

    // Duplicate a folder
    const duplicateFolder = async (id: string): Promise<Folder | null> => {
        try {
            // Find the folder to duplicate
            const folderToDuplicate = folders.find(folder => folder.id === id);
            if (!folderToDuplicate) {
                throw new Error('Folder not found');
            }

            // Create a new folder with the same name + " copy" and the same parent folder ID
            const newFolderName = `${folderToDuplicate.name} copy`;
            const parentFolderId = folderToDuplicate.parent_folder_id;

            // Use the existing createFolder function to create the new folder
            const newFolder = await createFolder(newFolderName, parentFolderId);

            return newFolder;
        } catch (err: any) {
            console.error('Error duplicating folder:', err);
            setError(err.message || 'Failed to duplicate folder');
            return null;
        }
    };

    // Get folder hierarchy as a nested object
    const getFolderHierarchy = () => {
        const hierarchy: { [key: string]: Folder[] } = {
            'root': folders.filter(folder => folder.parent_folder_id === null)
        };

        // Add child folders to their parents
        folders.forEach(folder => {
            if (folder.parent_folder_id) {
                if (!hierarchy[folder.parent_folder_id]) {
                    hierarchy[folder.parent_folder_id] = [];
                }
                hierarchy[folder.parent_folder_id].push(folder);
            }
        });

        return hierarchy;
    };

    // Get items for a specific folder
    const getFolderItems = (folderId: string) => {
        return folderItems.filter(item => item.folder_id === folderId);
    };

    const value = {
        folders,
        folderItems,
        currentFolder,
        isLoading,
        error,
        createFolder,
        updateFolder,
        deleteFolder,
        duplicateFolder,
        setCurrentFolder,
        getFolderHierarchy,
        getFolderItems,
        refreshFolders,
    };

    return (
        <FoldersContext.Provider value={value}>
            {children}
        </FoldersContext.Provider>
    );
};

export const useFolders = () => {
    const context = useContext(FoldersContext);
    if (context === undefined) {
        throw new Error('useFolders must be used within a FoldersProvider');
    }
    return context;
};