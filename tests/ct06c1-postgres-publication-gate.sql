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
create temporary table ct06c_before as select to_jsonb(s) row from public.stories s where id='20000000-0000-0000-0000-000000000001';
create temporary table ct06c_versions as select count(*) n from public.story_versions;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare v jsonb; sid uuid:='20000000-0000-0000-0000-000000000002'; rid uuid:='20000000-0000-0000-0000-000000000001';
begin
 v:=public.staff_read_review(sid,'draft');
 begin perform public.staff_publish_reviewed_story(sid,'draft',(v->>'requestId')::uuid,repeat('a',64));
 raise exception 'Wrong fingerprint published';exception when serialization_failure then null;end;
 v:=public.staff_publish_reviewed_story(sid,'draft',(v->>'requestId')::uuid,v->>'fingerprint');
 if v->>'status'<>'published' then raise exception 'Initial publish failed';end if;
 v:=public.staff_read_review(rid,'revision');
 v:=public.staff_publish_reviewed_story(rid,'revision',(v->>'requestId')::uuid,v->>'fingerprint');
 if v->>'status'<>'published' then raise exception 'Revision publish failed';end if;
end;
$fn$;
commit;
do $fn$ begin
 if (select count(*) from newsroom_private.publication_events)<>2 or exists(select 1 from newsroom_private.publication_permits)
 or (select count(*) from public.story_versions)<>(select n+2 from ct06c_versions)
 or exists(select 1 from public.story_revisions where story_id='20000000-0000-0000-0000-000000000001')
 or (select published_at::text from public.stories where id='20000000-0000-0000-0000-000000000001')::timestamptz is distinct from (select (row->>'published_at')::timestamptz from ct06c_before)
 then raise exception 'Publication audit, history or live preservation wrong';end if;
end; $fn$;
select 'CT-06c.1 mandatory exact approval, reviewer recheck, media rights, version and bypass protection passed' as result;
