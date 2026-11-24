\set ON_ERROR_STOP on
\i tests/ct05b2-postgres-assigned-revisions.sql
alter table auth.users add column email text,add column email_confirmed_at timestamptz,
 add column is_anonymous boolean not null default false,add column deleted_at timestamptz,add column banned_until timestamptz;
update auth.users set email=id::text||'@example.invalid',email_confirmed_at=now();
create function public.staff_invite_verified_identity(p_user uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select exists(select 1 from auth.users u where u.id=p_user
    and u.email is not null and u.email_confirmed_at is not null
    and u.email_confirmed_at<=pg_catalog.statement_timestamp()
    and u.is_anonymous=false and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=pg_catalog.statement_timestamp()))
$fn$;
revoke all on function public.staff_invite_verified_identity(uuid) from public,anon,authenticated;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,cap::public.staff_capability_key,'all' from public.staff_role_presets cross join (values('newsroom.access'),('story.review'),('story.submit_review')) c(cap)
where role_key in ('owner','editor') on conflict do nothing;
-- Deliberate reviewer grant on writer for self-review denial fixture.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select id,'story.review','assigned' from public.staff_role_presets where role_key='freelancer' on conflict do nothing;
\i supabase/migrations/20261124182027_ct06b_review_lifecycle.sql
do $fn$
begin
 if has_function_privilege('anon','public.staff_read_review(uuid,text)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.story_review_requests','INSERT')
 or has_table_privilege('authenticated','newsroom_private.story_review_decisions','SELECT')
 or has_function_privilege('authenticated','newsroom_private.has_current_review_approval(uuid,text)','EXECUTE') then raise exception 'Review privilege leak';end if;
end;
$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; rid uuid:='20000000-0000-0000-0000-000000000001'; s jsonb; v jsonb;
begin
 s:=public.staff_read_review(sid,'draft');
 if s->>'status'<>'draft' or (s->>'canRequest')::boolean then raise exception 'Unsubmitted draft reviewable';end if;
 begin
  perform public.staff_change_review(sid,'draft','request',s->>'fingerprint',null,'Attempt before draft submission',gen_random_uuid());
  raise exception 'Unsubmitted draft request accepted';exception when serialization_failure then null;end;
 update public.stories set status='in_review',updated_by=auth.uid() where id=sid;
 s:=public.staff_read_review(sid,'draft');
 s:=public.staff_change_review(sid,'draft','request',s->>'fingerprint',null,'Please review submitted draft','82000000-0000-0000-0000-000000000001');
 if not (s->>'current')::boolean or (s->>'canDecide')::boolean or s->>'requestId' is null then raise exception 'Request or independence incorrect';end if;
 begin
  perform public.staff_change_review(sid,'draft','approve',s->>'fingerprint',(s->>'requestId')::uuid,'Attempt to approve own article',gen_random_uuid());
  raise exception 'Self approval succeeded';exception when insufficient_privilege then null;end;
 begin
  perform public.staff_change_review(sid,'draft','request',s->>'fingerprint',null,'Duplicate request for same copy',gen_random_uuid());
  raise exception 'Duplicate request succeeded';exception when serialization_failure then null;end;
 v:=public.staff_read_review(rid,'revision');
 v:=public.staff_change_review(rid,'revision','request',v->>'fingerprint',null,'Please review unpublished revision','82000000-0000-0000-0000-000000000002');
 if v->>'revisionId' is null or not (v->>'current')::boolean then raise exception 'Revision request failed';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; rid uuid:='20000000-0000-0000-0000-000000000001'; s jsonb; v jsonb;
begin
 s:=public.staff_read_review(sid,'draft');
 if not (s->>'canDecide')::boolean then raise exception 'Independent reviewer not allowed';end if;
 s:=public.staff_change_review(sid,'draft','request_changes',s->>'fingerprint',(s->>'requestId')::uuid,'Please clarify the reporting source','82000000-0000-0000-0000-000000000003');
 if s->>'status'<>'draft' or s->>'decision'<>'changes_requested' or (s->>'current')::boolean then raise exception 'Requested changes failed';end if;
 v:=public.staff_read_review(rid,'revision');
 v:=public.staff_change_review(rid,'revision','approve',v->>'fingerprint',(v->>'requestId')::uuid,'Revision meets editorial standards','82000000-0000-0000-0000-000000000004');
 if v->>'decision'<>'approved' or not (v->>'current')::boolean or (v->>'canDecide')::boolean then raise exception 'Revision approval failed';end if;
 begin
  perform public.staff_change_review(rid,'revision','reject',v->>'fingerprint',(v->>'requestId')::uuid,'Attempt to replace immutable decision',gen_random_uuid());
  raise exception 'Decision overwritten';exception when serialization_failure then null;end;
end;
$fn$;
commit;
do $fn$
begin
 if not newsroom_private.has_current_review_approval('20000000-0000-0000-0000-000000000001','revision') then raise exception 'Current approval missing';end if;
 if not exists(select 1 from public.stories s join ct05b2_live b on to_jsonb(s)=b.row where s.id='20000000-0000-0000-0000-000000000001') then raise exception 'Review mutated live story';end if;
end;
$fn$;
-- A reversible relation mutation still invalidates the exact approval.
begin;
insert into public.story_tags(story_id,tag_id) values('20000000-0000-0000-0000-000000000001','50000000-0000-0000-0000-000000000008');
delete from public.story_tags where story_id='20000000-0000-0000-0000-000000000001' and tag_id='50000000-0000-0000-0000-000000000008';
do $fn$ begin
 if newsroom_private.has_current_review_approval('20000000-0000-0000-0000-000000000001','revision') then raise exception 'Reverted relation reused approval';end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; s jsonb; oldhash text;
begin
 s:=public.staff_read_review(sid,'draft');
 if s->'history'->0->>'decisionNote'<>'Please clarify the reporting source' then raise exception 'Contributor feedback missing';end if;
 oldhash:=s->>'fingerprint';
 update public.stories set headline='Clarified reporting',status='in_review',updated_by=auth.uid() where id=sid;
 begin
  perform public.staff_change_review(sid,'draft','request',oldhash,null,'Attempt stale review registration',gen_random_uuid());
  raise exception 'Stale request succeeded';exception when serialization_failure then null;end;
 s:=public.staff_read_review(sid,'draft');
 s:=public.staff_change_review(sid,'draft','request',s->>'fingerprint',null,'Resubmitting clarified reporting','82000000-0000-0000-0000-000000000005');
 if jsonb_array_length(s->'history')<>2 or not (s->>'current')::boolean then raise exception 'Resubmission history lost';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare sid uuid:='20000000-0000-0000-0000-000000000002'; s jsonb;
begin
 s:=public.staff_read_review(sid,'draft');
 s:=public.staff_change_review(sid,'draft','reject',s->>'fingerprint',(s->>'requestId')::uuid,'Article requires further sourcing','82000000-0000-0000-0000-000000000006');
 if s->>'decision'<>'rejected' or s->>'status'<>'draft' then raise exception 'Rejection failed';end if;
end;
$fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.staff_read_review('20000000-0000-0000-0000-000000000001','revision');
 raise exception 'Reader saw review';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
select 'CT-06b.1 immutable review decisions, independent actor, stale tokens, feedback and published isolation passed' as result;
