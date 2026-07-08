create table public.attempts (
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_id text not null,
  cert_id text not null,
  mode text not null,
  domain text,
  question_ids jsonb not null,
  results jsonb not null default '{}'::jsonb,
  started_at timestamptz not null,
  finished_at timestamptz,
  elapsed_sec integer not null default 0,
  pause_count integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, attempt_id)
);

alter table public.attempts enable row level security;

create policy "attempts owner select" on public.attempts for select using (auth.uid() = user_id);
create policy "attempts owner insert" on public.attempts for insert with check (auth.uid() = user_id);
create policy "attempts owner update" on public.attempts for update using (auth.uid() = user_id);
create policy "attempts owner delete" on public.attempts for delete using (auth.uid() = user_id);
