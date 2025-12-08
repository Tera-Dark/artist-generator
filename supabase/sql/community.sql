-- Community sharing + moderation + voting schema
-- Run with: supabase db execute --file supabase/sql/community.sql

-- Extensions (safe if already exists)
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";

-- Table: prompt_submissions (raw submissions before review)
create table if not exists public.prompt_submissions (
  id text primary key,
  prompt text not null,
  model text not null,
  tags text[] default '{}'::text[] not null,
  description text default '' not null,
  username text default '' not null,
  status text default 'pending' not null,
  created_at timestamptz default now() not null,
  reviewed_by text,
  review_reason text
);

-- Status constraint (runs once; may exist already)
-- Note: Postgres does not support IF NOT EXISTS on constraints, so ignore errors if re-applying
do $$ begin
  alter table public.prompt_submissions
    add constraint prompt_submissions_status_check
      check (status in ('pending','approved','rejected'));
exception when duplicate_object then null; end $$;

-- Table: shared_prompts (approved prompts visible to public)
create table if not exists public.shared_prompts (
  id text primary key,
  prompt text not null,
  model text not null,
  tags text[] default '{}'::text[] not null,
  description text default '' not null,
  username text default '' not null,
  status text default 'approved' not null,
  created_at timestamptz default now() not null,
  upvotes integer default 0 not null,
  downvotes integer default 0 not null
);

-- Status constraint for shared_prompts
do $$ begin
  alter table public.shared_prompts
    add constraint shared_prompts_status_check
      check (status in ('approved'));
exception when duplicate_object then null; end $$;

-- Table: prompt_votes (one vote per IP per prompt)
create table if not exists public.prompt_votes (
  prompt_id text not null references public.shared_prompts(id) on delete cascade,
  ip_hash text not null,
  vote text not null,
  created_at timestamptz default now() not null,
  primary key (prompt_id, ip_hash)
);

-- Vote value constraint
do $$ begin
  alter table public.prompt_votes
    add constraint prompt_votes_vote_check
      check (vote in ('up','down'));
exception when duplicate_object then null; end $$;

-- Helpful indexes
create index if not exists idx_shared_prompts_created_at on public.shared_prompts(created_at desc);
create index if not exists idx_prompt_votes_prompt on public.prompt_votes(prompt_id);

-- Enable Row Level Security
alter table public.prompt_submissions enable row level security;
alter table public.shared_prompts enable row level security;
alter table public.prompt_votes enable row level security;

-- RLS policies
-- Allow anonymous users to insert submissions; force pending status
create policy if not exists public_submit_prompt on public.prompt_submissions
  for insert
  to anon
  using (true)
  with check (status = 'pending');

-- Service role can read pending submissions (edge function)
create policy if not exists service_read_pending on public.prompt_submissions
  for select
  to service_role
  using (status = 'pending');

-- Public can read approved shared prompts
create policy if not exists public_read_approved on public.shared_prompts
  for select
  to anon
  using (status = 'approved');

-- Only service_role can insert votes (via Edge Function)
create policy if not exists service_insert_votes on public.prompt_votes
  for insert
  to service_role
  using (true)
  with check (true);

-- Optional: allow public read of vote aggregates (individual votes are hashed already)
create policy if not exists public_read_votes on public.prompt_votes
  for select
  to anon
  using (true);