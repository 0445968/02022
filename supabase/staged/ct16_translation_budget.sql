-- Candidate 50, independent disposable rehearsal only. Not an exposed RPC.
-- Conservative reservation accounting: failed or uncertain calls remain charged.
begin;
create table newsroom_private.translation_budget_settings(
 singleton boolean primary key default true check(singleton),
 enabled boolean not null default false,
 monthly_limit integer not null default 1900000 check(monthly_limit between 1 and 1900000),
 daily_actor_limit integer not null default 100000 check(daily_actor_limit between 1 and 1900000),
 request_limit integer not null default 50000 check(request_limit between 1 and 50000)
);
insert into newsroom_private.translation_budget_settings default values;
create table newsroom_private.translation_budget_reservations(
 request_id uuid primary key,
 actor uuid not null,
 resource_kind text not null check(resource_kind in ('story','poll')),
 resource_id uuid not null,
 source_fingerprint text not null check(source_fingerprint~'^[0-9a-f]{64}$'),
 characters integer not null check(characters between 1 and 50000),
 reserved_at timestamptz not null default clock_timestamp()
);
create index ct16_budget_month on newsroom_private.translation_budget_reservations(reserved_at);
create index ct16_budget_actor_day on newsroom_private.translation_budget_reservations(actor,reserved_at);
alter table newsroom_private.translation_budget_settings enable row level security;
alter table newsroom_private.translation_budget_reservations enable row level security;
revoke all on newsroom_private.translation_budget_settings,newsroom_private.translation_budget_reservations from public,anon,authenticated,service_role;
-- Only a future trusted orchestrator may call this private function after
-- calculating actual wire characters from authorized saved source text.
-- No caller grants yet, including service_role. No automatic retries/refunds.
create function newsroom_private.reserve_translation_budget(p_request uuid,p_actor uuid,p_kind text,p_resource uuid,p_fingerprint text,p_characters integer)
returns jsonb language plpgsql security invoker set search_path='' set timezone='UTC' as $fn$
declare cfg newsroom_private.translation_budget_settings%rowtype; prior newsroom_private.translation_budget_reservations%rowtype; used bigint; daily_used bigint; at_time timestamptz; source_hash text;
begin
 if p_request is null or p_actor is null or p_resource is null or p_kind is null or p_kind not in ('story','poll') or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$' or p_characters is null or p_characters not between 1 and 50000 then raise exception 'Invalid reservation' using errcode='22023';end if;
 -- Serialize all reservations against the singleton before checking usage.
 select * into cfg from newsroom_private.translation_budget_settings where singleton for update;
 if not found or not cfg.enabled then raise exception 'Translation budget disabled' using errcode='42501';end if;
 if not coalesce(public.staff_invite_verified_identity(p_actor),false) or not newsroom_private.publication_actor_permission(p_actor,'newsroom.access') then raise exception 'Translation unavailable' using errcode='42501';end if;
 if p_kind='story' then
  if not newsroom_private.publication_actor_permission(p_actor,'story.view_all',p_resource) or not newsroom_private.publication_actor_permission(p_actor,'story.edit_all',p_resource) then raise exception 'Translation unavailable' using errcode='42501';end if;
  select newsroom_private.translation_source_fingerprint(s.id) into source_hash from public.stories s where s.id=p_resource and s.status in ('draft','published') and s.access_level in ('public','registered');
 else
  if not newsroom_private.publication_actor_permission(p_actor,'poll.view_manage') or not newsroom_private.publication_actor_permission(p_actor,'poll.edit') then raise exception 'Translation unavailable' using errcode='42501';end if;
  select newsroom_private.poll_source_fingerprint(p) into source_hash from newsroom_private.polls p where p.id=p_resource and p.status='published';
 end if;
 if source_hash is distinct from p_fingerprint then raise exception 'Translation source changed' using errcode='40001';end if;
 select * into prior from newsroom_private.translation_budget_reservations where request_id=p_request;
 if found then
  if prior.actor is distinct from p_actor or prior.resource_kind is distinct from p_kind or prior.resource_id is distinct from p_resource or prior.source_fingerprint is distinct from p_fingerprint or prior.characters is distinct from p_characters then raise exception 'Reservation request conflict' using errcode='40001';end if;
  -- A duplicate is NOT a fresh authorization to send again.
  return jsonb_build_object('reserved',false,'alreadyReserved',true);
 end if;
 if p_characters>cfg.request_limit then raise exception 'Request exceeds translation budget' using errcode='22023';end if;
 at_time:=clock_timestamp();
 select coalesce(sum(characters),0) into used from newsroom_private.translation_budget_reservations where reserved_at>=date_trunc('month',at_time) and reserved_at<date_trunc('month',at_time)+interval '1 month';
 select coalesce(sum(characters),0) into daily_used from newsroom_private.translation_budget_reservations where actor=p_actor and reserved_at>=date_trunc('day',at_time) and reserved_at<date_trunc('day',at_time)+interval '1 day';
 if used+p_characters>cfg.monthly_limit or daily_used+p_characters>cfg.daily_actor_limit then raise exception 'Translation budget exhausted' using errcode='P0001';end if;
 insert into newsroom_private.translation_budget_reservations(request_id,actor,resource_kind,resource_id,source_fingerprint,characters,reserved_at) values(p_request,p_actor,p_kind,p_resource,p_fingerprint,p_characters,at_time);
 return jsonb_build_object('reserved',true,'alreadyReserved',false,'monthlyUsed',used+p_characters,'monthlyLimit',cfg.monthly_limit,'dailyUsed',daily_used+p_characters,'dailyLimit',cfg.daily_actor_limit);
end;$fn$;
revoke all on function newsroom_private.reserve_translation_budget(uuid,uuid,text,uuid,text,integer) from public,anon,authenticated,service_role;
-- Owner-only aggregate projection, separate from the disabled send gate.
-- No source content, individual identity, request ID or per-story metadata.
create function newsroom_private.read_translation_budget()
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); cfg newsroom_private.translation_budget_settings%rowtype; start_at timestamptz:=date_trunc('month',statement_timestamp()); stop_at timestamptz; used bigint; stories bigint; polls bigint; total_requests bigint;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false)
 or not newsroom_private.publication_actor_permission(actor,'newsroom.access')
 or not exists(select 1 from public.staff_memberships m join public.staff_member_roles mr on mr.membership_id=m.id join public.staff_role_presets p on p.id=mr.role_preset_id where m.auth_user_id=actor and m.status='active' and m.member_type='employee' and m.expires_at is null and mr.expires_at is null and p.role_key='owner')
 then raise exception 'Translation usage unavailable' using errcode='42501';end if;
 select * into cfg from newsroom_private.translation_budget_settings where singleton;
 if not found then raise exception 'Translation budget unavailable' using errcode='42501';end if;
 stop_at:=start_at+interval '1 month';
 select coalesce(sum(characters),0),coalesce(sum(characters) filter(where resource_kind='story'),0),coalesce(sum(characters) filter(where resource_kind='poll'),0),count(*) into used,stories,polls,total_requests
 from newsroom_private.translation_budget_reservations where reserved_at>=start_at and reserved_at<stop_at;
 return jsonb_build_object('enabled',cfg.enabled,'periodStart',start_at,'periodEnd',stop_at,'monthlyLimit',cfg.monthly_limit,'dailyActorLimit',cfg.daily_actor_limit,'requestLimit',cfg.request_limit,'reservedCharacters',used,'storyCharacters',stories,'pollCharacters',polls,'requestCount',total_requests);
end;$fn$;
create function public.staff_read_translation_budget()
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_translation_budget();
revoke all on function newsroom_private.read_translation_budget(),public.staff_read_translation_budget() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_translation_budget(),public.staff_read_translation_budget() to authenticated;
commit;
