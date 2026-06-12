create policy "Authenticated users can read documents bucket"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'documents');

create policy "Service role can insert documents"
  on storage.objects for insert
  to service_role
  with check (bucket_id = 'documents');;
