-- CT-04b.1 STAGED ONLY. CLI v3.2.0 generated filename, run #45428820271.
-- Depends on CT-04a invitation Auth identity and CT-02 membership/audit.
-- No existing user profile, editorial byline, permission or invitation changed.
begin;
create table public.staff_onboarding_profiles (
  membership_id uuid primary key references public.staff_memberships(id) on delete restrict,
  display_name text not null check (length(btrim(display_name)) between 2 and 120
    and display_name=btrim(display_name) and display_name !~ '[[:cntrl:]]'),
  preferred_locale text not null check (preferred_locale in ('en','es')),
  byline_requested boolean not null default false,
  acknowledged_version integer not null check (acknowledged_version=1),
  revision integer not null check (revision>0),
  completed_at timestamptz not null,
  updated_at timestamptz not null check (updated_at>=completed_at)
);
alter table public.staff_onboarding_profiles enable row level security;
revoke all on public.staff_onboarding_profiles from public,anon,authenticated,service_role;
grant select,insert,update on public.staff_onboarding_profiles to service_role;

-- The same deny-first global newsroom.access gate as the application:
-- effective all-scope override or active role grant, no active all-scope deny.
-- Current verified Auth identity, active and unexpired membership required.
create function public.staff_onboarding_actor_membership(p_actor uuid)
returns uuid language sql stable security invoker set search_path=''
as $fn$
  select m.id from public.staff_memberships m
  where m.auth_user_id=p_actor and public.staff_invite_verified_identity(p_actor)
    and m.status='active' and (m.expires_at is null or m.expires_at>pg_catalog.statement_timestamp())
    and not exists(select 1 from public.staff_capability_overrides o
      where o.membership_id=m.id and o.capability_key='newsroom.access'
        and o.scope='all' and o.effect='deny'
        and (o.expires_at is null or o.expires_at>pg_catalog.statement_timestamp()))
    and (exists(select 1 from public.staff_member_roles r
      join public.staff_role_capabilities g on g.role_preset_id=r.role_preset_id
      where r.membership_id=m.id and (r.expires_at is null or r.expires_at>pg_catalog.statement_timestamp())
        and g.capability_key='newsroom.access' and g.scope='all')
      or exists(select 1 from public.staff_capability_overrides o
        where o.membership_id=m.id and o.capability_key='newsroom.access'
          and o.scope='all' and o.effect='allow'
          and (o.expires_at is null or o.expires_at>pg_catalog.statement_timestamp())))
$fn$;
revoke all on function public.staff_onboarding_actor_membership(uuid) from public,anon,authenticated;
grant execute on function public.staff_onboarding_actor_membership(uuid) to service_role;

-- Return only the current verified actor's private profile and assigned role
-- labels, never Auth email, invitation material, other staff or author IDs.
create function public.staff_read_onboarding(p_actor uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $fn$
declare v_member uuid; v_result jsonb;
begin
  v_member:=public.staff_onboarding_actor_membership(p_actor);
  if v_member is null then raise exception 'Staff onboarding unavailable' using errcode='42501'; end if;
  select pg_catalog.jsonb_build_object(
    'memberType',m.member_type,'expiresAt',m.expires_at,
    'roles',coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'key',p.role_key,'nameEn',p.name_en,'nameEs',p.name_es) order by p.role_key)
      from public.staff_member_roles r join public.staff_role_presets p on p.id=r.role_preset_id
      where r.membership_id=m.id and (r.expires_at is null or r.expires_at>pg_catalog.statement_timestamp())),
      '[]'::jsonb),
    'profile',case when s.membership_id is null then null else pg_catalog.jsonb_build_object(
      'displayName',s.display_name,'locale',s.preferred_locale,'bylineRequested',s.byline_requested,
      'revision',s.revision,'completedAt',s.completed_at,'updatedAt',s.updated_at,
      'acknowledgedVersion',s.acknowledged_version) end)
    into v_result from public.staff_memberships m
    left join public.staff_onboarding_profiles s on s.membership_id=m.id where m.id=v_member;
  return v_result;
end;
$fn$;

-- Direct backend writes are constrained to this self-profile transaction's
-- verified context. No membership or role mutations in this trigger.
create function public.staff_guard_onboarding_profile()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare
  v_actor uuid:=nullif(pg_catalog.current_setting('app.staff_onboarding_actor',true),'')::uuid;
  v_request uuid:=nullif(pg_catalog.current_setting('app.staff_onboarding_request',true),'')::uuid;
  v_member uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  v_member:=public.staff_onboarding_actor_membership(v_actor);
  if tg_op='DELETE' or v_member is null or v_request is null or new.membership_id<>v_member then
    raise exception 'Staff onboarding mutation denied' using errcode='42501';
  end if;
  if tg_op='INSERT' and new.revision<>1 then
    raise exception 'Initial onboarding revision must be one' using errcode='23514';
  end if;
  if tg_op='UPDATE' and (new.membership_id<>old.membership_id
    or new.completed_at<>old.completed_at or new.revision<>old.revision+1) then
    raise exception 'Invalid staff profile revision' using errcode='40001';
  end if;
  -- Audit status only, not display name or user-entered profile contents.
  insert into public.staff_access_audit(actor_auth_user_id,subject_membership_id,
    action_key,after_state,reason,request_id)
  values(v_actor,v_member,
    case when tg_op='INSERT' then 'staff_onboarding.completed' else 'staff_onboarding.updated' end,
    pg_catalog.jsonb_build_object('revision',new.revision,
      'acknowledged_version',new.acknowledged_version,'byline_requested',new.byline_requested),
    'Staff member saved own private onboarding profile',v_request);
  return new;
end;
$fn$;
create trigger staff_onboarding_guard before insert or update or delete
on public.staff_onboarding_profiles for each row execute function public.staff_guard_onboarding_profile();
revoke all on function public.staff_guard_onboarding_profile() from public,anon,authenticated;

create function public.staff_save_onboarding(p_actor uuid,p_expected_revision integer,
  p_display_name text,p_locale text,p_byline_requested boolean,p_acknowledged_version integer,p_request_id uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare v_member uuid; v_revision integer; v_now timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  v_member:=public.staff_onboarding_actor_membership(p_actor);
  if v_member is null then raise exception 'Staff onboarding unavailable' using errcode='42501'; end if;
  if p_expected_revision is null or p_expected_revision<0 or p_expected_revision>=2147483647
    or p_display_name is null or p_display_name<>pg_catalog.btrim(p_display_name)
    or pg_catalog.length(p_display_name) not between 2 and 120 or p_display_name ~ '[[:cntrl:]]'
    or p_locale is null or p_locale not in ('en','es') or p_byline_requested is null
    or p_acknowledged_version is distinct from 1 or p_request_id is null then
    raise exception 'Invalid staff onboarding profile' using errcode='22023';
  end if;
  select revision into v_revision from public.staff_onboarding_profiles
    where membership_id=v_member for update;
  if coalesce(v_revision,0)<>p_expected_revision then
    raise exception 'Staff profile changed; reload before saving' using errcode='40001';
  end if;
  v_now:=pg_catalog.clock_timestamp();
  perform pg_catalog.set_config('app.staff_onboarding_actor',p_actor::text,true);
  perform pg_catalog.set_config('app.staff_onboarding_request',p_request_id::text,true);
  if v_revision is null then
    insert into public.staff_onboarding_profiles(membership_id,display_name,preferred_locale,
      byline_requested,acknowledged_version,revision,completed_at,updated_at)
    values(v_member,p_display_name,p_locale,p_byline_requested,p_acknowledged_version,1,v_now,v_now);
  else
    update public.staff_onboarding_profiles set display_name=p_display_name,
      preferred_locale=p_locale,byline_requested=p_byline_requested,
      acknowledged_version=p_acknowledged_version,revision=revision+1,updated_at=v_now
    where membership_id=v_member;
  end if;
  return public.staff_read_onboarding(p_actor);
end;
$fn$;
revoke all on function public.staff_read_onboarding(uuid),
  public.staff_save_onboarding(uuid,integer,text,text,boolean,integer,uuid)
from public,anon,authenticated;
grant execute on function public.staff_read_onboarding(uuid),
  public.staff_save_onboarding(uuid,integer,text,text,boolean,integer,uuid)
to service_role;
commit;
