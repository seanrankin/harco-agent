ALTER TABLE public.documents ADD COLUMN source_email_id uuid REFERENCES public.documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.documents.source_email_id IS 'For attachment documents extracted from emails, points to the parent email document';

CREATE INDEX idx_documents_source_email_id ON public.documents(source_email_id) WHERE source_email_id IS NOT NULL;;
