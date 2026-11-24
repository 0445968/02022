-- CT-04b.2 STAGED ONLY. CLI generated in #45429694668.
-- Private reviewed association only. Existing public attribution still resolves
-- stories.author_id -> editorial_profiles.account_id. NEVER modify either.
begin;
-- Hosted preflight found no service_role SELECT/UPDATE on editorial_profiles.
-- Only the five read columns necessary for the private association are granted.
-- Do not add UPDATE or broad SELECT to the existing author table.
grant select (id,account_id,byline_name,slug,byline_status)
on public.editorial_profiles to service_role;
create table public.staff_byline_reviews (
  membership_id uuid primary key references public.staff_memberships(id) on delete restrict,
  editorial_profile_id uuid references public.editorial_profiles(id) on delete restrict,
  status text not null check(status in ('approved','rejected','unlinked')),
  reviewed_profile_revision integer not null check(reviewed_profile_revision>0),
  revision integer not null check(revision>0),
  reviewed_by uuid not null references auth.users(id) on delete restrict,
  reviewed_at timestamptz not null,
  check ((status='approved')=(editorial_profile_id is not null))
);
create unique index staff_byline_one_association on public.staff_byline_reviews(editorial_profile_id)
where status='approved';
alter table public.staff_byline_reviews enable row level security;
revoke all on public.staff_byline_reviews from public,anon,authenticated,service_role;
grant select,insert,update on public.staff_byline_reviews to service_role;

create function public.staff_byline_owner_allowed(p_actor uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select public.staff_invite_verified_identity(p_actor) and exists(
    select 1 from public.staff_memberships m
    join public.staff_member_roles r on r.membership_id=m.id
    join public.staff_role_presets p on p.id=r.role_preset_id
    join public.staff_role_capabilities g on g.role_preset_id=p.id
    where m.auth_user_id=p_actor and m.status='active' and m.member_type='employee'
      and m.expires_at is null and r.expires_at is null and p.role_key='owner'
      and g.capability_key='byline.manage' and g.scope='all'
      and not exists(select 1 from public.staff_capability_overrides o
        where o.membership_id=m.id and o.capability_key='byline.manage'
          and o.scope='all' and o.effect='deny'
          and (o.expires_at is null or o.expires_at>pg_catalog.statement_timestamp()))
  )
$fn$;
revoke all on function public.staff_byline_owner_allowed(uuid) from public,anon,authenticated;
grant execute on function public.staff_byline_owner_allowed(uuid) to service_role;

-- A legacy account link can only be associated with its SAME account.
-- Never claim another account's existing byline, even with owner approval.
create function public.staff_byline_candidate_allowed(p_member uuid,p_byline uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
  select exists(select 1 from public.editorial_profiles e
    join public.staff_memberships m on m.id=p_member
    where e.id=p_byline and (e.account_id is null or e.account_id=m.auth_user_id)
      and not exists(select 1 from public.staff_byline_reviews b
        where b.editorial_profile_id=e.id and b.status='approved' and b.membership_id<>m.id))
$fn$;
revoke all on function public.staff_byline_candidate_allowed(uuid,uuid) from public,anon,authenticated;
grant execute on function public.staff_byline_candidate_allowed(uuid,uuid) to service_role;

create function public.staff_guard_byline_review()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare
  v_actor uuid:=nullif(pg_catalog.current_setting('app.staff_byline_actor',true),'')::uuid;
  v_request uuid:=nullif(pg_catalog.current_setting('app.staff_byline_request',true),'')::uuid;
  v_reason text:=nullif(pg_catalog.current_setting('app.staff_byline_reason',true),'');
  v_subject uuid; v_requested boolean; v_profile_revision integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if tg_op='DELETE' or v_request is null or v_reason is null
    or length(btrim(v_reason))<12 or length(v_reason)>500
    or not public.staff_byline_owner_allowed(v_actor) or new.reviewed_by<>v_actor then
    raise exception 'Byline review denied' using errcode='42501';
  end if;
  select m.auth_user_id,s.byline_requested,s.revision into v_subject,v_requested,v_profile_revision
    from public.staff_memberships m join public.staff_onboarding_profiles s on s.membership_id=m.id
    where m.id=new.membership_id;
  if v_subject is null or new.reviewed_profile_revision<>v_profile_revision then
    raise exception 'Staff request changed' using errcode='40001';
  end if;
  if tg_op='INSERT' then
    if new.revision<>1 or new.status='unlinked' then
      raise exception 'Invalid initial review' using errcode='40001'; end if;
  else
    if new.membership_id<>old.membership_id or new.revision<>old.revision+1
      or (old.status='approved' and new.status<>'unlinked')
      or (new.status='unlinked' and old.status<>'approved') then
      raise exception 'Invalid review transition' using errcode='40001'; end if;
    if old.status<>'approved' and old.reviewed_profile_revision>=new.reviewed_profile_revision then
      raise exception 'No new request revision' using errcode='40001'; end if;
  end if;
  if new.status in ('approved','rejected') and (not v_requested
      or public.staff_onboarding_actor_membership(v_subject) is distinct from new.membership_id) then
    raise exception 'No eligible current request' using errcode='42501';
  end if;
  if new.status='approved' and not public.staff_byline_candidate_allowed(new.membership_id,new.editorial_profile_id) then
    raise exception 'Byline unavailable for this account' using errcode='40001';
  end if;
  insert into public.staff_access_audit(actor_auth_user_id,subject_membership_id,
    action_key,before_state,after_state,reason,request_id)
  values(v_actor,new.membership_id,'staff_byline.'||new.status,
    case when tg_op='UPDATE' then pg_catalog.jsonb_build_object('status',old.status,
      'editorial_profile_id',old.editorial_profile_id,'revision',old.revision) else null end,
    pg_catalog.jsonb_build_object('status',new.status,'editorial_profile_id',new.editorial_profile_id,
      'revision',new.revision,'profile_revision',new.reviewed_profile_revision),v_reason,v_request);
  return new;
end;
$fn$;
create trigger staff_byline_review_guard before insert or update or delete on public.staff_byline_reviews
for each row execute function public.staff_guard_byline_review();
revoke all on function public.staff_guard_byline_review() from public,anon,authenticated;

-- An approved private association is never silently cleared or reassigned.
-- Unlink remains available even if the staff member has since been suspended.
create function public.staff_review_byline(p_actor uuid,p_member uuid,p_expected_profile_revision integer,
  p_expected_review_revision integer,p_action text,p_byline uuid,p_reason text,p_request_id uuid)
returns integer language plpgsql security invoker set search_path=''
as $fn$
declare v_profile public.staff_onboarding_profiles%rowtype;
  v_review public.staff_byline_reviews%rowtype; v_status text; v_next integer;
begin
  perform pg_catalog.pg_advisory_xact_lock(202611,2302);
  if not public.staff_byline_owner_allowed(p_actor) then
    raise exception 'Byline review denied' using errcode='42501'; end if;
  if p_member is null or p_expected_profile_revision is null or p_expected_profile_revision<1
    or p_expected_review_revision is null or p_expected_review_revision<0
    or p_expected_review_revision>=2147483647
    or p_action is null or p_action not in ('approve','reject','unlink')
    or ((p_action='approve')<>(p_byline is not null))
    or p_reason is null or length(btrim(p_reason))<12 or length(p_reason)>500 or p_request_id is null then
    raise exception 'Invalid byline review' using errcode='22023'; end if;
  select * into v_profile from public.staff_onboarding_profiles where membership_id=p_member for update;
  if not found or v_profile.revision<>p_expected_profile_revision then
    raise exception 'Staff request changed' using errcode='40001'; end if;
  select * into v_review from public.staff_byline_reviews where membership_id=p_member for update;
  if coalesce(v_review.revision,0)<>p_expected_review_revision then
    raise exception 'Review changed' using errcode='40001'; end if;
  if p_action='approve' then
    -- Read only: legacy author edits may occur independently. Recheck candidate
    -- in the guard and directory; subsequent legacy drift becomes a conflict,
    -- not an effective public link. No UPDATE privilege for a row lock.
    if not public.staff_byline_candidate_allowed(p_member,p_byline) then
      raise exception 'Byline unavailable for this account' using errcode='40001'; end if;
  end if;
  v_status:=case p_action when 'approve' then 'approved' when 'reject' then 'rejected' else 'unlinked' end;
  v_next:=p_expected_review_revision+1;
  perform pg_catalog.set_config('app.staff_byline_actor',p_actor::text,true);
  perform pg_catalog.set_config('app.staff_byline_reason',p_reason,true);
  perform pg_catalog.set_config('app.staff_byline_request',p_request_id::text,true);
  if v_review.membership_id is null then
    insert into public.staff_byline_reviews values(p_member,p_byline,v_status,
      v_profile.revision,v_next,p_actor,pg_catalog.clock_timestamp());
  else
    update public.staff_byline_reviews set editorial_profile_id=p_byline,status=v_status,
      reviewed_profile_revision=v_profile.revision,revision=v_next,reviewed_by=p_actor,
      reviewed_at=pg_catalog.clock_timestamp() where membership_id=p_member;
  end if;
  return v_next;
end;
$fn$;

create function public.staff_list_byline_requests(p_actor uuid,p_page integer)
returns table(membership_id uuid,display_name text,member_type text,member_status text,
  profile_revision integer,review_revision integer,review_status text,
  editorial_profile_id uuid,byline_name text,requested boolean,eligible boolean)
language plpgsql stable security invoker set search_path=''
as $fn$
begin
  if not public.staff_byline_owner_allowed(p_actor) then
    raise exception 'Byline review denied' using errcode='42501'; end if;
  if p_page is null or p_page<0 or p_page>100 then
    raise exception 'Invalid page' using errcode='22023'; end if;
  return query select m.id,s.display_name,m.member_type,m.status,s.revision,coalesce(b.revision,0),
    case when b.status='approved' then
      case when public.staff_byline_candidate_allowed(m.id,b.editorial_profile_id) then 'approved' else 'conflict' end
      when s.byline_requested and (b.revision is null or s.revision>b.reviewed_profile_revision) then 'pending'
      when b.status is not null then b.status else 'withdrawn' end,
    b.editorial_profile_id,e.byline_name,s.byline_requested,
    public.staff_onboarding_actor_membership(m.auth_user_id) is not distinct from m.id
  from public.staff_onboarding_profiles s join public.staff_memberships m on m.id=s.membership_id
  left join public.staff_byline_reviews b on b.membership_id=m.id
  left join public.editorial_profiles e on e.id=b.editorial_profile_id
  where s.byline_requested or b.revision is not null
  order by s.updated_at desc,m.id desc offset p_page*25 limit 26;
end;
$fn$;

create function public.staff_list_byline_candidates(p_actor uuid,p_member uuid,p_page integer)
returns table(id uuid,byline_name text,slug text,byline_status text)
language plpgsql stable security invoker set search_path=''
as $fn$
begin
  if not public.staff_byline_owner_allowed(p_actor) then
    raise exception 'Byline review denied' using errcode='42501'; end if;
  if p_member is null or p_page is null or p_page<0 or p_page>100 then
    raise exception 'Invalid page' using errcode='22023'; end if;
  return query select e.id,e.byline_name,e.slug,e.byline_status
    from public.editorial_profiles e
    where public.staff_byline_candidate_allowed(p_member,e.id)
    order by e.byline_name,e.id offset p_page*25 limit 26;
end;
$fn$;
revoke all on function public.staff_review_byline(uuid,uuid,integer,integer,text,uuid,text,uuid),
  public.staff_list_byline_requests(uuid,integer),public.staff_list_byline_candidates(uuid,uuid,integer)
from public,anon,authenticated;
grant execute on function public.staff_review_byline(uuid,uuid,integer,integer,text,uuid,text,uuid),
  public.staff_list_byline_requests(uuid,integer),public.staff_list_byline_candidates(uuid,uuid,integer)
to service_role;
commit;
