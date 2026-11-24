\set ON_ERROR_STOP on
\i tests/ct02f-postgres-publishing.sql
-- Real legacy-shaped fixture: add timestamp columns/defaults and triggers.
alter table public.stories add column updated_at timestamptz not null default now();
alter table public.story_revisions alter column id set default gen_random_uuid(),
 add column updated_by uuid, add column created_at timestamptz not null default now(),
 add column updated_at timestamptz not null default now();
create function public.test_revision_updated_at() returns trigger language plpgsql as $$
begin new.updated_at=clock_timestamp();return new;end $$;
create trigger story_revisions_set_updated_at before update on public.story_revisions for each row execute function public.test_revision_updated_at();
grant select on public.story_categories,public.story_tags to authenticated;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'newsroom.access','all' from public.staff_role_presets where role_key='freelancer';
insert into public.staff_story_assignments(story_id,membership_id,assignment_type)
values('20000000-0000-0000-0000-000000000001','10000000-0000-0000-0000-000000000003','author');
delete from public.story_revisions where story_id='20000000-0000-0000-0000-000000000001';
update public.stories set body='{"type":"doc","content":[{"type":"paragraph"}]}' where id='20000000-0000-0000-0000-000000000001';
\i supabase/migrations/20261124165002_ct05b_assigned_revision_guard.sql
do $$ begin
 if has_function_privilege('anon','public.staff_read_assigned_revision(uuid)','EXECUTE') then raise exception 'Anonymous RPC grant';end if;
end $$;
create temporary table ct05b2_live as select to_jsonb(s) as row from public.stories s where id='20000000-0000-0000-0000-000000000001';
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$
declare sid uuid:='20000000-0000-0000-0000-000000000001';
 v jsonb; a jsonb; b jsonb; rid uuid; body jsonb:='{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Proposed copy"}]}]}';
begin
 v:=public.staff_read_assigned_revision(sid);
 if v->>'revisionId' is not null then raise exception 'Unexpected revision';end if;
 begin
   insert into public.story_revisions(story_id,headline,slug,created_by,updated_by,body)
   values(sid,'Forged revision','stolen-slug',auth.uid(),auth.uid(),body);
   raise exception 'Forged revision accepted';
 exception when insufficient_privilege then null;end;
 a:=public.staff_save_assigned_revision(sid,(v->>'liveUpdatedAt')::timestamptz,null,(v->>'updatedAt')::timestamptz,
  'save','Proposed headline',null,null,body);
 rid:=(a->>'revisionId')::uuid;
 if rid is null or a->>'headline'<>'Proposed headline' then raise exception 'Revision not saved';end if;
 if not exists(select 1 from public.story_revisions r join public.stories s on s.id=r.story_id where r.id=rid
    and r.slug=s.slug and r.author_id=s.author_id and r.short_title=s.short_title
    and r.category_ids=array(select category_id from public.story_categories where story_id=sid order by category_id)
    and r.tag_ids=array(select tag_id from public.story_tags where story_id=sid order by tag_id)) then raise exception 'Metadata not preserved';end if;
 begin
  perform public.staff_save_assigned_revision(sid,(v->>'liveUpdatedAt')::timestamptz,null,(v->>'updatedAt')::timestamptz,'save','Stale initial',null,null,body);
  raise exception 'Duplicate creation allowed';
 exception when serialization_failure then null;end;
 begin
  update public.story_revisions set slug='changed',updated_by=auth.uid() where id=rid;
  raise exception 'Protected metadata changed';
 exception when insufficient_privilege then null;end;
 b:=public.staff_save_assigned_revision(sid,(a->>'liveUpdatedAt')::timestamptz,rid,(a->>'updatedAt')::timestamptz,'submit','Submitted revision',null,null,body);
 if b->>'status'<>'in_review' or (b->>'canSubmit')::boolean then raise exception 'Submission failed';end if;
 begin
  update public.story_revisions set status='draft',updated_by=auth.uid() where id=rid;
  raise exception 'Contributor reopened submitted revision';
 exception when insufficient_privilege then null;end;
 begin
  perform public.publish_story_revision(sid,auth.uid());
  raise exception 'Contributor published';
 exception when insufficient_privilege then null;end;
end $$;
commit;
do $$ begin
 if not exists(select 1 from public.stories s join ct05b2_live b on to_jsonb(s)=b.row where s.id='20000000-0000-0000-0000-000000000001')
 then raise exception 'Live story changed during assigned revision';end if;
end $$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$ begin
 begin perform public.staff_read_assigned_revision('20000000-0000-0000-0000-000000000001');
 raise exception 'Reader read revision';exception when insufficient_privilege then null;end;
end $$;
rollback;
select 'CT-05b.2 assigned revision guard, submission and live preservation passed' as result;
