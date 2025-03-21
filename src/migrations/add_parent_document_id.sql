-- Add parent_document_id to documents table
ALTER TABLE public.documents
ADD COLUMN parent_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL;

-- Add content_type column to documents table
ALTER TABLE public.documents
ADD COLUMN content_type TEXT DEFAULT 'text';

-- Create document_versions table
CREATE TABLE IF NOT EXISTS public.document_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    version_note TEXT
);

-- Create document_references table
CREATE TABLE IF NOT EXISTS public.document_references (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    target_document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
    reference_type TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Add is_template flag to documents
ALTER TABLE public.documents
ADD COLUMN is_template BOOLEAN DEFAULT false;

-- Add permissions JSONB field to documents
ALTER TABLE public.documents
ADD COLUMN permissions JSONB DEFAULT '{}'::jsonb;

-- Create index on parent_document_id for faster queries
CREATE INDEX idx_documents_parent_document_id ON public.documents(parent_document_id);

-- Create index on document_id in document_versions
CREATE INDEX idx_document_versions_document_id ON public.document_versions(document_id);

-- Create indexes on document_references for faster lookups
CREATE INDEX idx_document_references_source ON public.document_references(source_document_id);
CREATE INDEX idx_document_references_target ON public.document_references(target_document_id);