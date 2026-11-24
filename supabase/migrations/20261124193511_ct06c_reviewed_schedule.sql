-- CT-06c.2 STAGED ONLY. CLI-generated #45471736789.
-- Queue preserves exact reviewed source row/status/epoch. No job installed.
begin;
create table newsroom_private.reviewed_publication_schedules(
 id uuid primary key default gen_random_uuid(),
 story_id uuid not null references public.stories(id) on delete restrict,
 kind text not null check(kind in ('draft','revision')),
 request_id uuid not null references newsroom_private.story_review_requests(id) on delete restrict,
 fingerprint text not null check(fingerprint~'^[0-9a-f]{64}$'),
 due_at timestamptz not null check(isfinite(due_at)),
 authorized_by uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 state text not null default 'pending' check(state in ('pending','blocked','cancelled','published')),
 ended_at timestamptz,
 cancelled_by uuid,
 failure_code text check(failure_code~'^[0-9A-Z]{5}$'),
 check((state='pending' and ended_at is null and cancelled_by is null and failure_code is null)
 or (state='blocked' and ended_at is not null and cancelled_by is null and failure_code is not null)
 or (state='cancelled' and ended_at is not null and cancelled_by is not null)
 or (state='published' and ended_at is not null and cancelled_by is null and failure_code is null))
);
create unique index ct06c_one_active_schedule on newsroom_private.reviewed_publication_schedules(story_id)
 where state in ('pending','blocked');
create index ct06c_due_schedule on newsroom_private.reviewed_publication_schedules(due_at,id) where state='pending';
alter table newsroom_private.reviewed_publication_schedules enable row level security;
revoke all on newsroom_private.reviewed_publication_schedules from public,anon,authenticated,service_role;

-- Same exact authorization and media validator for immediate and scheduled
-- execution. Actor is private explicit argument, never a spoofed JWT/GUC.
create function newsroom_private.validate_reviewed_publication(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,actor uuid)
returns uuid language plpgsql security invoker set search_path=''
as $fn$
declare snap jsonb; q newsroom_private.story_review_requests%rowtype;
 d newsroom_private.story_review_decisions%rowtype; s public.stories%rowtype; r public.story_revisions%rowtype;
begin
 if p_kind is null or p_kind not in ('draft','revision') or p_request is null or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$' then
  raise exception 'Invalid publication request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not coalesce(public.staff_invite_verified_identity(actor),false)
 or not newsroom_private.publication_actor_permission(actor,'newsroom.access')
 or not (newsroom_private.publication_actor_permission(actor,'story.view_all',p_story) or newsroom_private.publication_actor_permission(actor,'story.view_assigned',p_story))
 or not (newsroom_private.publication_actor_permission(actor,'story.edit_all',p_story) or newsroom_private.publication_actor_permission(actor,'story.edit_assigned',p_story))
 or not newsroom_private.publication_actor_permission(actor,'story.publish',p_story)
 or (p_kind='revision' and not (newsroom_private.publication_actor_permission(actor,'revision.view',p_story) and newsroom_private.publication_actor_permission(actor,'revision.publish',p_story))) then
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

 return q.id;
end;
$fn$;
revoke all on function newsroom_private.validate_reviewed_publication(uuid,text,uuid,text,uuid) from public,anon,authenticated,service_role;
-- Permit remains inaccessible, transaction/backend/story bound. The owner-only
-- scheduler has no Auth JWT; the verified original authorizer is in the permit.
create or replace function newsroom_private.publication_permitted(p_story uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select exists(select 1 from newsroom_private.publication_permits
 where story_id=p_story and transaction_id=pg_current_xact_id()
 and backend_pid=pg_backend_pid() and ((select auth.uid()) is null or actor=(select auth.uid())))
$fn$;
CREATE OR REPLACE FUNCTION newsroom_private.apply_reviewed_revision(p_story_id uuid, p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_revision public.story_revisions%rowtype;
  v_story public.stories%rowtype;
BEGIN
  /*
   * CT-02f: atomically verify the caller's real Supabase identity and
   * current staff capabilities before the privileged publication body.
   * No profile.is_editor, user_metadata or user-supplied role fallback.
   */
  -- Internal-only caller has already checked the actual authorized actor,
  -- current reviewer, exact approval and private transaction permit.
  IF p_user_id IS NULL OR NOT newsroom_private.publication_permitted(p_story_id) THEN
    RAISE EXCEPTION 'Publication permit required' USING ERRCODE='42501';
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
create function newsroom_private.apply_validated_publication(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,actor uuid,p_schedule uuid)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare q newsroom_private.story_review_requests%rowtype; s public.stories%rowtype; schedule newsroom_private.reviewed_publication_schedules%rowtype;
begin
 perform pg_advisory_xact_lock(202611,2302);
 select * into schedule from newsroom_private.reviewed_publication_schedules
  where story_id=p_story and state in ('pending','blocked') for update;
 if p_schedule is null then
  if found then raise exception 'Cancel active schedule before immediate publication' using errcode='40001';end if;
  if actor is distinct from (select auth.uid()) then raise exception 'Publisher identity mismatch' using errcode='42501';end if;
 else
  if (select auth.uid()) is not null or not found or schedule.id is distinct from p_schedule
   or schedule.state<>'pending' or schedule.due_at>clock_timestamp()
   or schedule.kind is distinct from p_kind or schedule.request_id is distinct from p_request
   or schedule.fingerprint is distinct from p_fingerprint or schedule.authorized_by is distinct from actor
   or not newsroom_private.publication_actor_permission(actor,'story.schedule',p_story) then
    raise exception 'Scheduled publication unavailable' using errcode='42501';end if;
 end if;
 perform newsroom_private.validate_reviewed_publication(p_story,p_kind,p_request,p_fingerprint,actor);
 select * into q from newsroom_private.story_review_requests where id=p_request;
 select * into s from public.stories where id=p_story;
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
 if p_schedule is not null then
  update newsroom_private.reviewed_publication_schedules set state='published',ended_at=clock_timestamp() where id=p_schedule and state='pending';
  if not found then raise exception 'Schedule changed' using errcode='40001';end if;
 end if;
 return jsonb_build_object('storyId',p_story,'kind',p_kind,'requestId',q.id,'status','published');
end;
$fn$;
revoke all on function newsroom_private.apply_validated_publication(uuid,text,uuid,text,uuid,uuid) from public,anon,authenticated,service_role;
create or replace function newsroom_private.publish_reviewed_story(p_story uuid,p_kind text,p_request uuid,p_fingerprint text)
returns jsonb language sql security definer set search_path=''
as $fn$
 select newsroom_private.apply_validated_publication(p_story,p_kind,p_request,p_fingerprint,(select auth.uid()),null)
$fn$;

create function newsroom_private.schedule_manager_allowed(p_story uuid,p_kind text)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and newsroom_private.has_staff_permission('newsroom.access')
 and (newsroom_private.has_staff_permission('story.view_all',p_story) or newsroom_private.has_staff_permission('story.view_assigned',p_story))
 and (newsroom_private.has_staff_permission('story.edit_all',p_story) or newsroom_private.has_staff_permission('story.edit_assigned',p_story))
 and newsroom_private.has_staff_permission('story.publish',p_story)
 and newsroom_private.has_staff_permission('story.schedule',p_story)
 and (p_kind='draft' or (p_kind='revision' and newsroom_private.has_staff_permission('revision.view',p_story) and newsroom_private.has_staff_permission('revision.publish',p_story)))
$fn$;
revoke all on function newsroom_private.schedule_manager_allowed(uuid,text) from public,anon,authenticated,service_role;
create function newsroom_private.read_reviewed_schedule(p_story uuid,p_kind text)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare row newsroom_private.reviewed_publication_schedules%rowtype; snap jsonb;
begin
 if p_kind is null or p_kind not in ('draft','revision') or not (
  coalesce(newsroom_private.schedule_manager_allowed(p_story,p_kind),false)
  or coalesce(newsroom_private.review_access(p_story,p_kind,'submit'),false)
  or coalesce(newsroom_private.review_access(p_story,p_kind,'decide'),false)) then
  raise exception 'Schedule unavailable' using errcode='42501';end if;
 select * into row from newsroom_private.reviewed_publication_schedules where story_id=p_story and kind=p_kind and state in ('pending','blocked');
 if not found then return null;end if;
 snap:=newsroom_private.review_snapshot(p_story,p_kind);
 return jsonb_build_object('id',row.id,'kind',row.kind,'dueAt',row.due_at,'state',row.state,
 'current',coalesce(snap->>'status'='in_review' and snap->>'fingerprint'=row.fingerprint,false),
 'canCancel',newsroom_private.schedule_manager_allowed(p_story,p_kind));
end;
$fn$;
create function newsroom_private.create_reviewed_schedule(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,p_due timestamptz)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
begin
 if p_kind is null or p_kind not in ('draft','revision') or p_due is null or not isfinite(p_due)
 or p_due<=clock_timestamp() or p_due>clock_timestamp()+interval '1 year' then
  raise exception 'Invalid schedule time' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not coalesce(newsroom_private.schedule_manager_allowed(p_story,p_kind),false) then
  raise exception 'Schedule unavailable' using errcode='42501';end if;
 if exists(select 1 from newsroom_private.reviewed_publication_schedules where story_id=p_story and state in ('pending','blocked')) then
  raise exception 'Cancel existing schedule first' using errcode='40001';end if;
 perform newsroom_private.validate_reviewed_publication(p_story,p_kind,p_request,p_fingerprint,(select auth.uid()));
 insert into newsroom_private.reviewed_publication_schedules(story_id,kind,request_id,fingerprint,due_at,authorized_by)
 values(p_story,p_kind,p_request,p_fingerprint,p_due,(select auth.uid()));
 return newsroom_private.read_reviewed_schedule(p_story,p_kind);
end;
$fn$;
create function newsroom_private.cancel_reviewed_schedule(p_story uuid,p_kind text,p_schedule uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
begin
 perform pg_advisory_xact_lock(202611,2302);
 if p_schedule is null or not coalesce(newsroom_private.schedule_manager_allowed(p_story,p_kind),false) then
  raise exception 'Schedule unavailable' using errcode='42501';end if;
 update newsroom_private.reviewed_publication_schedules set state='cancelled',ended_at=clock_timestamp(),cancelled_by=(select auth.uid())
 where id=p_schedule and story_id=p_story and kind=p_kind and state in ('pending','blocked');
 if not found then raise exception 'Schedule changed; reload' using errcode='40001';end if;
 return jsonb_build_object('id',p_schedule,'state','cancelled');
end;
$fn$;
revoke all on function newsroom_private.read_reviewed_schedule(uuid,text),newsroom_private.create_reviewed_schedule(uuid,text,uuid,text,timestamptz),newsroom_private.cancel_reviewed_schedule(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_reviewed_schedule(uuid,text),newsroom_private.create_reviewed_schedule(uuid,text,uuid,text,timestamptz),newsroom_private.cancel_reviewed_schedule(uuid,text,uuid) to authenticated;
create function public.staff_read_reviewed_schedule(p_story uuid,p_kind text)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_reviewed_schedule(p_story,p_kind) $fn$;
create function public.staff_create_reviewed_schedule(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,p_due timestamptz)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.create_reviewed_schedule(p_story,p_kind,p_request,p_fingerprint,p_due) $fn$;
create function public.staff_cancel_reviewed_schedule(p_story uuid,p_kind text,p_schedule uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.cancel_reviewed_schedule(p_story,p_kind,p_schedule) $fn$;
revoke all on function public.staff_read_reviewed_schedule(uuid,text),public.staff_create_reviewed_schedule(uuid,text,uuid,text,timestamptz),public.staff_cancel_reviewed_schedule(uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_reviewed_schedule(uuid,text),public.staff_create_reviewed_schedule(uuid,text,uuid,text,timestamptz),public.staff_cancel_reviewed_schedule(uuid,text,uuid) to authenticated;

-- Owner-only bounded execution contract for reviewed CT08 cron installation.
-- No public RPC, service role grant, JWT impersonation, caller clock or actor.
create function newsroom_private.run_due_reviewed_publications(p_limit integer default 5)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare item newsroom_private.reviewed_publication_schedules%rowtype; done integer:=0; blocked integer:=0; code text;
begin
 if current_user<>'postgres' or session_user<>'postgres' or (select auth.uid()) is not null then
  raise exception 'Scheduler unavailable' using errcode='42501';end if;
 if p_limit is null or p_limit not between 1 and 10 then raise exception 'Invalid batch size' using errcode='22023';end if;
 if not pg_try_advisory_xact_lock(202611,2302) then return jsonb_build_object('published',0,'blocked',0,'busy',true);end if;
 for item in select * from newsroom_private.reviewed_publication_schedules
 where state='pending' and due_at<=clock_timestamp() order by due_at,id limit p_limit for update skip locked loop
  begin
   perform newsroom_private.apply_validated_publication(item.story_id,item.kind,item.request_id,item.fingerprint,item.authorized_by,item.id);
   done:=done+1;
  exception when others then
   -- Subtransaction rollback includes all live/version/event/permit writes.
   get stacked diagnostics code=returned_sqlstate;
   update newsroom_private.reviewed_publication_schedules set state='blocked',ended_at=clock_timestamp(),failure_code=code
    where id=item.id and state='pending';
   blocked:=blocked+1;
  end;
 end loop;
 return jsonb_build_object('published',done,'blocked',blocked,'busy',false);
end;
$fn$;
revoke all on function newsroom_private.run_due_reviewed_publications(integer) from public,anon,authenticated,service_role;
commit;
