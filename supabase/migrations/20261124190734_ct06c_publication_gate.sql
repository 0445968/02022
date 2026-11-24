-- CT-06c.1 STAGED ONLY. CLI generated #45466839761.
-- Activate only with completed scheduling contract and reviewed rollout.
begin;
-- Transaction-local permit inaccessible to all API roles. Never trust a
-- user-settable GUC to authorize live DML. No permit survives the publisher.
create table newsroom_private.publication_permits(
 story_id uuid primary key,
 transaction_id xid8 not null,
 backend_pid integer not null,
 actor uuid not null
);
create table newsroom_private.publication_events(
 request_id uuid primary key references newsroom_private.story_review_requests(id) on delete restrict,
 story_id uuid not null,
 kind text not null check(kind in ('draft','revision')),
 fingerprint text not null,
 published_by uuid not null,
 published_at timestamptz not null default clock_timestamp()
);
alter table newsroom_private.publication_permits enable row level security;
alter table newsroom_private.publication_events enable row level security;
revoke all on newsroom_private.publication_permits,newsroom_private.publication_events from public,anon,authenticated,service_role;
create function newsroom_private.publication_actor_permission(
  p_actor uuid,
  p_capability public.staff_capability_key,
  p_story_id uuid default null,
  p_resource_owner_auth_id uuid default null
) returns boolean language sql stable security invoker set search_path = ''
as $fn$
  select coalesce((
    select
      -- A scoped explicit DENY always takes precedence over role grants and
      -- scoped individual ALLOW. Invalid status and expired grants deny.
      not exists (
        select 1 from public.staff_capability_overrides o
        where o.membership_id = m.id
          and o.capability_key = p_capability
          and o.effect = 'deny'
          and (o.expires_at is null or o.expires_at > now())
          and newsroom_private.scope_matches(
            o.scope, p_story_id, p_resource_owner_auth_id, m.id, m.auth_user_id
          )
      )
      and (
        exists (
          select 1 from public.staff_member_roles mr
          join public.staff_role_capabilities c
            on c.role_preset_id = mr.role_preset_id
          where mr.membership_id = m.id
            and (mr.expires_at is null or mr.expires_at > now())
            and c.capability_key = p_capability
            and newsroom_private.scope_matches(
              c.scope, p_story_id, p_resource_owner_auth_id, m.id, m.auth_user_id
            )
        )
        or exists (
          select 1 from public.staff_capability_overrides o
          where o.membership_id = m.id
            and o.capability_key = p_capability
            and o.effect = 'allow'
            and (o.expires_at is null or o.expires_at > now())
            and newsroom_private.scope_matches(
              o.scope, p_story_id, p_resource_owner_auth_id, m.id, m.auth_user_id
            )
        )
      )
    from public.staff_memberships m
    where m.auth_user_id = p_actor
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
      and p_capability not in (
        'reader.personal'::public.staff_capability_key,
        'settings.security_admin'::public.staff_capability_key
      )
      -- These named capabilities are intrinsically scoped even when an
      -- administrator accidentally configures their grants as 'all'.
      and (
        p_capability not in (
          'story.view_assigned'::public.staff_capability_key,
          'story.edit_assigned'::public.staff_capability_key,
          'revision.edit_assigned'::public.staff_capability_key,
          'calendar.view_assigned'::public.staff_capability_key
        ) or exists (
          select 1 from public.staff_story_assignments a
          where a.story_id = p_story_id and a.membership_id = m.id
            and a.status = 'active'
        )
      )
      and (
        p_capability <> 'media.edit_own'::public.staff_capability_key
        or p_resource_owner_auth_id = p_actor
      )
    limit 1
  ), false);
$fn$;
revoke all on function newsroom_private.publication_actor_permission(uuid,public.staff_capability_key,uuid,uuid) from public,anon,authenticated,service_role;

create function newsroom_private.publication_permitted(p_story uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select exists(select 1 from newsroom_private.publication_permits
 where story_id=p_story and transaction_id=pg_current_xact_id()
 and backend_pid=pg_backend_pid() and actor=(select auth.uid()))
$fn$;
revoke all on function newsroom_private.publication_permitted(uuid) from public,anon,authenticated,service_role;

-- Enforced even for service-role and existing privileged routines. Only
-- archive-only live status transitions may bypass publication, not edits.
create function newsroom_private.guard_reviewed_live_story()
returns trigger language plpgsql security definer set search_path=''
as $fn$
begin
 if new.status='scheduled' then
  raise exception 'Scheduling requires reviewed scheduling workflow' using errcode='42501';end if;
 if tg_op='INSERT' then
  if new.status='published' then raise exception 'Publish saved approved copy instead' using errcode='42501';end if;
  return new;
 end if;
 if old.id is distinct from new.id then raise exception 'Story identity is immutable' using errcode='42501';end if;
 if old.status='published' or new.status='published' then
  if newsroom_private.publication_permitted(old.id) and new.status='published' then return new;end if;
  if old.status='published' and new.status='archived'
   and public.staff_invite_verified_identity((select auth.uid()))
   and newsroom_private.has_staff_permission('newsroom.access')
   and newsroom_private.has_staff_permission('story.archive_delete',old.id)
   and newsroom_private.has_staff_permission('story.publish',old.id)
   and (to_jsonb(old)-array['status','updated_at','updated_by','search_vector'])=
       (to_jsonb(new)-array['status','updated_at','updated_by','search_vector'])
   and new.updated_by=(select auth.uid()) then return new;end if;
  raise exception 'Live story changes require reviewed publication' using errcode='42501';
 end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_reviewed_live_story() from public,anon,authenticated,service_role;
create trigger ct06c_guard_reviewed_live_story before insert or update on public.stories
for each row execute function newsroom_private.guard_reviewed_live_story();

-- Serialize relation mutations against the parent lock BEFORE modifying any
-- rows. This prevents a concurrent unreviewed taxonomy edit racing publish.
create function newsroom_private.guard_live_story_relation()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare a uuid; b uuid; sid uuid; state text;
begin
 if tg_op<>'INSERT' then a:=old.story_id;end if;
 if tg_op<>'DELETE' then b:=new.story_id;end if;
 for sid in select distinct x from unnest(array[a,b]) x where x is not null order by x loop
  select status::text into state from public.stories where id=sid for update;
  if state='published' and not newsroom_private.publication_permitted(sid) then
   raise exception 'Live taxonomy changes require reviewed revision' using errcode='42501';end if;
 end loop;
 if tg_op='DELETE' then return old;end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_live_story_relation() from public,anon,authenticated,service_role;
create trigger ct06c_guard_live_category before insert or update or delete on public.story_categories for each row execute function newsroom_private.guard_live_story_relation();
create trigger ct06c_guard_live_tag before insert or update or delete on public.story_tags for each row execute function newsroom_private.guard_live_story_relation();

create function newsroom_private.guard_revision_publication_status()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 if new.status in ('published','scheduled') then
  raise exception 'Revision publication requires reviewed publisher' using errcode='42501';end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_revision_publication_status() from public,anon,authenticated,service_role;
create trigger ct06c_guard_revision_status before insert or update on public.story_revisions for each row execute function newsroom_private.guard_revision_publication_status();

-- Lock catalog and object metadata for referenced images, recheck the
-- existing cleared-image projection. No object writes. Untagged inline
-- images must also resolve to eligible catalog URL (and supplied asset ID).
create function newsroom_private.check_publication_media(p_body jsonb,p_feature uuid,p_credit text)
returns void language plpgsql security invoker set search_path=''
as $fn$
begin
 perform 1 from public.media_assets m where m.id=p_feature or exists(
  select 1 from jsonb_path_query(p_body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n
  where n->'attrs'->>'src'=m.url or n->'attrs'->>'mediaAssetId'=m.id::text)
 order by m.id for share;
 perform 1 from storage.objects o where o.bucket_id='media' and exists(
  select 1 from public.media_assets m where m.storage_path=o.name and (m.id=p_feature or exists(
   select 1 from jsonb_path_query(p_body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n
   where n->'attrs'->>'src'=m.url or n->'attrs'->>'mediaAssetId'=m.id::text)))
 order by o.name for share;
 if p_feature is not null and not exists(select 1 from newsroom_private.assigned_approved_media m
  where m.id=p_feature and (m.node->'attrs'->>'credit' is null or m.node->'attrs'->>'credit'=p_credit)) then
  raise exception 'Featured image is not eligible for publication' using errcode='22023';end if;
 if exists(select 1 from jsonb_path_query(p_body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n
  where not exists(select 1 from newsroom_private.assigned_approved_media m
   where m.node->'attrs'->>'src'=n->'attrs'->>'src'
   and (n->'attrs'->>'mediaAssetId' is null or m.id::text=n->'attrs'->>'mediaAssetId')
   and (m.node->'attrs'->>'credit' is null or m.node->'attrs'->>'credit'=n->'attrs'->>'credit')
   and (n->'attrs'->'approvedAttachment' is distinct from 'true'::jsonb or m.node=jsonb_strip_nulls(n)))) then
  raise exception 'Inline image is not eligible for publication' using errcode='22023';end if;
end;
$fn$;
revoke all on function newsroom_private.check_publication_media(jsonb,uuid,text) from public,anon,authenticated,service_role;

-- Original atomic revision application and prior version snapshot retained.
-- Internal only, invoked AFTER exact current approval and media checks.
CREATE FUNCTION newsroom_private.apply_reviewed_revision(p_story_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_revision public.story_revisions%rowtype;
  v_story public.stories%rowtype;
  v_authenticated_user_id uuid;
BEGIN
  /*
   * CT-02f: atomically verify the caller's real Supabase identity and
   * current staff capabilities before the privileged publication body.
   * No profile.is_editor, user_metadata or user-supplied role fallback.
   */
  SELECT auth.uid() INTO v_authenticated_user_id;
  IF v_authenticated_user_id IS NULL
     OR v_authenticated_user_id IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION
      'The authenticated user does not match the publishing user.'
      USING ERRCODE = '42501';
  END IF;

  -- This function remains SECURITY DEFINER solely to preserve the current
  -- atomic version/story/relations/revision transaction. The helper matches
  -- auth.uid() against live, active/non-expired membership + current role/
  -- override rows and checks explicit DENY precedence. Using the helper
  -- as the definer does NOT permit an actor mismatch: the identity check
  -- above is mandatory and is separately regression-tested.
  IF NOT (
       newsroom_private.has_staff_permission(
         'story.edit_all'::public.staff_capability_key, p_story_id
       )
       OR newsroom_private.has_staff_permission(
         'story.edit_assigned'::public.staff_capability_key, p_story_id
       )
     )
     OR NOT newsroom_private.has_staff_permission(
       'story.publish'::public.staff_capability_key, p_story_id
     )
     OR NOT newsroom_private.has_staff_permission(
       'revision.publish'::public.staff_capability_key, p_story_id
     ) THEN
    RAISE EXCEPTION
      'A current authorized editor is required to publish a revision.'
      USING ERRCODE = '42501';
  END IF;

  /*
   * Lock the live story so two publication operations cannot
   * update the same story concurrently.
   */
  SELECT *
  INTO v_story
  FROM public.stories
  WHERE id = p_story_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'Published story could not be found.'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_story.status <> 'published' THEN
    RAISE EXCEPTION
      'Only a published story can publish an update revision.'
      USING ERRCODE = 'P0001';
  END IF;

  /*
   * Lock and load the pending revision.
   */
  SELECT *
  INTO v_revision
  FROM public.story_revisions
  WHERE story_id = p_story_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'There are no unpublished changes to publish.'
      USING ERRCODE = 'P0002';
  END IF;

  /*
   * Preserve the copy that is currently live.
   *
   * short_title is included so historical versions preserve
   * the compact title that was live at that moment.
   */
  INSERT INTO public.story_versions (
    story_id,
    headline,
    short_title,
    subheadline,
    summary,
    body,
    author_id,
    editor_id,
    language,
    primary_category_id,
    created_by
  )
  VALUES (
    v_story.id,
    v_story.headline,
    v_story.short_title,
    v_story.subheadline,
    v_story.summary,
    v_story.body,
    v_story.author_id,
    v_story.editor_id,
    v_story.language,
    v_story.primary_category_id,
    p_user_id
  );

  /*
   * Publish the revision without resetting the story's
   * original West Island Times publication timestamp.
   *
   * short_title must be copied from the revision into
   * the live story together with the rest of the content.
   */
  UPDATE public.stories
  SET
    headline = v_revision.headline,
    short_title = v_revision.short_title,
    subheadline = v_revision.subheadline,
    summary = v_revision.summary,
    body = v_revision.body,
    language = v_revision.language,
    status = 'published',
    access_level = v_revision.access_level,
    author_id = v_revision.author_id,
    editor_id = v_revision.editor_id,
    primary_category_id = v_revision.primary_category_id,
    island = v_revision.island,
    featured_image_id = v_revision.featured_image_id,
    image_caption = v_revision.image_caption,
    image_credit = v_revision.image_credit,
    seo_title = v_revision.seo_title,
    seo_description = v_revision.seo_description,
    slug = v_revision.slug,
    originally_published_at =
      v_revision.originally_published_at,
    scheduled_at = NULL,
    published_at = COALESCE(
      v_story.published_at,
      now()
    ),
    updated_by = p_user_id
  WHERE id = p_story_id;

  /*
   * Replace category relationships.
   *
   * The primary category is included even if an older client
   * omitted it from category_ids.
   */
  DELETE FROM public.story_categories
  WHERE story_id = p_story_id;

  INSERT INTO public.story_categories (
    story_id,
    category_id,
    is_primary
  )
  SELECT
    p_story_id,
    categories.category_id,
    categories.category_id =
      v_revision.primary_category_id
  FROM (
    SELECT unnest(
      v_revision.category_ids
    ) AS category_id

    UNION

    SELECT
      v_revision.primary_category_id
    WHERE
      v_revision.primary_category_id
      IS NOT NULL
  ) AS categories
  WHERE
    categories.category_id
    IS NOT NULL;

  /*
   * Replace tag relationships.
   */
  DELETE FROM public.story_tags
  WHERE story_id = p_story_id;

  INSERT INTO public.story_tags (
    story_id,
    tag_id
  )
  SELECT DISTINCT
    p_story_id,
    tags.tag_id
  FROM (
    SELECT unnest(
      v_revision.tag_ids
    ) AS tag_id
  ) AS tags
  WHERE
    tags.tag_id
    IS NOT NULL;

  /*
   * Remove the revision only after every publication step
   * has succeeded.
   */
  DELETE FROM public.story_revisions
  WHERE id = v_revision.id;
END;
$function$;
revoke all on function newsroom_private.apply_reviewed_revision(uuid,uuid) from public,anon,authenticated,service_role;

create function newsroom_private.publish_reviewed_story(p_story uuid,p_kind text,p_request uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=(select auth.uid()); snap jsonb; q newsroom_private.story_review_requests%rowtype;
 d newsroom_private.story_review_decisions%rowtype; s public.stories%rowtype; r public.story_revisions%rowtype;
begin
 if p_kind is null or p_kind not in ('draft','revision') or p_request is null or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$' then
  raise exception 'Invalid publication request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not coalesce(public.staff_invite_verified_identity(actor),false)
 or not newsroom_private.has_staff_permission('newsroom.access')
 or not (newsroom_private.has_staff_permission('story.view_all',p_story) or newsroom_private.has_staff_permission('story.view_assigned',p_story))
 or not (newsroom_private.has_staff_permission('story.edit_all',p_story) or newsroom_private.has_staff_permission('story.edit_assigned',p_story))
 or not newsroom_private.has_staff_permission('story.publish',p_story)
 or (p_kind='revision' and not (newsroom_private.has_staff_permission('revision.view',p_story) and newsroom_private.has_staff_permission('revision.publish',p_story))) then
  raise exception 'Publication unavailable' using errcode='42501';end if;
 snap:=newsroom_private.lock_review_snapshot(p_story,p_kind);
 if snap is null or snap->>'status'<>'in_review' or snap->>'fingerprint' is distinct from p_fingerprint then
  raise exception 'Review source changed; reload' using errcode='40001';end if;
 select * into q from newsroom_private.story_review_requests where story_id=p_story and kind=p_kind order by seq desc limit 1;
 select * into d from newsroom_private.story_review_decisions where request_id=q.id;
 if q.id is distinct from p_request or q.fingerprint is distinct from p_fingerprint or q.generation is distinct from (snap->>'generation')::bigint
 or q.revision_id is distinct from (snap->>'revisionId')::uuid or d.decision is distinct from 'approved'
 or exists(select 1 from newsroom_private.publication_events where request_id=p_request) then
  raise exception 'Current independent approval required' using errcode='40001';end if;
 -- Re-evaluate the actual reviewer, not the publisher or a spoofed JWT.
 if not coalesce(public.staff_invite_verified_identity(d.decided_by),false)
 or not newsroom_private.publication_actor_permission(d.decided_by,'newsroom.access')
 or not (newsroom_private.publication_actor_permission(d.decided_by,'story.view_all',p_story) or newsroom_private.publication_actor_permission(d.decided_by,'story.view_assigned',p_story))
 or not newsroom_private.publication_actor_permission(d.decided_by,'story.review',p_story)
 or (p_kind='revision' and not newsroom_private.publication_actor_permission(d.decided_by,'revision.view',p_story))
 or d.decided_by=q.requested_by or d.decided_by::text is not distinct from snap->>'creator'
 or d.decided_by::text is not distinct from snap->>'updater' or d.decided_by::text is not distinct from snap->>'lastActor'
 or exists(select 1 from public.staff_story_assignments a join public.staff_memberships m on m.id=a.membership_id
    where a.story_id=p_story and a.assignment_type='author' and a.status='active' and m.auth_user_id=d.decided_by) then
  raise exception 'Reviewer no longer eligible; obtain fresh review' using errcode='42501';end if;
 select * into s from public.stories where id=p_story;
 if p_kind='revision' then
  select * into r from public.story_revisions where id=q.revision_id and story_id=p_story;
  perform newsroom_private.check_publication_media(r.body,r.featured_image_id,r.image_credit);
 else
  perform newsroom_private.check_publication_media(s.body,s.featured_image_id,s.image_credit);
 end if;
 insert into newsroom_private.publication_permits values(p_story,pg_current_xact_id(),pg_backend_pid(),actor);
 if p_kind='revision' then
  perform newsroom_private.apply_reviewed_revision(p_story,actor);
 else
  update public.stories set status='published',published_at=coalesce(s.published_at,now()),scheduled_at=null,updated_by=actor
   where id=p_story and status='in_review' returning * into s;
  if not found then raise exception 'Story changed; reload' using errcode='40001';end if;
  insert into public.story_versions(story_id,headline,short_title,subheadline,summary,body,author_id,editor_id,language,primary_category_id,created_by)
   values(s.id,s.headline,s.short_title,s.subheadline,s.summary,s.body,s.author_id,s.editor_id,s.language,s.primary_category_id,actor);
 end if;
 insert into newsroom_private.publication_events(request_id,story_id,kind,fingerprint,published_by) values(q.id,p_story,p_kind,p_fingerprint,actor);
 delete from newsroom_private.publication_permits where story_id=p_story and transaction_id=pg_current_xact_id();
 return jsonb_build_object('storyId',p_story,'kind',p_kind,'requestId',q.id,'status','published');
end;
$fn$;
revoke all on function newsroom_private.publish_reviewed_story(uuid,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.publish_reviewed_story(uuid,text,uuid,text) to authenticated;
create function public.staff_publish_reviewed_story(p_story uuid,p_kind text,p_request uuid,p_fingerprint text)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.publish_reviewed_story(p_story,p_kind,p_request,p_fingerprint) $fn$;
revoke all on function public.staff_publish_reviewed_story(uuid,text,uuid,text) from public,anon,authenticated,service_role;
grant execute on function public.staff_publish_reviewed_story(uuid,text,uuid,text) to authenticated;

-- Old public signature cannot bypass the explicit approved-request CAS.
create or replace function public.publish_story_revision(p_story_id uuid,p_user_id uuid)
returns void language plpgsql security invoker set search_path=''
as $fn$ begin
 raise exception 'Use reviewed publication workflow' using errcode='42501';
end; $fn$;
revoke all on function public.publish_story_revision(uuid,uuid) from public,anon,authenticated,service_role;
commit;
