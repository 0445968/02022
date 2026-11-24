\set ON_ERROR_STOP on
\i tests/ct08c-postgres-completion.sql
\i supabase/migrations/20261124231848_ct09_polls.sql
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['poll.view_manage','poll.edit','poll.publish','poll.manage_results']) k
where p.role_key in ('owner','editor') on conflict do nothing;
create temporary table ct09_ids(id uuid);
grant select,insert on ct09_ids to authenticated;
do $fn$ begin
 if has_schema_privilege('anon','newsroom_private','USAGE')
 or has_table_privilege('authenticated','newsroom_private.poll_votes','SELECT')
 or has_table_privilege('authenticated','newsroom_private.polls','UPDATE')
 or has_function_privilege('anon','public.reader_vote_poll(uuid,integer)','EXECUTE')
 or has_function_privilege('authenticated','newsroom_private.poll_counts(uuid,integer)','EXECUTE') then raise exception 'Poll privilege leak';end if;
 if (public.public_list_polls('en',0)->>'enabled')::boolean then raise exception 'Public gate not off';end if;
end; $fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;c jsonb;id uuid;begin
 c:=jsonb_build_object('language','en','question','Fixture poll question','options',jsonb_build_array('Yes','No'),
 'opensAt',to_char(now()-interval '1 hour','YYYY-MM-DD"T"HH24:MI:SS"Z"'),
 'closesAt',to_char(now()+interval '1 day','YYYY-MM-DD"T"HH24:MI:SS"Z"'),'cap',5);
 p:=public.staff_change_poll('create',null,null,c);id:=(p->>'id')::uuid;
 insert into ct09_ids values(id);
 p:=public.staff_change_poll('submit',id,1,null);
 if p->>'status'<>'in_review' then raise exception 'Review transition failed';end if;
 begin perform public.staff_change_poll('approve',id,2,null);raise exception 'Self approval accepted';exception when insufficient_privilege then null;end;
 begin perform public.staff_change_poll('save',id,1,c);raise exception 'Stale edit accepted';exception when serialization_failure then null;end;
 begin perform public.staff_change_poll('publish',id,2,null);raise exception 'Unapproved publication accepted';exception when serialization_failure then null;end;
end; $fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $fn$ declare p jsonb;id uuid;begin
 select x.id into id from ct09_ids x;
 p:=public.staff_change_poll('approve',id,2,null);
 if p->>'status'<>'approved' then raise exception 'Independent approval failed';end if;
 p:=public.staff_change_poll('publish',id,3,null);
 if p->>'status'<>'published' then raise exception 'Publication failed';end if;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ declare id uuid;begin
 select x.id into id from ct09_ids x;
 begin perform public.staff_list_polls(0);raise exception 'Reader staff access';exception when insufficient_privilege then null;end;
 begin perform public.reader_vote_poll(id,0);raise exception 'Disabled gate bypass';exception when insufficient_privilege then null;end;
end; $fn$;
rollback;
-- Test-only activation, no migration enables voting.
update newsroom_private.poll_settings set public_enabled=true where singleton;
begin;
set local role anon;
do $fn$ declare p jsonb;begin
 p:=public.public_list_polls('en',0);
 if jsonb_array_length(p->'items')<>1 or p->'items'->0->'counts'<>'null'::jsonb or p->'items'->0->'ownChoice'<>'null'::jsonb then raise exception 'Public leak: %',p;end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$ declare id uuid;p jsonb;begin
 select x.id into id from ct09_ids x;
 p:=public.reader_vote_poll(id,0);
 if (p->>'alreadyVoted')::boolean then raise exception 'First vote duplicate';end if;
 p:=public.reader_vote_poll(id,0);
 if not (p->>'alreadyVoted')::boolean then raise exception 'Replay not idempotent';end if;
 begin perform public.reader_vote_poll(id,1);raise exception 'Changed vote accepted';exception when serialization_failure then null;end;
 p:=public.public_list_polls('en',0);
 if (p->'items'->0->>'ownChoice')::int<>0 or p->'items'->0->'counts'<>'null'::jsonb then raise exception 'Own choice or results incorrect';end if;
end; $fn$;
commit;
-- Add four verified test readers, then reach cap and confirm permanent closure.
insert into auth.users(id,email,email_confirmed_at,is_anonymous)
select ('99000000-0000-0000-0000-'||lpad(n::text,12,'0'))::uuid,'poll-fixture-'||n||'@example.invalid',now(),false from generate_series(1,5) n;
begin;
set local role authenticated;
do $fn$ declare id uuid;n integer;r jsonb;begin
 select x.id into id from ct09_ids x;
 for n in 1..4 loop
  perform set_config('request.jwt.claim.sub','99000000-0000-0000-0000-'||lpad(n::text,12,'0'),true);
  r:=public.reader_vote_poll(id,n%2);
 end loop;
 perform set_config('request.jwt.claim.sub','99000000-0000-0000-0000-000000000005',true);
 begin perform public.reader_vote_poll(id,0);raise exception 'Cap exceeded';exception when serialization_failure then null;end;
end; $fn$;
commit;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;id uuid;begin
 select x.id into id from ct09_ids x;
 p:=public.staff_change_poll('release_results',id,5,null);
 if not (p->>'resultsReleased')::boolean then raise exception 'Results release failed';end if;
 p:=public.public_list_polls('en',0);
 if (p->'items'->0->>'open')::boolean or p->'items'->0->'counts'<>jsonb_build_array(3,2) then raise exception 'Public aggregate wrong: %',p;end if;
end; $fn$;
commit;
begin;
delete from auth.users where id='99000000-0000-0000-0000-000000000001';
do $fn$ declare p jsonb;begin
 p:=public.public_list_polls('en',0);
 if (p->'items'->0->>'open')::boolean or p->'items'->0->'counts'<>'null'::jsonb then raise exception 'Deletion reopened cap or exposed small result';end if;
end; $fn$;
rollback;
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
values('10000000-0000-0000-0000-000000000002','poll.manage_results','deny','all','Deny results regression','00000000-0000-0000-0000-000000000001');
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_list_polls(0);
 if (p->>'canManageResults')::boolean or p->'items'->0->'counts'<>'null'::jsonb then raise exception 'Denied staff results leaked';end if;
end; $fn$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare id uuid;p jsonb;begin
 select x.id into id from ct09_ids x;
 p:=public.staff_change_poll('retire',id,6,null);
 if p->>'status'<>'retired' or jsonb_array_length(public.public_list_polls('en',0)->'items')<>0 then raise exception 'Retirement failed';end if;
end; $fn$;
rollback;
update newsroom_private.poll_settings set public_enabled=false where singleton;
select 'CT09 poll approval, voting, replay, cap, privacy and retirement verified' as result;
