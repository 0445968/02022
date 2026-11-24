\set ON_ERROR_STOP on
\i tests/ct02e-postgres-rls.sql
-- Extend the isolated legacy-shaped test fixture with actual copy columns.
alter table public.stories add column subheadline text,add column summary text,
 add column body jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}',
 add column updated_by uuid,add column updated_at timestamptz not null default now();
create function public.test_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=clock_timestamp();return new;end $$;
create trigger stories_set_updated_at before update on public.stories for each row execute function public.test_updated_at();
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'newsroom.access','all' from public.staff_role_presets where role_key='freelancer';
\i supabase/migrations/20261124164358_ct05b_assigned_draft_guard.sql
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare n integer; v_stamp timestamptz;
begin
 select updated_at into v_stamp from public.stories where id='20000000-0000-0000-0000-000000000002';
 update public.stories set headline='Saved copy',updated_by=auth.uid()
 where id='20000000-0000-0000-0000-000000000002' and status='draft' and updated_at=v_stamp;
 get diagnostics n=row_count;if n<>1 then raise exception 'Authorized copy save failed';end if;
 update public.stories set headline='Stale copy',updated_by=auth.uid()
 where id='20000000-0000-0000-0000-000000000002' and status='draft' and updated_at=v_stamp;
 get diagnostics n=row_count;if n<>0 then raise exception 'Stale update succeeded';end if;
 begin
   update public.stories set updated_by='00000000-0000-0000-0000-000000000001',headline='Forged actor'
   where id='20000000-0000-0000-0000-000000000002';raise exception 'Forged actor accepted';
 exception when insufficient_privilege then null;end;
 begin
   update public.stories set created_by=auth.uid(),updated_by=auth.uid()
   where id='20000000-0000-0000-0000-000000000002';
   -- created_by was already this user; force a genuinely different value.
   update public.stories set created_by='00000000-0000-0000-0000-000000000001',updated_by=auth.uid()
   where id='20000000-0000-0000-0000-000000000002';raise exception 'Creator change accepted';
 exception when insufficient_privilege then null;end;
 begin
   update public.stories set body='{"type":"doc","content":[{"type":"image","attrs":{"src":"https://example.invalid/forged.jpg"}}]}',updated_by=auth.uid()
   where id='20000000-0000-0000-0000-000000000002';raise exception 'Unreviewed image accepted';
 exception when insufficient_privilege then null;end;
 update public.stories set status='in_review',headline='Submitted copy',updated_by=auth.uid()
 where id='20000000-0000-0000-0000-000000000002' and status='draft';
 get diagnostics n=row_count;if n<>1 then raise exception 'Submission failed';end if;
 begin
   update public.stories set status='draft',updated_by=auth.uid() where id='20000000-0000-0000-0000-000000000002';
   raise exception 'Contributor reopened review';
 exception when insufficient_privilege then null;end;
 begin
   update public.stories set headline='Late edit',updated_by=auth.uid() where id='20000000-0000-0000-0000-000000000002';
   raise exception 'Contributor edited submitted copy';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
begin;
delete from public.staff_role_capabilities where role_preset_id=(select id from public.staff_role_presets where role_key='freelancer') and capability_key='story.submit_review';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$ begin
 begin
   update public.stories set status='in_review',updated_by=auth.uid() where id='20000000-0000-0000-0000-000000000002';
   raise exception 'No-submit grant bypass';
 exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'CT-05b.1 isolated draft copy CAS and review guard passed' as result;
