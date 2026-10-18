-- Incidents are optional practice and never become exam attempts.
create or replace function public.incident_progress_valid(p_answers jsonb, p_cursor integer, p_draft integer)
returns boolean
language plpgsql immutable security invoker set search_path = ''
as $$
declare
  entry record;
  answer_count integer;
  i integer;
begin
  if p_answers is null or pg_catalog.jsonb_typeof(p_answers) <> 'object' or p_cursor is null or p_cursor < 0 or p_cursor > 3 then return false; end if;
  select pg_catalog.count(*)::integer into answer_count from pg_catalog.jsonb_object_keys(p_answers);
  if answer_count > 3 or p_cursor > answer_count or answer_count > p_cursor + 1 then return false; end if;
  for entry in select key, value from pg_catalog.jsonb_each(p_answers) loop
    if entry.key !~ '^[0-2]$' or pg_catalog.jsonb_typeof(entry.value) <> 'number' or entry.value::text !~ '^[0-4]$' then return false; end if;
  end loop;
  if answer_count > 0 then
    for i in 0..answer_count - 1 loop
      if not (p_answers ? i::text) then return false; end if;
    end loop;
  end if;
  return p_draft is null or (p_draft >= 0 and p_draft <= 4 and p_cursor < 3 and answer_count = p_cursor);
end;
$$;
revoke all on function public.incident_progress_valid(jsonb, integer, integer) from public, anon;
grant execute on function public.incident_progress_valid(jsonb, integer, integer) to authenticated;

create table public.incident_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  incident_id text not null check (incident_id in ('outdated-policy-retrieval', 'duplicated-tool-refund-retry', 'cross-user-retrieval-leak', 'latency-cost-surge', 'evaluation-production-gap')),
  run_id uuid not null,
  content_version text not null check (pg_catalog.length(content_version) between 1 and 100),
  answers jsonb not null default '{}'::jsonb,
  cursor smallint not null default 0,
  draft smallint,
  created_at timestamptz not null default pg_catalog.now(),
  updated_at timestamptz not null default pg_catalog.now(),
  primary key (user_id, incident_id),
  constraint incident_progress_valid_state check (public.incident_progress_valid(answers, cursor::integer, draft::integer))
);
alter table public.incident_progress enable row level security;
create policy incident_progress_owner_select on public.incident_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy incident_progress_owner_insert on public.incident_progress for insert to authenticated with check ((select auth.uid()) = user_id);
create policy incident_progress_owner_update on public.incident_progress for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy incident_progress_owner_delete on public.incident_progress for delete to authenticated using ((select auth.uid()) = user_id);
revoke all on public.incident_progress from public, anon;
grant select, insert, update, delete on public.incident_progress to authenticated;

create or replace function public.save_incident_progress(
  p_incident_id text,
  p_run_id uuid,
  p_content_version text,
  p_answers jsonb,
  p_cursor integer,
  p_draft integer,
  p_reset boolean default false,
  p_expected_run_id uuid default null
)
returns setof public.incident_progress
language plpgsql security invoker set search_path = ''
as $$
declare
  owner_id uuid := auth.uid();
  current_run public.incident_progress%rowtype;
  merged_answers jsonb;
  merged_cursor integer;
  merged_draft integer;
begin
  if owner_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if p_incident_id is null or p_incident_id not in ('outdated-policy-retrieval', 'duplicated-tool-refund-retry', 'cross-user-retrieval-leak', 'latency-cost-surge', 'evaluation-production-gap')
    or p_run_id is null or p_content_version is null or pg_catalog.length(p_content_version) not between 1 and 100
    or p_reset is null or not public.incident_progress_valid(p_answers, p_cursor, p_draft)
    then raise exception 'Invalid incident progress' using errcode = '22023'; end if;
  if p_reset and (p_answers <> '{}'::jsonb or p_cursor <> 0 or p_draft is not null) then
    raise exception 'Replay must start empty' using errcode = '22023';
  end if;
  -- Serialize absent-row creation as well as existing-row changes for each owner/case.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(owner_id::text || ':' || p_incident_id, 0));
  select * into current_run from public.incident_progress where user_id = owner_id and incident_id = p_incident_id for update;
  if not found then
    -- A reset expecting an existing generation must never recreate a deleted run.
    if p_reset and p_expected_run_id is not null then return; end if;
    return query insert into public.incident_progress(user_id, incident_id, run_id, content_version, answers, cursor, draft)
      values (owner_id, p_incident_id, p_run_id, p_content_version, p_answers, p_cursor::smallint, p_draft::smallint) returning *;
    return;
  end if;
  if p_reset then
    if p_expected_run_id is distinct from current_run.run_id or p_run_id = current_run.run_id then return next current_run; return; end if;
    return query update public.incident_progress set run_id = p_run_id, content_version = p_content_version,
      answers = '{}'::jsonb, cursor = 0, draft = null, created_at = pg_catalog.now(), updated_at = pg_catalog.clock_timestamp()
      where user_id = owner_id and incident_id = p_incident_id returning *;
    return;
  end if;
  if p_run_id <> current_run.run_id or p_content_version <> current_run.content_version then return next current_run; return; end if;
  -- Existing committed answers have priority, including simultaneous first answers.
  merged_answers := p_answers || current_run.answers;
  merged_cursor := greatest(p_cursor, current_run.cursor::integer);
  merged_draft := case when merged_cursor = 3 or merged_answers ? merged_cursor::text then null
    when p_cursor = merged_cursor then p_draft else current_run.draft::integer end;
  return query update public.incident_progress set answers = merged_answers, cursor = merged_cursor::smallint,
    draft = merged_draft::smallint, updated_at = pg_catalog.clock_timestamp()
    where user_id = owner_id and incident_id = p_incident_id returning *;
end;
$$;
revoke all on function public.save_incident_progress(text, uuid, text, jsonb, integer, integer, boolean, uuid) from public, anon;
grant execute on function public.save_incident_progress(text, uuid, text, jsonb, integer, integer, boolean, uuid) to authenticated;
