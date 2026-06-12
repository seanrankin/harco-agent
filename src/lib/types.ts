export interface SourceDocument {
  id: string;
  title: string;
  file_type: string;
  file_size_bytes: number;
  source_email_id?: string | null;
}
