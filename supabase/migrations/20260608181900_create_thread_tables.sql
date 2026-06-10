-- Create threads and messages tables for multi-thread chat history

create table public.threads (
  id text primary key default gen_random_uuid()::text,
  user_id uuid not null references auth.users(id),
  title text,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id text primary key,
  thread_id text not null references public.threads(id) on delete cascade,
  parent_id text,
  format text not null,
  content jsonb not null,
  created_at timestamptz not null default now()
);

-- Indexes
create index threads_user_id_idx on public.threads(user_id);
create index messages_thread_id_idx on public.messages(thread_id);

-- Enable RLS
alter table public.threads enable row level security;
alter table public.messages enable row level security;

-- RLS policies for threads
create policy "Users can select own threads"
  on public.threads for select
  using (auth.uid() = user_id);

create policy "Users can insert own threads"
  on public.threads for insert
  with check (auth.uid() = user_id);

create policy "Users can update own threads"
  on public.threads for update
  using (auth.uid() = user_id);

create policy "Users can delete own threads"
  on public.threads for delete
  using (auth.uid() = user_id);

-- RLS policies for messages
create policy "Users can select messages in own threads"
  on public.messages for select
  using (thread_id in (select id from public.threads where user_id = auth.uid()));

create policy "Users can insert messages in own threads"
  on public.messages for insert
  with check (thread_id in (select id from public.threads where user_id = auth.uid()));
