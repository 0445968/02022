-- CT-05b.3 STAGED ONLY. CLI generated #45442747145.
-- The private definer is narrowly necessary: authenticated users have no
-- assignment INSERT privilege, and a draft must never be orphaned. Public RPC
-- wrappers are invoker-only. No service-role key or actor ID from the client.
begin;
create or replace function newsroom_private.guard_assigned_draft_copy()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
  if current_user<>'authenticated' then return new; end if;
  if newsroom_private.has_staff_permission('story.edit_all',old.id) then return new; end if;
  if not newsroom_private.has_staff_permission('newsroom.access')
    or not newsroom_private.has_staff_permission('story.view_assigned',old.id)
    or not newsroom_private.has_staff_permission('story.edit_assigned',old.id)
    or old.status<>'draft'
    or new.status not in ('draft','in_review')
    or new.updated_by is distinct from (select auth.uid())
    or (to_jsonb(new)-array['headline','subheadline','summary','body','status','updated_at','updated_by','search_vector'])
      is distinct from (to_jsonb(old)-array['headline','subheadline','summary','body','status','updated_at','updated_by','search_vector']) then
    raise exception 'Assigned draft copy change denied' using errcode='42501';
  end if;
  if new.status='in_review' and not newsroom_private.has_staff_permission('story.submit_review',old.id) then
    raise exception 'Assigned review submission denied' using errcode='42501';
  end if;
  if length(btrim(new.headline)) not between 1 and 300
    or length(coalesce(new.subheadline,''))>600
    or length(coalesce(new.summary,''))>3000
    or jsonb_typeof(new.body)<>'object'
    or new.body->>'type' is distinct from 'doc'
    or octet_length(new.body::text)>524288 then
    raise exception 'Invalid draft copy' using errcode='22023';
  end if;
  -- Existing inline images may be retained/removed, not introduced or changed.
  -- Strip null-valued attributes added by the existing TipTap schema.
  if exists(
    select 1 from jsonb_path_query(new.body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n(node)
    where not exists(select 1 from jsonb_path_query(old.body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) o(node)
      where jsonb_strip_nulls(n.node)=jsonb_strip_nulls(o.node))
  ) then raise exception 'New inline media requires editorial review' using errcode='42501'; end if;
  return new;
end;
$fn$;
-- Generated search_vector is computed AFTER BEFORE triggers, not user writable.
-- Preserve protected-column comparison for all other columns.

create table newsroom_private.writer_draft_requests(
 membership_id uuid not null references public.staff_memberships(id) on delete restrict,
 request_id uuid not null,
 story_id uuid not null unique references public.stories(id) on delete restrict,
 fingerprint bytea not null,
 created_at timestamptz not null default now(),
 primary key(membership_id,request_id)
);
alter table newsroom_private.writer_draft_requests enable row level security;
revoke all on newsroom_private.writer_draft_requests from public,anon,authenticated,service_role;

-- Check a hypothetical NEW self-assignment only for these two intrinsically
-- assigned capabilities. Never use this helper to authorize an existing story.
create function newsroom_private.writer_prospective_capability(p_member uuid,p_cap public.staff_capability_key)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select p_cap in ('story.view_assigned','story.edit_assigned')
 and not exists(select 1 from public.staff_capability_overrides o where o.membership_id=p_member
   and o.capability_key=p_cap and o.effect='deny' and o.scope in ('all','assigned')
   and (o.expires_at is null or o.expires_at>now()))
 and (exists(select 1 from public.staff_member_roles r join public.staff_role_capabilities g on g.role_preset_id=r.role_preset_id
   where r.membership_id=p_member and (r.expires_at is null or r.expires_at>now())
   and g.capability_key=p_cap and g.scope in ('all','assigned'))
 or exists(select 1 from public.staff_capability_overrides o where o.membership_id=p_member
   and o.capability_key=p_cap and o.effect='allow' and o.scope in ('all','assigned')
   and (o.expires_at is null or o.expires_at>now())))
$fn$;
revoke all on function newsroom_private.writer_prospective_capability(uuid,public.staff_capability_key) from public,anon,authenticated;

create function newsroom_private.can_start_writer_draft()
returns boolean language sql stable security definer set search_path=''
as $fn$
 select public.staff_invite_verified_identity((select auth.uid()))
 and newsroom_private.has_staff_permission('newsroom.access')
 and newsroom_private.has_staff_permission('story.create')
 and exists(select 1 from public.staff_memberships m join public.profiles p on p.id=m.auth_user_id
   where m.auth_user_id=(select auth.uid()) and m.status='active'
    and (m.expires_at is null or m.expires_at>now())
    and newsroom_private.writer_prospective_capability(m.id,'story.view_assigned')
    and newsroom_private.writer_prospective_capability(m.id,'story.edit_assigned'))
$fn$;
revoke all on function newsroom_private.can_start_writer_draft() from public,anon,authenticated;
grant execute on function newsroom_private.can_start_writer_draft() to authenticated;

-- The existing broad newsroom creator is preserved; restricted creators
-- cannot use direct INSERT to bypass atomic self-assignment or protected defaults.
create function newsroom_private.guard_restricted_story_insert()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 if current_user='authenticated' and not (
   newsroom_private.has_staff_permission('newsroom.access')
   and newsroom_private.has_staff_permission('story.view_all',new.id)
   and newsroom_private.has_staff_permission('story.edit_all',new.id)
   and newsroom_private.has_staff_permission('story.assign',new.id)) then
   raise exception 'Use the assigned writer draft creation operation' using errcode='42501';end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_restricted_story_insert() from public,anon,authenticated;
create trigger ct05b_restricted_story_insert before insert on public.stories
for each row execute function newsroom_private.guard_restricted_story_insert();

create function newsroom_private.start_writer_draft(p_request uuid,p_headline text,p_language text)
returns uuid language plpgsql security definer set search_path=''
as $fn$
declare v_actor uuid:=(select auth.uid()); v_member uuid; v_story uuid;
 v_previous newsroom_private.writer_draft_requests%rowtype; v_fingerprint bytea;
begin
 -- The existing assignment audit hook only exempts the database owner; this
 -- narrow function must be installed by postgres, not an arbitrary role.
 if current_user<>'postgres' then raise exception 'Writer creation not configured' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(202611,2302);
 if v_actor is null or not newsroom_private.can_start_writer_draft() then
   raise exception 'Writer creation denied' using errcode='42501';end if;
 if p_request is null or p_headline is null or length(btrim(p_headline)) not between 1 and 300
 or p_headline~'[[:cntrl:]]' or p_language is null or p_language not in ('en','es') then
   raise exception 'Invalid draft details' using errcode='22023';end if;
 select id into v_member from public.staff_memberships where auth_user_id=v_actor and status='active'
   and (expires_at is null or expires_at>now()) for update;
 if not found then raise exception 'Writer creation denied' using errcode='42501';end if;
 v_fingerprint:=pg_catalog.sha256(pg_catalog.convert_to(jsonb_build_array(btrim(p_headline),p_language)::text,'UTF8'));
 select * into v_previous from newsroom_private.writer_draft_requests where membership_id=v_member and request_id=p_request;
 if found then
   if v_previous.fingerprint is distinct from v_fingerprint
     or not exists(select 1 from public.stories where id=v_previous.story_id and status in ('draft','in_review'))
     or not newsroom_private.has_staff_permission('story.view_assigned',v_previous.story_id)
     or not newsroom_private.has_staff_permission('story.edit_assigned',v_previous.story_id) then
     raise exception 'Creation request no longer reusable' using errcode='40001';end if;
   return v_previous.story_id;
 end if;
 v_story:=gen_random_uuid();
 -- No public byline is created or selected. Internal creator != public author.
 insert into public.stories(id,slug,headline,language,status,body,author_id,editor_id,created_by,updated_by)
 values(v_story,'draft-'||v_story::text,btrim(p_headline),p_language::public.story_language,'draft',
  '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,null,null,v_actor,v_actor);
 perform pg_catalog.set_config('app.staff_actor_auth_id',v_actor::text,true);
 perform pg_catalog.set_config('app.staff_request_id',p_request::text,true);
 perform pg_catalog.set_config('app.staff_reason','Staff writer created an assigned draft',true);
 insert into public.staff_story_assignments(story_id,membership_id,assignment_type,status,created_by)
 values(v_story,v_member,'author','active',v_actor);
 -- Evaluate real resource grants after the assignment exists; failure rolls
 -- back the entire draft, assignment, audit, and request marker.
 if not newsroom_private.has_staff_permission('story.view_assigned',v_story)
 or not newsroom_private.has_staff_permission('story.edit_assigned',v_story) then
   raise exception 'New draft not editable' using errcode='42501';end if;
 insert into newsroom_private.writer_draft_requests(membership_id,request_id,story_id,fingerprint)
 values(v_member,p_request,v_story,v_fingerprint);
 return v_story;
end;
$fn$;
revoke all on function newsroom_private.start_writer_draft(uuid,text,text) from public,anon,authenticated;
grant execute on function newsroom_private.start_writer_draft(uuid,text,text) to authenticated;

create function public.staff_can_start_writer_draft()
returns boolean language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.can_start_writer_draft() $fn$;
create function public.staff_start_writer_draft(p_request uuid,p_headline text,p_language text)
returns uuid language sql security invoker set search_path=''
as $fn$ select newsroom_private.start_writer_draft(p_request,p_headline,p_language) $fn$;
revoke all on function public.staff_can_start_writer_draft(),public.staff_start_writer_draft(uuid,text,text) from public,anon,authenticated;
grant execute on function public.staff_can_start_writer_draft(),public.staff_start_writer_draft(uuid,text,text) to authenticated;
commit;
