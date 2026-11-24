\set ON_ERROR_STOP on
\i tests/ct06b2a-postgres-review-submission.sql
\i supabase/migrations/20261124183816_ct06b_review_inbox.sql
do $fn$ begin
 if has_table_privilege('authenticated','newsroom_private.review_feedback_receipts','INSERT')
 or has_table_privilege('authenticated','newsroom_private.review_feedback_receipts','SELECT')
 or has_function_privilege('anon','public.staff_read_review_inbox(text,integer)','EXECUTE') then raise exception 'Inbox privilege leak';end if;
end; $fn$;
-- Current revision pending, draft has three historical decisions for writer.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$
declare p jsonb; id uuid;
begin
 p:=public.staff_read_review_inbox('pending',0);
 if jsonb_array_length(p->'items')<>1 or p->'items'->0->>'kind'<>'revision'
 or p->'items'->0->>'storyId'<>'20000000-0000-0000-0000-000000000001' then raise exception 'Current eligible reviewer inbox wrong: %',p;end if;
 if jsonb_array_length(public.staff_read_review_inbox('feedback',0)->'items')<>0 then raise exception 'Other requester feedback leaked';end if;
 id:=(public.staff_read_review('20000000-0000-0000-0000-000000000002','draft')->>'requestId')::uuid;
 begin perform public.staff_acknowledge_review_feedback(id);
 raise exception 'Other user acknowledged feedback';exception when insufficient_privilege then null;end;
end;
$fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$
declare p jsonb; id uuid; first jsonb; again jsonb; n integer;
begin
 if jsonb_array_length(public.staff_read_review_inbox('pending',0)->'items')<>0 then raise exception 'Own review visible in pending';end if;
 p:=public.staff_read_review_inbox('unread',0);
 n:=jsonb_array_length(p->'items');
 if n<3 or not exists(select 1 from jsonb_array_elements(p->'items') x where x->>'note'='Please add source attribution') then raise exception 'Own feedback missing: %',p;end if;
 id:=(p->'items'->0->>'id')::uuid;
 first:=public.staff_acknowledge_review_feedback(id);again:=public.staff_acknowledge_review_feedback(id);
 if first is distinct from again or first->>'readAt' is null then raise exception 'Receipt not idempotent';end if;
 if jsonb_array_length(public.staff_read_review_inbox('unread',0)->'items')<>n-1 then raise exception 'Unread not reduced';end if;
 if not exists(select 1 from jsonb_array_elements(public.staff_read_review_inbox('feedback',0)->'items') x where x->>'id'=id::text and x->>'readAt' is not null) then raise exception 'Read state not persisted';end if;
end;
$fn$;
commit;
-- Stale revision disappears without leaking old count.
begin;
update public.story_revisions set headline='Changed after submission' where story_id='20000000-0000-0000-0000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if jsonb_array_length(public.staff_read_review_inbox('pending',0)->'items')<>0 then raise exception 'Stale request in pending';end if;
end; $fn$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','story.review','deny','all','Deny reviewer inbox test','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ begin
 if jsonb_array_length(public.staff_read_review_inbox('pending',0)->'items')<>0 then raise exception 'Denied reviewer sees pending';end if;
end; $fn$;
rollback;
begin;
update public.staff_story_assignments set status='revoked' where membership_id='10000000-0000-0000-0000-000000000003';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $fn$ begin
 if jsonb_array_length(public.staff_read_review_inbox('feedback',0)->'items')<>0 then raise exception 'Revoked requester retained feedback';end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ begin
 begin perform public.staff_read_review_inbox('pending',0);
 raise exception 'Reader inbox exposed';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
select 'CT-06b.2b scoped current inbox, recipient-only feedback and idempotent read receipts passed' as result;
