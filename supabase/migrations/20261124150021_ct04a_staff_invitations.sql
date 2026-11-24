-- CT-04a.2 STAGED ONLY. Filename generated with Supabase CLI v3.2.0
-- Actions #45420381550. Requires CT-02b/c and CT-03c.
-- No accounts, invitations, grants, or memberships seeded.
begin;

-- Hosted preflight confirmed service_role has auth schema USAGE and BYPASSRLS,
-- no SELECT on auth.users, and postgres has grant option on these six columns.
-- Never expose auth schema via Data API. This is a narrow backend privilege
-- for independent current email/confirmation/ban/deletion checks, not Auth
-- metadata, encrypted passwords, identity tokens or a table-wide grant.
grant select (id,email,email_confirmed_at,is_anonymous,deleted_at,banned_until)
on auth.users to service_role;

create table public.staff_invitations (
  id uuid primary key default gen_random_uuid(),
  email_normalized text not null
    check (length(email_normalized) between 3 and 254
      and email_normalized=lower(btrim(email_normalized))
      and email_normalized ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  token_hash text not null unique check (token_hash ~ '^[a-f0-9]{64}$'),
  role_preset_id uuid not null references public.staff_role_presets(id) on delete restrict,
  preset_revision integer not null check (preset_revision>0),
  preset_fingerprint text not null check (preset_fingerprint ~ '^[a-f0-9]{64}$'),
  member_type text not null check (member_type in ('employee','contractor','freelancer')),
  issued_by uuid not null references auth.users(id) on delete restrict,
  issued_at timestamptz not null,
  expires_at timestamptz not null,
  membership_expires_at timestamptz,
  canceled_by uuid references auth.users(id) on delete restrict,
  canceled_at timestamptz,
  redeemed_by uuid references auth.users(id) on delete restrict,
  redeemed_at timestamptz,
  membership_id uuid references public.staff_memberships(id) on delete restrict,
  check (expires_at>issued_at and expires_at<=issued_at+interval '7 days'),
  check ((member_type='employee' and membership_expires_at is null)
    or (member_type in ('contractor','freelancer') and membership_expires_at is not null
      and membership_expires_at>expires_at
      and membership_expires_at<=issued_at+interval '365 days')),
  check ((canceled_by is null)=(canceled_at is null)),
  check ((redeemed_by is null)=(redeemed_at is null)
    and (redeemed_by is null)=(membership_id is null)),
  check (canceled_at is null or redeemed_at is null),
  check (canceled_at is null or canceled_at>=issued_at),
  check (redeemed_at is null or (redeemed_at>=issued_at and redeemed_at<expires_at))
);
-- Even expired unused invitations must be explicitly canceled/replaced.
create unique index staff_invites_one_open_email
on public.staff_invitations(email_normalized)
where canceled_at is null and redeemed_at is null;
create index staff_invites_issuer_time on public.staff_invitations(issued_by,issued_at desc);
create index staff_invites_order on public.staff_invitations(issued_at desc,id desc);
alter table public.staff_invitations enable row level security;
revoke all on public.staff_invitations from public,anon,authenticated,service_role;
grant select,insert,update on public.staff_invitations to service_role;

create function public.staff_invite_verified_identity(p_user uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select exists(select 1 from auth.users u where u.id=p_user
    and u.email is not null and u.email_confirmed_at is not null
    and u.email_confirmed_at<=pg_catalog.statement_timestamp()
    and u.is_anonymous=false and u.deleted_at is null
    and (u.banned_until is null or u.banned_until<=pg_catalog.statement_timestamp()))
$fn$;

-- Deliberately stricter than a generic editor or legacy staff flag. Owner's
-- reviewed preset must actually contain team.invite; active denials win.
create function public.staff_invite_owner_allowed(p_actor uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select public.staff_invite_verified_identity(p_actor) and exists(
    select 1 from public.staff_memberships m
    join public.staff_member_roles r on r.membership_id=m.id
    join public.staff_role_presets p on p.id=r.role_preset_id
    join public.staff_role_capabilities g on g.role_preset_id=p.id
    where m.auth_user_id=p_actor and m.status='active'
      and m.expires_at is null and m.member_type='employee'
      and r.expires_at is null and p.role_key='owner'
      and g.capability_key='team.invite' and g.scope='all'
      and not exists(select 1 from public.staff_capability_overrides o
        where o.membership_id=m.id and o.capability_key='team.invite'
          and o.effect='deny' and (o.expires_at is null
            or o.expires_at>pg_catalog.statement_timestamp()))
  )
$fn$;

-- A version AND a fingerprint of actual grants prevents a changed template
-- from activating a different set of permissions on a pending invitation.
create function public.staff_invite_preset_fingerprint(p_preset uuid,p_revision integer)
returns text language sql stable security invoker set search_path=''
as $fn$
  select pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(
    (select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(
      g.capability_key::text,g.scope) order by g.capability_key::text)
      from public.staff_role_capabilities g where g.role_preset_id=p.id)::text,
    'UTF8')),'hex')
  from public.staff_role_presets p
  where p.id=p_preset and p.is_builtin and p.role_key<>'owner'
    and p.grant_revision=p_revision and p_revision>0
    and exists(select 1 from public.staff_role_capabilities g
      where g.role_preset_id=p.id and g.capability_key='newsroom.access' and g.scope='all')
    and not exists(select 1 from public.staff_role_capabilities g
      where g.role_preset_id=p.id and not public.staff_preset_grant_allowed(
        p.role_key,g.capability_key,g.scope))
$fn$;

-- Backend-only helpers cannot be called by readers. No new definer functions.
revoke all on function public.staff_invite_verified_identity(uuid),
  public.staff_invite_owner_allowed(uuid),
  public.staff_invite_preset_fingerprint(uuid,integer)
from public,anon,authenticated;
grant execute on function public.staff_invite_verified_identity(uuid),
  public.staff_invite_owner_allowed(uuid),
  public.staff_invite_preset_fingerprint(uuid,integer) to service_role;

-- Direct service-role DML without trusted current owner/audit context fails.
-- Immutable invitation identity and one-way terminal state. Never put email,
-- digest, raw token or entire invitation rows in the audit payload.
create function public.staff_guard_and_audit_invitation()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare
  v_actor uuid:=nullif(pg_catalog.current_setting('app.staff_actor_auth_id',true),'')::uuid;
  v_request uuid:=nullif(pg_catalog.current_setting('app.staff_request_id',true),'')::uuid;
  v_reason text:=nullif(pg_catalog.current_setting('app.staff_reason',true),'');
  v_op text:=nullif(pg_catalog.current_setting('app.staff_invite_operation',true),'');
  v_event text;
  v_audit_actor uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if tg_op='DELETE' or v_request is null or v_reason is null
    or pg_catalog.length(pg_catalog.btrim(v_reason))<12
    or pg_catalog.length(v_reason)>500
    or not public.staff_invite_owner_allowed(v_actor) then
    raise exception 'Invitation mutation requires current owner and audit context'
      using errcode='42501';
  end if;
  v_audit_actor:=v_actor;
  if tg_op='INSERT' then
    if v_op is null or v_op not in ('issue','replace') or new.issued_by<>v_actor
      or new.canceled_at is not null or new.redeemed_at is not null then
      raise exception 'Invalid invitation creation' using errcode='42501';
    end if;
    v_event:='staff_invitation.issued';
  else
    if old.canceled_at is not null or old.redeemed_at is not null
      or (pg_catalog.to_jsonb(new)-array['canceled_by','canceled_at','redeemed_by','redeemed_at','membership_id'])
        is distinct from
        (pg_catalog.to_jsonb(old)-array['canceled_by','canceled_at','redeemed_by','redeemed_at','membership_id']) then
      raise exception 'Invitation identity and terminal state are immutable' using errcode='42501';
    end if;
    if v_op in ('cancel','replace') and new.canceled_by=v_actor
      and new.canceled_at is not null and new.redeemed_at is null then
      v_event:=case when v_op='replace' then 'staff_invitation.replaced' else 'staff_invitation.canceled' end;
    elsif v_op='redeem' and old.issued_by=v_actor and new.redeemed_at is not null
      and new.canceled_at is null and exists(
        select 1 from public.staff_memberships m
        join public.staff_member_roles r on r.membership_id=m.id
        where m.id=new.membership_id and m.auth_user_id=new.redeemed_by
          and m.status='active' and m.member_type=new.member_type
          and m.expires_at is not distinct from new.membership_expires_at
          and r.role_preset_id=new.role_preset_id
          and r.expires_at is not distinct from new.membership_expires_at
      ) then
      v_event:='staff_invitation.redeemed';
      v_audit_actor:=new.redeemed_by;
    else
      raise exception 'Invalid invitation state transition' using errcode='42501';
    end if;
  end if;
  insert into public.staff_access_audit(actor_auth_user_id,subject_membership_id,
    action_key,after_state,reason,request_id)
  values(v_audit_actor,new.membership_id,v_event,
    pg_catalog.jsonb_build_object('invitation_id',new.id,'preset_id',new.role_preset_id,
      'preset_revision',new.preset_revision,'member_type',new.member_type,
      'approved_by',v_actor,'expires_at',new.expires_at,
      'membership_expires_at',new.membership_expires_at),
    v_reason,v_request);
  return new;
end;
$fn$;
create trigger staff_invitation_guard_and_audit
before insert or update or delete on public.staff_invitations
for each row execute function public.staff_guard_and_audit_invitation();
revoke all on function public.staff_guard_and_audit_invitation() from public,anon,authenticated;

-- Issue or explicitly replace one invitation for the same normalized email.
-- Replacement never reuses the old digest; cancel+insert are one transaction.
create function public.staff_issue_invitation(
  p_actor uuid,p_email text,p_role text,p_expected_revision integer,p_member_type text,
  p_expires_at timestamptz,p_membership_expires_at timestamptz,p_token_hash text,
  p_replace_id uuid,p_reason text,p_request_id uuid
) returns uuid language plpgsql security invoker set search_path=''
as $fn$
declare
  v_now timestamptz;
  v_preset uuid;
  v_fingerprint text;
  v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  v_now:=pg_catalog.clock_timestamp();
  if not public.staff_invite_owner_allowed(p_actor) then
    raise exception 'Invitation operation denied' using errcode='42501';
  end if;
  if p_email is null or p_email<>pg_catalog.lower(pg_catalog.btrim(p_email))
    or pg_catalog.length(p_email)>254
    or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    or p_role is null or p_role not in ('managing_editor','editor','staff_writer',
      'copy_editor','media_editor','moderator','audience_staff','freelancer')
    or p_expected_revision is null or p_expected_revision<1
    or p_member_type is null or p_member_type not in ('employee','contractor','freelancer')
    or (p_role='freelancer')<>(p_member_type='freelancer')
    or p_expires_at is null or p_expires_at<=v_now or p_expires_at>v_now+interval '7 days'
    or (p_member_type='employee' and p_membership_expires_at is not null)
    or (p_member_type<>'employee' and (p_membership_expires_at is null
      or p_membership_expires_at<=p_expires_at or p_membership_expires_at>v_now+interval '365 days'))
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_request_id is null or p_reason is null
    or pg_catalog.length(pg_catalog.btrim(p_reason))<12 or pg_catalog.length(p_reason)>500 then
    raise exception 'Invalid invitation payload' using errcode='22023';
  end if;
  if exists(select 1 from public.staff_memberships m join auth.users u on u.id=m.auth_user_id
    where pg_catalog.lower(pg_catalog.btrim(u.email))=p_email) then
    raise exception 'Invitation not eligible' using errcode='42501';
  end if;
  select p.id into v_preset from public.staff_role_presets p
    where p.role_key=p_role and p.is_builtin for update;
  v_fingerprint:=public.staff_invite_preset_fingerprint(v_preset,p_expected_revision);
  if v_fingerprint is null then
    raise exception 'Preset unavailable or changed' using errcode='40001';
  end if;
  if (select count(*) from public.staff_invitations i
      where i.issued_by=p_actor and i.issued_at>v_now-interval '1 hour')>=30 then
    raise exception 'Invitation issuance rate limit' using errcode='54000';
  end if;
  perform pg_catalog.set_config('app.staff_actor_auth_id',p_actor::text,true);
  perform pg_catalog.set_config('app.staff_reason',p_reason,true);
  perform pg_catalog.set_config('app.staff_request_id',p_request_id::text,true);
  perform pg_catalog.set_config('app.staff_invite_operation',
    case when p_replace_id is null then 'issue' else 'replace' end,true);
  if p_replace_id is not null then
    update public.staff_invitations i set canceled_by=p_actor,canceled_at=v_now
    where i.id=p_replace_id and i.email_normalized=p_email
      and i.canceled_at is null and i.redeemed_at is null and i.token_hash<>p_token_hash;
    if not found then
      raise exception 'Invitation cannot be replaced' using errcode='40001';
    end if;
  elsif exists(select 1 from public.staff_invitations i
    where i.email_normalized=p_email and i.canceled_at is null and i.redeemed_at is null) then
    raise exception 'An open invitation already exists; explicitly replace it' using errcode='23505';
  end if;
  insert into public.staff_invitations(email_normalized,token_hash,role_preset_id,
    preset_revision,preset_fingerprint,member_type,issued_by,issued_at,expires_at,membership_expires_at)
  values(p_email,p_token_hash,v_preset,p_expected_revision,v_fingerprint,p_member_type,
    p_actor,v_now,p_expires_at,p_membership_expires_at) returning id into v_id;
  return v_id;
end;
$fn$;

create function public.staff_cancel_invitation(
  p_actor uuid,p_invitation_id uuid,p_reason text,p_request_id uuid
) returns uuid language plpgsql security invoker set search_path=''
as $fn$
declare v_id uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if not public.staff_invite_owner_allowed(p_actor) then
    raise exception 'Invitation operation denied' using errcode='42501';
  end if;
  if p_invitation_id is null or p_request_id is null or p_reason is null
    or pg_catalog.length(pg_catalog.btrim(p_reason))<12 or pg_catalog.length(p_reason)>500 then
    raise exception 'Invalid cancellation' using errcode='22023';
  end if;
  perform pg_catalog.set_config('app.staff_actor_auth_id',p_actor::text,true);
  perform pg_catalog.set_config('app.staff_reason',p_reason,true);
  perform pg_catalog.set_config('app.staff_request_id',p_request_id::text,true);
  perform pg_catalog.set_config('app.staff_invite_operation','cancel',true);
  update public.staff_invitations i set canceled_by=p_actor,canceled_at=pg_catalog.clock_timestamp()
    where i.id=p_invitation_id and i.canceled_at is null and i.redeemed_at is null
    returning i.id into v_id;
  if not found then raise exception 'Invitation not open' using errcode='40001'; end if;
  return v_id;
end;
$fn$;

-- Caller MUST be the future trusted backend using a fresh cookie-bound
-- auth.getUser() result; direct authenticated EXECUTE is forbidden.
-- The database checks current Auth identity again and never accepts email,
-- role, scope, expiry or issuer from the redeem request.
create function public.staff_redeem_invitation(
  p_verified_auth_user_id uuid,p_token_hash text,p_request_id uuid
) returns uuid language plpgsql security invoker set search_path=''
as $fn$
declare
  v_inv public.staff_invitations%rowtype;
  v_now timestamptz;
  v_member uuid;
  v_email text;
  v_role text;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  v_now:=pg_catalog.clock_timestamp();
  if p_request_id is null or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or not public.staff_invite_verified_identity(p_verified_auth_user_id) then
    raise exception 'Invitation redemption denied' using errcode='42501';
  end if;
  select i.* into v_inv from public.staff_invitations i
    where i.token_hash=p_token_hash for update;
  if not found or v_inv.canceled_at is not null or v_inv.redeemed_at is not null
    or v_inv.expires_at<=v_now
    or (v_inv.membership_expires_at is not null and v_inv.membership_expires_at<=v_now)
    or not public.staff_invite_owner_allowed(v_inv.issued_by) then
    raise exception 'Invitation redemption denied' using errcode='42501';
  end if;
  select pg_catalog.lower(pg_catalog.btrim(u.email)) into v_email
    from auth.users u where u.id=p_verified_auth_user_id
      and u.email_confirmed_at is not null and u.email_confirmed_at<=v_now
      and u.is_anonymous=false and u.deleted_at is null
      and (u.banned_until is null or u.banned_until<=v_now);
  if v_email is distinct from v_inv.email_normalized
    or exists(select 1 from auth.users u where u.id<>p_verified_auth_user_id
      and u.deleted_at is null and pg_catalog.lower(pg_catalog.btrim(u.email))=v_email)
    or exists(select 1 from public.staff_memberships m
      where m.auth_user_id=p_verified_auth_user_id) then
    raise exception 'Invitation redemption denied' using errcode='42501';
  end if;
  select p.role_key into v_role from public.staff_role_presets p
    where p.id=v_inv.role_preset_id for update;
  if v_role is null or v_role='owner'
    or (v_role='freelancer')<>(v_inv.member_type='freelancer')
    or public.staff_invite_preset_fingerprint(v_inv.role_preset_id,v_inv.preset_revision)
      is distinct from v_inv.preset_fingerprint then
    raise exception 'Invitation redemption denied' using errcode='42501';
  end if;

  -- Existing CT-02c membership/role triggers require the authorizing
  -- active owner. Invitation redemption audit separately identifies the
  -- verified accepting Auth user and the approving owner.
  perform pg_catalog.set_config('app.staff_actor_auth_id',v_inv.issued_by::text,true);
  perform pg_catalog.set_config('app.staff_request_id',p_request_id::text,true);
  perform pg_catalog.set_config('app.staff_reason','Accepted previously approved staff invitation',true);
  perform pg_catalog.set_config('app.staff_invite_operation','redeem',true);
  insert into public.staff_memberships(auth_user_id,status,member_type,invited_by,activated_at,expires_at)
  values(p_verified_auth_user_id,'active',v_inv.member_type,v_inv.issued_by,v_now,
    v_inv.membership_expires_at) returning id into v_member;
  insert into public.staff_member_roles(membership_id,role_preset_id,granted_by,expires_at)
  values(v_member,v_inv.role_preset_id,v_inv.issued_by,v_inv.membership_expires_at);
  update public.staff_invitations set redeemed_by=p_verified_auth_user_id,
    redeemed_at=v_now,membership_id=v_member
    where id=v_inv.id and canceled_at is null and redeemed_at is null;
  if not found then raise exception 'Invitation redemption denied' using errcode='40001'; end if;
  return v_member;
end;
$fn$;

-- Owner-only minimal list, 25 rows + one lookahead. No raw emails or digests.
create function public.staff_list_invitations(p_actor uuid,p_page integer)
returns table(invitation_id uuid,email_hint text,role_key text,member_type text,
  preset_revision integer,status text,issued_at timestamptz,expires_at timestamptz,
  membership_expires_at timestamptz)
language plpgsql stable security invoker set search_path=''
as $fn$
begin
  if not public.staff_invite_owner_allowed(p_actor) then
    raise exception 'Invitation operation denied' using errcode='42501';
  end if;
  if p_page is null or p_page<0 or p_page>100 then
    raise exception 'Invalid page' using errcode='22023';
  end if;
  return query select i.id,
    pg_catalog.left(pg_catalog.split_part(i.email_normalized,'@',1),1)||'***@'||
      pg_catalog.split_part(i.email_normalized,'@',2),
    p.role_key,i.member_type,i.preset_revision,
    case when i.redeemed_at is not null then 'redeemed'
      when i.canceled_at is not null then 'canceled'
      when i.expires_at<=pg_catalog.statement_timestamp() then 'expired'
      when public.staff_invite_preset_fingerprint(i.role_preset_id,i.preset_revision)
        is distinct from i.preset_fingerprint
        or not public.staff_invite_owner_allowed(i.issued_by) then 'invalidated'
      else 'pending' end,
    i.issued_at,i.expires_at,i.membership_expires_at
    from public.staff_invitations i join public.staff_role_presets p on p.id=i.role_preset_id
    order by i.issued_at desc,i.id desc offset p_page*25 limit 26;
end;
$fn$;

revoke all on function public.staff_issue_invitation(uuid,text,text,integer,text,timestamptz,timestamptz,text,uuid,text,uuid),
  public.staff_cancel_invitation(uuid,uuid,text,uuid),
  public.staff_redeem_invitation(uuid,text,uuid),
  public.staff_list_invitations(uuid,integer) from public,anon,authenticated;
grant execute on function public.staff_issue_invitation(uuid,text,text,integer,text,timestamptz,timestamptz,text,uuid,text,uuid),
  public.staff_cancel_invitation(uuid,uuid,text,uuid),
  public.staff_redeem_invitation(uuid,text,uuid),
  public.staff_list_invitations(uuid,integer) to service_role;
commit;
