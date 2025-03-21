# ClickUp-Style Document System Implementation

This document outlines the implementation of a ClickUp-style document system in our application.

## Features

- **Hierarchical Document Structure**: Documents can be nested within other documents, creating a tree-like structure.
- **Document Versioning**: Automatic versioning of documents when saved, with the ability to restore previous versions.
- **Rich Content**: Support for structured content with different block types (text, headings, lists, etc.).
- **Document References**: Documents can reference other documents, creating a web of connected information.
- **Folder Organization**: Documents can be organized into folders for better management.
- **Permissions**: Document-level permissions for fine-grained access control.

## Database Schema

The document system uses the following tables:

### documents

```sql
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    content TEXT,
    content_type TEXT DEFAULT 'text',
    folder_id UUID REFERENCES public.folders(id) ON DELETE SET NULL,
    parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    is_template BOOLEAN DEFAULT false,
    permissions JSONB DEFAULT '{}'::jsonb
);
```

### document_versions

```sql
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    version_note TEXT
);
```

### document_references

```sql
CREATE TABLE IF NOT EXISTS public.document_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    reference_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);
```

## Frontend Components

### DocumentsContext

The `DocumentsContext` provides a central place for managing documents and their relationships. It includes functions for:

- Creating, updating, and deleting documents
- Managing document versions
- Handling document references
- Fetching child documents
- Managing document permissions

### Document Editor

The document editor page (`/dashboard/documents/[id]/page.tsx`) provides:

- Rich content editing with a block-based editor (Slate.js)
- Support for headings, paragraphs, lists, code blocks, etc.
- Text formatting (bold, italic, underline, code)
- Document versioning with restore capability
- Child document management
- Document references and relationships
- Document metadata

### New Document Page

The new document page (`/dashboard/documents/new/page.tsx`) allows users to:

- Create new documents
- Specify a parent document
- Select a folder
- Add initial content

## Future Enhancements

### Phase 1: Document Structure (Completed)
- ✅ Add parent_document_id to documents table
- ✅ Update folder menu to show nested document structure
- ✅ Modify document creation/editing to support parent-child relationships

### Phase 2: Rich Content Editor (Completed)
- ✅ Change content field from text to JSON
- ✅ Implement block-based editor using Slate.js
- ✅ Add block types: headings, paragraphs, lists, code blocks, etc.
- ✅ Support rich text formatting (bold, italic, underline, code)

### Phase 3: References and Relations (Completed)
- ✅ Implement document reference system
- ✅ Add document linking functionality
- ✅ Create relationships between documents (related, parent-child, dependency, etc.)
- ✅ Add references tab to document editor

### Phase 4: Permissions and Sharing (Completed)
- ✅ Implement document-specific permissions
- ✅ Add shared link generation
- ✅ Create view-only mode for external users
- ✅ Add permissions tab to document editor

## Usage

### Creating a Document

1. Navigate to the Documents page
2. Click the "New" button
3. Enter a title and content
4. Optionally select a parent document and folder
5. Click "Create Document"

### Editing a Document

1. Navigate to the document
2. Edit the content in the editor
3. Click "Save" to save changes
4. A new version is automatically created

### Managing Child Documents

1. Navigate to the document
2. Click the "Child Documents" tab
3. Create new child documents or manage existing ones

### Viewing Document Versions

1. Navigate to the document
2. Click the "Versions" tab
3. View and restore previous versions

### Managing Document References

1. Navigate to the document
2. Click the "References" tab
3. Add references to other documents
4. Specify the reference type (related, parent-child, dependency, etc.)
5. Click on references to navigate to the referenced documents

### Managing Document Permissions

1. Navigate to the document
2. Click the "Permissions" tab
3. Toggle public access on/off
4. Copy the share link for public documents
5. Add specific users with different access levels (view, edit, admin)