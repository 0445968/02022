-- CT-09 staged only. CLI #45508804980. No public voting activation or staff grants.
begin;
create table newsroom_private.poll_settings(
 singleton boolean primary key default true check(singleton),
 public_enabled boolean not null default false
);
insert into newsroom_private.poll_settings(singleton,public_enabled) values(true,false);
create table newsroom_private.polls(
 id uuid primary key default gen_random_uuid(),
 language text not null check(language in ('en','es')),
 question text not null check(char_length(question) between 3 and 240),
 options text[] not null check(cardinality(options) between 2 and 8),
 opens_at timestamptz not null, closes_at timestamptz not null,
 response_cap integer not null check(response_cap between 5 and 100000),
 status text not null default 'draft' check(status in ('draft','in_review','approved','published','retired')),
 version integer not null default 1 check(version>0),
 creator uuid not null,last_editor uuid not null,reviewer uuid,
 closed_at timestamptz,results_released boolean not null default false,
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 check(isfinite(opens_at) and isfinite(closes_at) and closes_at>opens_at and closes_at-opens_at<=interval '365 days')
);
create table newsroom_private.poll_votes(
 poll_id uuid not null references newsroom_private.polls(id) on delete restrict,
 voter_id uuid not null references auth.users(id) on delete cascade,
 choice integer not null check(choice between 0 and 7),
 created_at timestamptz not null default clock_timestamp(),
 primary key(poll_id,voter_id)
);
create index ct09_vote_rate on newsroom_private.poll_votes(voter_id,created_at desc);
create index ct09_public_polls on newsroom_private.polls(language,opens_at desc,id) where status='published';
create table newsroom_private.poll_events(
 id bigint generated always as identity primary key,
 poll_id uuid not null references newsroom_private.polls(id) on delete restrict,
 actor uuid not null,action text not null,version integer not null,
 occurred_at timestamptz not null default clock_timestamp(),
 unique(poll_id,version)
);
alter table newsroom_private.poll_settings enable row level security;
alter table newsroom_private.polls enable row level security;
alter table newsroom_private.poll_votes enable row level security;
alter table newsroom_private.poll_events enable row level security;
revoke all on table newsroom_private.poll_settings,newsroom_private.polls,newsroom_private.poll_votes,newsroom_private.poll_events from public,anon,authenticated,service_role;
create function newsroom_private.poll_staff_allowed(p_key text)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and newsroom_private.has_staff_permission('newsroom.access')
 and newsroom_private.has_staff_permission('poll.view_manage')
 and p_key in ('poll.view_manage','poll.edit','poll.publish','poll.manage_results')
 and newsroom_private.has_staff_permission(p_key)
$fn$;
create function newsroom_private.poll_counts(p_id uuid,p_options integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$
 select coalesce(jsonb_agg(coalesce(v.n,0) order by o.i),'[]'::jsonb)
 from generate_series(0,p_options-1) o(i)
 left join (select choice,count(*) n from newsroom_private.poll_votes where poll_id=p_id group by choice) v on v.choice=o.i
$fn$;
create function newsroom_private.staff_poll_projection(p newsroom_private.polls)
returns jsonb language sql stable security invoker set search_path='' set timezone='UTC'
as $fn$
 select jsonb_build_object('id',p.id,'language',p.language,'question',p.question,'options',p.options,
 'opensAt',p.opens_at,'closesAt',p.closes_at,'cap',p.response_cap,'status',p.status,'version',p.version,
 'closedAt',p.closed_at,'resultsReleased',p.results_released,
 'canApprove',p.status='in_review' and p.creator<>(select auth.uid()) and p.last_editor<>(select auth.uid()) and newsroom_private.poll_staff_allowed('poll.publish'),
 'counts',case when newsroom_private.poll_staff_allowed('poll.manage_results') then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end)
$fn$;
create function newsroom_private.staff_list_polls(p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare result jsonb;
begin
 if not newsroom_private.poll_staff_allowed('poll.view_manage') then raise exception 'Poll access denied' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 with rows as materialized(select p.*,row_number() over(order by updated_at desc,id) rn from newsroom_private.polls p order by updated_at desc,id limit 21 offset p_page*20)
 select jsonb_build_object('items',coalesce(jsonb_agg(newsroom_private.staff_poll_projection(p) order by r.rn) filter(where r.rn<=p_page*20+20),'[]'::jsonb),
 'hasMore',count(*)>20 and p_page<100,'canEdit',newsroom_private.poll_staff_allowed('poll.edit'),
 'canPublish',newsroom_private.poll_staff_allowed('poll.publish'),'canManageResults',newsroom_private.poll_staff_allowed('poll.manage_results'))
 into result from rows r join newsroom_private.polls p on p.id=r.id;
 return result;
end;
$fn$;
create function newsroom_private.staff_change_poll(p_action text,p_id uuid,p_version integer,p_copy jsonb)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC'
as $fn$
declare p newsroom_private.polls%rowtype; actor uuid:=(select auth.uid()); lang text; q text; opts text[]; start_at timestamptz; end_at timestamptz; cap integer; needed text;
begin
 needed:=case when p_action in ('create','save','submit','withdraw') then 'poll.edit'
 when p_action in ('approve','return','publish','close','retire') then 'poll.publish'
 when p_action='release_results' then 'poll.manage_results' else null end;
 if needed is null then raise exception 'Invalid action' using errcode='22023';end if;
 if not newsroom_private.poll_staff_allowed(needed) then raise exception 'Poll action denied' using errcode='42501';end if;
 if p_action in ('create','save') then
  if jsonb_typeof(p_copy) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_copy))<>6
   or not (p_copy ?& array['language','question','options','opensAt','closesAt','cap'])
   or jsonb_typeof(p_copy->'language') is distinct from 'string' or jsonb_typeof(p_copy->'question') is distinct from 'string'
   or jsonb_typeof(p_copy->'options') is distinct from 'array'
   or jsonb_typeof(p_copy->'opensAt') is distinct from 'string' or jsonb_typeof(p_copy->'closesAt') is distinct from 'string'
   or jsonb_typeof(p_copy->'cap') is distinct from 'number' then raise exception 'Invalid poll copy' using errcode='22023';end if;
  if jsonb_array_length(p_copy->'options') not between 2 and 8
   or exists(select 1 from jsonb_array_elements(p_copy->'options') v where jsonb_typeof(v) is distinct from 'string') then raise exception 'Invalid options' using errcode='22023';end if;
  lang:=p_copy->>'language';q:=btrim(p_copy->>'question');
  select array_agg(btrim(v.value) order by v.n) into opts from jsonb_array_elements_text(p_copy->'options') with ordinality v(value,n);
  if lang not in ('en','es') or char_length(q) not between 3 and 240 or q~'[[:cntrl:]]'
   or exists(select 1 from unnest(opts) o where char_length(o) not between 1 and 120 or o~'[[:cntrl:]]')
   or (select count(distinct lower(o)) from unnest(opts) o)<>cardinality(opts)
   or p_copy->>'opensAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$'
   or p_copy->>'closesAt' !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?Z$'
   or p_copy->>'cap' !~ '^[0-9]{1,6}$' then raise exception 'Invalid poll copy' using errcode='22023';end if;
  begin start_at:=(p_copy->>'opensAt')::timestamptz;end_at:=(p_copy->>'closesAt')::timestamptz;cap:=(p_copy->>'cap')::integer;
  exception when invalid_datetime_format or datetime_field_overflow or invalid_text_representation or numeric_value_out_of_range then raise exception 'Invalid window' using errcode='22023';end;
  if not isfinite(start_at) or not isfinite(end_at) or end_at<=start_at or end_at-start_at>interval '365 days'
   or end_at<=clock_timestamp() or start_at>clock_timestamp()+interval '365 days' or cap not between 5 and 100000 then raise exception 'Invalid window or cap' using errcode='22023';end if;
 elsif p_copy is not null then raise exception 'Unexpected copy' using errcode='22023';end if;
 if p_action='create' then
  if p_id is not null or p_version is not null then raise exception 'Invalid create' using errcode='22023';end if;
  insert into newsroom_private.polls(language,question,options,opens_at,closes_at,response_cap,creator,last_editor)
  values(lang,q,opts,start_at,end_at,cap,actor,actor) returning * into p;
 else
  if p_id is null or p_version is null or p_version<1 then raise exception 'Invalid poll version' using errcode='22023';end if;
  select * into p from newsroom_private.polls where id=p_id for update;
  if not found then raise exception 'Poll unavailable' using errcode='42501';end if;
  if p.version<>p_version then raise exception 'Poll changed' using errcode='40001';end if;
  case p_action
   when 'save' then
    if p.status<>'draft' then raise exception 'Only draft editable' using errcode='40001';end if;
    update newsroom_private.polls set language=lang,question=q,options=opts,opens_at=start_at,closes_at=end_at,response_cap=cap,last_editor=actor,reviewer=null where id=p.id;
   when 'submit' then
    if p.status<>'draft' or p.closes_at<=clock_timestamp() then raise exception 'Draft unavailable' using errcode='40001';end if;
    update newsroom_private.polls set status='in_review',reviewer=null where id=p.id;
   when 'withdraw' then
    if p.status not in ('in_review','approved') then raise exception 'Poll cannot be withdrawn' using errcode='40001';end if;
    update newsroom_private.polls set status='draft',reviewer=null where id=p.id;
   when 'return' then
    if p.status<>'in_review' then raise exception 'Review unavailable' using errcode='40001';end if;
    update newsroom_private.polls set status='draft',reviewer=null where id=p.id;
   when 'approve' then
    if p.status<>'in_review' or p.creator=actor or p.last_editor=actor then raise exception 'Independent review required' using errcode='42501';end if;
    update newsroom_private.polls set status='approved',reviewer=actor where id=p.id;
   when 'publish' then
    if p.status<>'approved' or p.reviewer is null or p.closes_at<=clock_timestamp() then raise exception 'Approved current poll required' using errcode='40001';end if;
    -- Recheck current reviewer authority using the existing actor resolver.
    if not coalesce(public.staff_invite_verified_identity(p.reviewer),false)
     or not newsroom_private.publication_actor_permission(p.reviewer,'newsroom.access')
     or not newsroom_private.publication_actor_permission(p.reviewer,'poll.view_manage')
     or not newsroom_private.publication_actor_permission(p.reviewer,'poll.publish') then raise exception 'Reviewer no longer eligible' using errcode='42501';end if;
    update newsroom_private.polls set status='published' where id=p.id;
   when 'close' then
    if p.status<>'published' or p.closed_at is not null or p.closes_at<=clock_timestamp() then raise exception 'Poll not open for closure' using errcode='40001';end if;
    update newsroom_private.polls set closed_at=clock_timestamp() where id=p.id;
   when 'release_results' then
    if p.status<>'published' or (p.closed_at is null and p.closes_at>clock_timestamp()) or p.results_released then raise exception 'Closed poll required' using errcode='40001';end if;
    if (select count(*) from newsroom_private.poll_votes where poll_id=p.id)<5 then raise exception 'Insufficient responses' using errcode='22023';end if;
    update newsroom_private.polls set results_released=true where id=p.id;
   when 'retire' then
    if p.status<>'published' then raise exception 'Published poll required' using errcode='40001';end if;
    update newsroom_private.polls set status='retired',closed_at=coalesce(closed_at,clock_timestamp()) where id=p.id;
   else raise exception 'Invalid action' using errcode='22023';
  end case;
  update newsroom_private.polls set version=version+1,updated_at=clock_timestamp() where id=p.id returning * into p;
 end if;
 insert into newsroom_private.poll_events(poll_id,actor,action,version) values(p.id,actor,p_action,p.version);
 return newsroom_private.staff_poll_projection(p);
end;
$fn$;
create function newsroom_private.public_list_polls(p_language text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare result jsonb; actor uuid:=(select auth.uid()); verified boolean;
begin
 if p_language is null or p_language not in ('en','es') or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 if not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) then
  return jsonb_build_object('enabled',false,'items','[]'::jsonb,'hasMore',false,'verified',false);end if;
 verified:=coalesce(public.staff_invite_verified_identity(actor),false);
 with rows as materialized(select p.* from newsroom_private.polls p where p.language=p_language and p.status='published' and p.opens_at<=statement_timestamp()
  order by opens_at desc,id limit 21 offset p_page*20),
 numbered as(select r.*,row_number() over(order by opens_at desc,id) rn from rows r)
 select jsonb_build_object('enabled',true,'verified',verified,'hasMore',count(*)>20 and p_page<100,
 'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'question',p.question,'options',p.options,'closesAt',p.closes_at,
  'open',p.closed_at is null and p.closes_at>statement_timestamp(),
  'ownChoice',case when verified then (select v.choice from newsroom_private.poll_votes v where v.poll_id=p.id and v.voter_id=actor) else null end,
  'counts',case when p.results_released and (p.closed_at is not null or p.closes_at<=statement_timestamp())
   and (select count(*) from newsroom_private.poll_votes v where v.poll_id=p.id)>=5
   then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end)
 order by p.opens_at desc,p.id) filter(where p.rn<=20),'[]'::jsonb)) into result from numbered p;
 return result;
end;
$fn$;
create function newsroom_private.reader_vote_poll(p_id uuid,p_choice integer)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC'
as $fn$
declare actor uuid:=(select auth.uid()); p newsroom_private.polls%rowtype; previous integer; n bigint;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false)
 or not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) then raise exception 'Voting unavailable' using errcode='42501';end if;
 if p_id is null or p_choice is null or p_choice not between 0 and 7 then raise exception 'Invalid choice' using errcode='22023';end if;
 -- Serialize per-reader rate limit across polls and exact poll cap/close.
 perform pg_advisory_xact_lock(hashtextextended(actor::text,90209));
 select * into p from newsroom_private.polls where id=p_id and status='published' and opens_at<=clock_timestamp() for update;
 if not found then raise exception 'Poll unavailable' using errcode='42501';end if;
 if p_choice>=cardinality(p.options) then raise exception 'Invalid choice' using errcode='22023';end if;
 select choice into previous from newsroom_private.poll_votes where poll_id=p.id and voter_id=actor;
 if found then
  if previous<>p_choice then raise exception 'Vote already recorded' using errcode='40001';end if;
  return jsonb_build_object('pollId',p.id,'choice',previous,'alreadyVoted',true);
 end if;
 if p.closed_at is not null or p.closes_at<=clock_timestamp() then raise exception 'Poll closed' using errcode='40001';end if;
 if (select count(*) from newsroom_private.poll_votes where voter_id=actor and created_at>clock_timestamp()-interval '1 minute')>=5 then raise exception 'Vote rate exceeded' using errcode='54000';end if;
 select count(*) into n from newsroom_private.poll_votes where poll_id=p.id;
 if n>=p.response_cap then raise exception 'Poll full' using errcode='40001';end if;
 insert into newsroom_private.poll_votes(poll_id,voter_id,choice) values(p.id,actor,p_choice);
 if n+1>=p.response_cap then update newsroom_private.polls set closed_at=clock_timestamp(),version=version+1,updated_at=clock_timestamp() where id=p.id;end if;
 return jsonb_build_object('pollId',p.id,'choice',p_choice,'alreadyVoted',false);
end;
$fn$;
revoke all on function newsroom_private.poll_staff_allowed(text),newsroom_private.poll_counts(uuid,integer),newsroom_private.staff_poll_projection(newsroom_private.polls),newsroom_private.staff_list_polls(integer),newsroom_private.staff_change_poll(text,uuid,integer,jsonb),newsroom_private.public_list_polls(text,integer),newsroom_private.reader_vote_poll(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.staff_list_polls(integer),newsroom_private.staff_change_poll(text,uuid,integer,jsonb),newsroom_private.reader_vote_poll(uuid,integer) to authenticated;
grant execute on function newsroom_private.public_list_polls(text,integer) to anon,authenticated;
create function public.staff_list_polls(p_page integer) returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.staff_list_polls(p_page) $fn$;
create function public.staff_change_poll(p_action text,p_id uuid,p_version integer,p_copy jsonb) returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.staff_change_poll(p_action,p_id,p_version,p_copy) $fn$;
create function public.public_list_polls(p_language text,p_page integer) returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.public_list_polls(p_language,p_page) $fn$;
create function public.reader_vote_poll(p_id uuid,p_choice integer) returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.reader_vote_poll(p_id,p_choice) $fn$;
revoke all on function public.staff_list_polls(integer),public.staff_change_poll(text,uuid,integer,jsonb),public.public_list_polls(text,integer),public.reader_vote_poll(uuid,integer) from public,anon,authenticated,service_role;
grant execute on function public.staff_list_polls(integer),public.staff_change_poll(text,uuid,integer,jsonb),public.reader_vote_poll(uuid,integer) to authenticated;
grant execute on function public.public_list_polls(text,integer) to anon,authenticated;
commit;
