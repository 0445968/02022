-- CT16 bilingual polls, staged only. No new poll or ballot is created.
begin;
create table newsroom_private.poll_translation_settings(singleton boolean primary key check(singleton),public_enabled boolean not null default false);
insert into newsroom_private.poll_translation_settings values(true,false);
create table newsroom_private.poll_translations(
 poll_id uuid primary key references newsroom_private.polls(id) on delete restrict,
 language text not null check(language in ('en','es')),
 revision integer not null check(revision>0),
 source_fingerprint text not null check(source_fingerprint~'^[0-9a-f]{64}$'),
 question text not null check(char_length(question) between 3 and 240),
 options text[] not null check(cardinality(options) between 2 and 8),
 status text not null check(status in ('draft','in_review','approved','published')),
 creator uuid not null,last_editor uuid not null,reviewer uuid,
 published_fingerprint text,
 published_question text,published_options text[],
 updated_at timestamptz not null default clock_timestamp(),
 check((published_fingerprint is null and published_question is null and published_options is null) or (published_fingerprint is not null and published_question is not null and published_options is not null))
);
create table newsroom_private.poll_translation_events(
 poll_id uuid not null references newsroom_private.poll_translations(poll_id) on delete restrict,
 revision integer not null,actor uuid not null,action text not null check(action in ('save','submit','return','approve','publish','withdraw')),
 reason text not null check(length(btrim(reason)) between 12 and 500),snapshot jsonb not null,at timestamptz not null default clock_timestamp(),
 primary key(poll_id,revision)
);
alter table newsroom_private.poll_translation_settings enable row level security;
alter table newsroom_private.poll_translations enable row level security;
alter table newsroom_private.poll_translation_events enable row level security;
revoke all on newsroom_private.poll_translation_settings,newsroom_private.poll_translations,newsroom_private.poll_translation_events from public,anon,authenticated,service_role;
create function newsroom_private.poll_source_fingerprint(p newsroom_private.polls)
returns text language sql immutable security invoker set search_path='' as $fn$
 select encode(sha256(convert_to(jsonb_build_array(p.language,p.question,p.options)::text,'UTF8')),'hex')
$fn$;
create function newsroom_private.poll_translation_visible(p_id uuid,p_language text)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select coalesce((select public_enabled from newsroom_private.poll_translation_settings where singleton),false)
 and exists(select 1 from newsroom_private.poll_translations t join newsroom_private.polls p on p.id=t.poll_id
 where t.poll_id=p_id and t.language=p_language and p.language<>t.language and p.status='published'
 and t.published_fingerprint=newsroom_private.poll_source_fingerprint(p)
 and cardinality(t.published_options)=cardinality(p.options))
$fn$;
create function newsroom_private.read_poll_translation(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare p newsroom_private.polls%rowtype;t newsroom_private.poll_translations%rowtype;h jsonb;
begin
 if not newsroom_private.poll_staff_allowed('poll.view_manage') then raise exception 'Poll translation unavailable' using errcode='42501';end if;
 select * into p from newsroom_private.polls where id=p_id;
 if not found then raise exception 'Poll unavailable' using errcode='42501';end if;
 select * into t from newsroom_private.poll_translations where poll_id=p_id;
 select coalesce(jsonb_agg(jsonb_build_object('revision',revision,'action',action,'at',at,'reason',reason) order by revision desc),'[]'::jsonb) into h from (select revision,action,at,reason from newsroom_private.poll_translation_events where poll_id=p_id order by revision desc limit 20) v;
 return jsonb_build_object('pollId',p.id,'sourceLanguage',p.language,'targetLanguage',case when p.language='en' then 'es' else 'en' end,'sourceQuestion',p.question,'sourceOptions',p.options,'sourceFingerprint',newsroom_private.poll_source_fingerprint(p),'sourceStatus',p.status,
 'revision',coalesce(t.revision,0),'status',coalesce(t.status,'draft'),'question',coalesce(t.question,''),'options',coalesce(t.options,array_fill(''::text,array[cardinality(p.options)])),
 'stale',coalesce(t.source_fingerprint<>newsroom_private.poll_source_fingerprint(p),false),'published',t.published_fingerprint is not null,'publishedQuestion',t.published_question,'publishedOptions',t.published_options,
 'canEdit',p.status='published' and newsroom_private.poll_staff_allowed('poll.edit'),'canPublish',p.status='published' and newsroom_private.poll_staff_allowed('poll.publish'),
 'canApprove',coalesce(p.status='published' and t.status='in_review' and t.creator<>auth.uid() and t.last_editor<>auth.uid() and newsroom_private.poll_staff_allowed('poll.publish'),false),'history',h);
end;$fn$;
create function newsroom_private.change_poll_translation(p_id uuid,p_expected integer,p_fingerprint text,p_action text,p_copy jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare p newsroom_private.polls%rowtype;t newsroom_private.poll_translations%rowtype;actor uuid:=auth.uid();fp text; q text;opts text[]; needed text;
begin
 if p_id is null or p_expected is null or p_expected<0 or p_expected>=2147483647 or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$' or p_action is null or p_action not in ('save','submit','withdraw','return','approve','publish') or ((p_action='save')<>(p_copy is not null)) or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid translation command' using errcode='22023';end if;
 needed:=case when p_action in ('save','submit','withdraw') then 'poll.edit' else 'poll.publish' end;
 perform pg_advisory_xact_lock(202611,2302);
 if not newsroom_private.poll_staff_allowed(needed) then raise exception 'Translation action denied' using errcode='42501';end if;
 select * into p from newsroom_private.polls where id=p_id for update;
 if not found or p.status<>'published' then raise exception 'Reviewed published original required' using errcode='42501';end if;
 fp:=newsroom_private.poll_source_fingerprint(p);
 select * into t from newsroom_private.poll_translations where poll_id=p_id for update;
 if coalesce(t.revision,0)<>p_expected or fp<>p_fingerprint then raise exception 'Translation or source changed' using errcode='40001';end if;
 if p_action='save' then
  if t.status in ('in_review','approved') then raise exception 'Withdraw review before editing' using errcode='40001';end if;
  if jsonb_typeof(p_copy) is distinct from 'object' or (select count(*) from jsonb_object_keys(p_copy))<>2 or not p_copy?&array['question','options'] or jsonb_typeof(p_copy->'question') is distinct from 'string' or jsonb_typeof(p_copy->'options') is distinct from 'array' then raise exception 'Invalid translated copy' using errcode='22023';end if;
  if jsonb_array_length(p_copy->'options')<>cardinality(p.options) or exists(select 1 from jsonb_array_elements(p_copy->'options') v where jsonb_typeof(v) is distinct from 'string') then raise exception 'Original option positions are required' using errcode='22023';end if;
  q:=btrim(p_copy->>'question');select array_agg(btrim(v.value) order by v.n) into opts from jsonb_array_elements_text(p_copy->'options') with ordinality v(value,n);
  if char_length(q) not between 3 and 240 or q~'[[:cntrl:]]' or exists(select 1 from unnest(opts) o where char_length(o) not between 1 and 120 or o~'[[:cntrl:]]') or (select count(distinct lower(o)) from unnest(opts) o)<>cardinality(opts) then raise exception 'Invalid translated labels' using errcode='22023';end if;
  insert into newsroom_private.poll_translations(poll_id,language,revision,source_fingerprint,question,options,status,creator,last_editor)
   values(p_id,case when p.language='en' then 'es' else 'en' end,p_expected+1,fp,q,opts,'draft',actor,actor)
   on conflict(poll_id) do update set revision=excluded.revision,source_fingerprint=excluded.source_fingerprint,question=excluded.question,options=excluded.options,status='draft',last_editor=actor,reviewer=null,updated_at=clock_timestamp();
 else
  if t.poll_id is null or t.source_fingerprint<>fp then raise exception 'Save current source translation first' using errcode='40001';end if;
  case p_action
   when 'submit' then
    if t.status<>'draft' then raise exception 'Draft required' using errcode='40001';end if;
    update newsroom_private.poll_translations set status='in_review',reviewer=null where poll_id=p_id;
   when 'withdraw' then
    if t.status not in ('in_review','approved') then raise exception 'Review unavailable' using errcode='40001';end if;
    update newsroom_private.poll_translations set status='draft',reviewer=null where poll_id=p_id;
   when 'return' then
    if t.status<>'in_review' then raise exception 'Review unavailable' using errcode='40001';end if;
    update newsroom_private.poll_translations set status='draft',reviewer=null where poll_id=p_id;
   when 'approve' then
    if t.status<>'in_review' or t.creator=actor or t.last_editor=actor then raise exception 'Independent translation reviewer required' using errcode='42501';end if;
    update newsroom_private.poll_translations set status='approved',reviewer=actor where poll_id=p_id;
   when 'publish' then
    if t.status<>'approved' or t.reviewer is null or t.reviewer=t.creator or t.reviewer=t.last_editor or not coalesce(public.staff_invite_verified_identity(t.reviewer),false) or not newsroom_private.publication_actor_permission(t.reviewer,'newsroom.access') or not newsroom_private.publication_actor_permission(t.reviewer,'poll.view_manage') or not newsroom_private.publication_actor_permission(t.reviewer,'poll.publish') then raise exception 'Current independent approval required' using errcode='42501';end if;
    update newsroom_private.poll_translations set status='published',published_fingerprint=fp,published_question=t.question,published_options=t.options where poll_id=p_id;
  end case;
  update newsroom_private.poll_translations set revision=revision+1,updated_at=clock_timestamp() where poll_id=p_id;
 end if;
 select * into t from newsroom_private.poll_translations where poll_id=p_id;
 insert into newsroom_private.poll_translation_events(poll_id,revision,actor,action,reason,snapshot) values(p_id,t.revision,actor,p_action,btrim(p_reason),to_jsonb(t));
 return newsroom_private.read_poll_translation(p_id);
end;$fn$;
create or replace function newsroom_private.public_list_polls(p_language text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC'
as $fn$
declare result jsonb; actor uuid:=(select auth.uid()); verified boolean;
begin
 if p_language is null or p_language not in ('en','es') or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 if not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) then
  return jsonb_build_object('enabled',false,'items','[]'::jsonb,'hasMore',false,'verified',false);end if;
 verified:=coalesce(public.staff_invite_verified_identity(actor),false);
 with rows as materialized(select p.* from newsroom_private.polls p where (p.language=p_language or newsroom_private.poll_translation_visible(p.id,p_language)) and p.status='published' and p.opens_at<=statement_timestamp()
  order by opens_at desc,id limit 21 offset p_page*20),
 numbered as(select r.*,row_number() over(order by opens_at desc,id) rn from rows r)
 select jsonb_build_object('enabled',true,'verified',verified,'hasMore',count(*)>20 and p_page<100,
 'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'question',case when p.language=p_language then p.question else tr.published_question end,'options',case when p.language=p_language then p.options else tr.published_options end,'closesAt',p.closes_at,
  'open',p.closed_at is null and p.closes_at>statement_timestamp(),
  'ownChoice',case when verified then (select v.choice from newsroom_private.poll_votes v where v.poll_id=p.id and v.voter_id=actor) else null end,
  'counts',case when p.results_released and (p.closed_at is not null or p.closes_at<=statement_timestamp())
   and (select count(*) from newsroom_private.poll_votes v where v.poll_id=p.id)>=5
   then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end)
 order by p.opens_at desc,p.id) filter(where p.rn<=20),'[]'::jsonb)) into result from numbered p left join newsroom_private.poll_translations tr on tr.poll_id=p.id and tr.language=p_language;
 return result;
end;
$fn$;
create or replace function newsroom_private.public_placed_polls(p_language text,p_kind text,p_target text)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); verified boolean; result jsonb;
begin
 if p_language is null or p_language not in ('en','es') or p_kind is null or p_target is null or length(p_target)>120 then raise exception 'Invalid placement' using errcode='22023';end if;
 if not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) or not newsroom_private.poll_placement_target_valid(p_kind,p_target) then return jsonb_build_object('enabled',false,'items','[]'::jsonb,'hasMore',false,'verified',false);end if;
 verified:=coalesce(public.staff_invite_verified_identity(actor),false);
 with rows as materialized(select p.* from newsroom_private.polls p join newsroom_private.poll_placement_state s on s.poll_id=p.id
 where (p.language=p_language or newsroom_private.poll_translation_visible(p.id,p_language)) and p.status='published' and p.opens_at<=statement_timestamp()
 and exists(select 1 from jsonb_array_elements(s.published) x where x->>'kind'=p_kind and x->>'target'=p_target
 and ((x->>'startsAt') is null or (x->>'startsAt')::timestamptz<=statement_timestamp())
 and ((x->>'endsAt') is null or (x->>'endsAt')::timestamptz>statement_timestamp()))
 order by p.opens_at desc,p.id limit 21),
 numbered as(select r.*,row_number() over(order by opens_at desc,id) rn from rows r)
 select jsonb_build_object('enabled',true,'verified',verified,'hasMore',count(*)>20,'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'question',case when p.language=p_language then p.question else tr.published_question end,'options',case when p.language=p_language then p.options else tr.published_options end,'closesAt',p.closes_at,
 'open',p.closed_at is null and p.closes_at>statement_timestamp(),
 'ownChoice',case when verified then (select v.choice from newsroom_private.poll_votes v where v.poll_id=p.id and v.voter_id=actor) else null end,
 'counts',case when p.results_released and (p.closed_at is not null or p.closes_at<=statement_timestamp()) and (select count(*) from newsroom_private.poll_votes v where v.poll_id=p.id)>=5 then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end) order by p.rn) filter(where p.rn<=20),'[]'::jsonb)) into result from numbered p left join newsroom_private.poll_translations tr on tr.poll_id=p.id and tr.language=p_language;
 return result;
end;$fn$;
create function public.staff_read_poll_translation(p_id uuid) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_poll_translation(p_id);
create function public.staff_change_poll_translation(p_id uuid,p_expected integer,p_fingerprint text,p_action text,p_copy jsonb,p_reason text) returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.change_poll_translation(p_id,p_expected,p_fingerprint,p_action,p_copy,p_reason);
revoke all on function newsroom_private.poll_source_fingerprint(newsroom_private.polls),newsroom_private.poll_translation_visible(uuid,text),newsroom_private.read_poll_translation(uuid),newsroom_private.change_poll_translation(uuid,integer,text,text,jsonb,text),public.staff_read_poll_translation(uuid),public.staff_change_poll_translation(uuid,integer,text,text,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_poll_translation(uuid),newsroom_private.change_poll_translation(uuid,integer,text,text,jsonb,text),public.staff_read_poll_translation(uuid),public.staff_change_poll_translation(uuid,integer,text,text,jsonb,text) to authenticated;
commit;
