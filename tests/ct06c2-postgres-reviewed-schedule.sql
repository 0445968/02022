\set ON_ERROR_STOP on
\i tests/ct06b2b-postgres-review-inbox.sql
-- Clean the intentionally revoked draft image from earlier fixtures.
update public.stories set body='{"type":"doc","content":[{"type":"paragraph"}]}' where id='20000000-0000-0000-0000-000000000002';
\i supabase/migrations/20261124190734_ct06c_publication_gate.sql
do $fn$ begin
 if has_table_privilege('authenticated','newsroom_private.publication_permits','INSERT')
 or has_function_privilege('authenticated','newsroom_private.apply_reviewed_revision(uuid,uuid)','EXECUTE')
 or has_function_privilege('anon','public.staff_publish_reviewed_story(uuid,text,uuid,text)','EXECUTE') then raise exception 'Publication authority leaked';end if;
 begin update public.stories set status='published' where id='20000000-0000-0000-0000-000000000002';
 raise exception 'Privileged unreviewed publish succeeded';exception when insufficient_privilege then null;end;
 begin update public.stories set headline='Direct live overwrite' where id='20000000-0000-0000-0000-000000000001';
 raise exception 'Direct live overwrite succeeded';exception when insufficient_privilege then null;end;
 begin insert into public.story_tags(story_id,tag_id) values('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000008');
 raise exception 'Direct live taxonomy bypass';exception when insufficient_privilege then null;end;
 begin update public.stories set status='scheduled' where id='20000000-0000-0000-0000-000000000002';
 raise exception 'Schedule bypass';exception when insufficient_privilege then null;end;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000002';
begin
 v:=public.staff_read_review(sid,'draft');
 perform public.staff_change_review(sid,'draft','request',v->>'fingerprint',null,'Review saved initial publication copy',gen_random_uuid());
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000002'; rid uuid:='20000000-0000-0000-0000-000000000001';
begin
 v:=public.staff_read_review(sid,'draft');
 begin perform public.staff_publish_reviewed_story(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint');
 raise exception 'Unapproved draft published';exception when serialization_failure then null;end;
 v:=public.staff_change_review(sid,'draft','approve',v->>'fingerprint',(v->>'requestId')::uuid,'Initial article approved for publication',gen_random_uuid());
 v:=public.staff_read_review(rid,'revision');
 perform public.staff_change_review(rid,'revision','approve',v->>'fingerprint',(v->>'requestId')::uuid,'Revision approved for publication',gen_random_uuid());
end;
$fn$;
commit;
-- Approval cannot survive reviewer permission revocation.
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','story.review','deny','all','Revoke review for publication test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000002';
begin
 -- Read exact approved token as publisher via existing submitter authority.
 v:=public.staff_read_review(sid,'draft');
 begin perform public.staff_publish_reviewed_story(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint');
 raise exception 'Revoked reviewer approval published';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
-- Revoked image blocks publication even after review; no version or live row change.
begin;
update public.story_revisions set status='draft' where story_id='20000000-0000-0000-0000-000000000001';
update public.media_assets set rights_status='owned' where id='60000000-0000-0000-0000-000000000001';
update public.story_revisions set featured_image_id='60000000-0000-0000-0000-000000000001',image_credit='Credit' where story_id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000001';
begin v:=public.staff_read_review(sid,'revision');
 perform public.staff_change_review(sid,'revision','request',v->>'fingerprint',null,'Review revision with eligible feature',gen_random_uuid());end;
$fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000001';
begin v:=public.staff_read_review(sid,'revision');
 perform public.staff_change_review(sid,'revision','approve',v->>'fingerprint',(v->>'requestId')::uuid,'Approve revision with eligible feature',gen_random_uuid());end;
$fn$;
reset role;
update public.media_assets set rights_status='restricted' where id='60000000-0000-0000-0000-000000000001';
set local role authenticated;
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000001';
begin v:=public.staff_read_review(sid,'revision');
 begin perform public.staff_publish_reviewed_story(sid,'revision',(v->>'requestId')::uuid,v->>'fingerprint');
 raise exception 'Revoked featured media published';exception when invalid_parameter_value then null;end;
end;
$fn$;
rollback;

\i supabase/migrations/20261124193511_ct06c_reviewed_schedule.sql
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'story.schedule','all' from public.staff_role_presets where role_key='editor' on conflict do nothing;
do $fn$ begin
 if has_function_privilege('authenticated','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_function_privilege('service_role','newsroom_private.run_due_reviewed_publications(integer)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.reviewed_publication_schedules','INSERT') then raise exception 'Scheduler privilege leaked';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; rid uuid:='20000000-0000-0000-0000-000000000001'; v jsonb; q jsonb;
begin
 v:=public.staff_read_review(sid,'draft');
 begin perform public.staff_create_reviewed_schedule(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint',now()-interval '1 minute');
 raise exception 'Past schedule accepted';exception when invalid_parameter_value then null;end;
 q:=public.staff_create_reviewed_schedule(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint',now()+interval '1 hour');
 if q->>'state'<>'pending' or not (q->>'current')::boolean or public.staff_read_review(sid,'draft')->>'fingerprint'<>v->>'fingerprint' then raise exception 'Schedule changed approved source';end if;
 begin perform public.staff_publish_reviewed_story(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint');
 raise exception 'Immediate publication bypassed schedule';exception when serialization_failure then null;end;
 begin perform public.staff_create_reviewed_schedule(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint',now()+interval '2 hours');
 raise exception 'Duplicate schedule allowed';exception when serialization_failure then null;end;
 perform public.staff_cancel_reviewed_schedule(sid,'draft',(q->>'id')::uuid);
 if public.staff_read_reviewed_schedule(sid,'draft') is not null then raise exception 'Cancelled queue remains active';end if;
 perform public.staff_create_reviewed_schedule(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint',now()+interval '1 hour');
 v:=public.staff_read_review(rid,'revision');
 perform public.staff_create_reviewed_schedule(rid,'revision',(v->>'requestId')::uuid,v->>'fingerprint',now()+interval '1 hour');
end;
$fn$;
commit;
-- Test owner-only run without an Auth JWT; future rows must never publish.
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>0 or (r->>'blocked')::int<>0 then raise exception 'Future schedule executed';end if;
end; $fn$;
-- Simulate elapsed time on isolated fixtures only.
update newsroom_private.reviewed_publication_schedules set due_at=now()-interval '1 second' where state='pending';
begin;
-- Reviewer revocation invalidates both due schedules; subtransactions leave
-- live state, history and permits untouched.
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','story.review','deny','all','Revoke reviewer during scheduled execution','00000000-0000-0000-0000-000000000001');
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'blocked')::int<>2 or (r->>'published')::int<>0 or exists(select 1 from newsroom_private.publication_events) then raise exception 'Revoked reviewer execution escaped gate: %',r;end if;
end; $fn$;
rollback;
begin;
update public.stories set headline='Changed since schedule' where id='20000000-0000-0000-0000-000000000002';
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'blocked')::int<>1 or (r->>'published')::int<>1 then raise exception 'Stale schedule not isolated: %',r;end if;
 if (select status from public.stories where id='20000000-0000-0000-0000-000000000002')='published' then raise exception 'Stale draft published';end if;
end; $fn$;
rollback;
create temporary table ct06c2_versions as select count(*) n from public.story_versions;
create temporary table ct06c2_live as select published_at from public.stories where id='20000000-0000-0000-0000-000000000001';
do $fn$ declare r jsonb;begin
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>2 or (r->>'blocked')::int<>0 then raise exception 'Valid due publish failed: %',r;end if;
 r:=newsroom_private.run_due_reviewed_publications(5);
 if (r->>'published')::int<>0 or (r->>'blocked')::int<>0 then raise exception 'Duplicate due execution';end if;
 if (select count(*) from newsroom_private.publication_events)<>2 or exists(select 1 from newsroom_private.publication_permits)
 or (select count(*) from public.story_versions)<>(select n+2 from ct06c2_versions)
 or (select published_at from public.stories where id='20000000-0000-0000-0000-000000000001') is distinct from (select published_at from ct06c2_live)
 or (select count(*) from newsroom_private.reviewed_publication_schedules where state='published')<>2 then raise exception 'Scheduled publication history/permits invalid';end if;
end; $fn$;
select 'CT-06c.2 approved queue, future denial, cancellation, stale/revoked blocking, due execution and idempotence passed' as result;
