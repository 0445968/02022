-- CT16 R2a story type foundation. Staged source: generate migration with pinned CLI before adoption.
-- Existing rows receive the requested neutral default; do not infer type from opinion/category.
-- Existing review hashes include full row JSON: open reviews/schedules become stale by design.
-- Do not activate before updating every app snapshot writer and testing actual role flows.
begin;
alter table public.stories add column story_type text not null default 'news_report'
 constraint ct16_stories_story_type_check check(story_type in ('news_report','video_story','press_release','breaking_news','qa','editorial','profile','column','review','investigative','service_journalism','listicle_roundup','case_study','annual_impact_report','correction_clarification','letter_to_editor','obituary','explainer','analysis','opinion','interview','photo_essay','live_blog','data_journalism','fact_check','podcast_audio','timeline','announcement'));
alter table public.story_revisions add column story_type text not null default 'news_report'
 constraint ct16_story_revisions_story_type_check check(story_type in ('news_report','video_story','press_release','breaking_news','qa','editorial','profile','column','review','investigative','service_journalism','listicle_roundup','case_study','annual_impact_report','correction_clarification','letter_to_editor','obituary','explainer','analysis','opinion','interview','photo_essay','live_blog','data_journalism','fact_check','podcast_audio','timeline','announcement'));
alter table public.story_versions add column story_type text not null default 'news_report'
 constraint ct16_story_versions_story_type_check check(story_type in ('news_report','video_story','press_release','breaking_news','qa','editorial','profile','column','review','investigative','service_journalism','listicle_roundup','case_study','annual_impact_report','correction_clarification','letter_to_editor','obituary','explainer','analysis','opinion','interview','photo_essay','live_blog','data_journalism','fact_check','podcast_audio','timeline','announcement'));
-- Existing assigned draft/revision UPDATE guards compare entire protected row JSON;
-- explicitly preserve live type on assigned revision creation and copy it in the narrow RPC.
CREATE OR REPLACE FUNCTION newsroom_private.guard_assigned_revision_copy()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare s public.stories%rowtype; v_body jsonb; v_categories uuid[]; v_tags uuid[];
begin
 if current_user<>'authenticated' then return new; end if;
 if newsroom_private.has_staff_permission('story.edit_all',new.story_id) then return new; end if;
 if not newsroom_private.can_edit_assigned_revision(new.story_id)
 or new.updated_by is distinct from (select auth.uid())
 or new.status not in ('draft','in_review') then
   raise exception 'Assigned revision copy denied' using errcode='42501'; end if;
 select * into s from public.stories where id=new.story_id and status='published';
 if not found then raise exception 'Published source required' using errcode='42501'; end if;
 if new.status='in_review' and not newsroom_private.has_staff_permission('story.submit_review',new.story_id) then
   raise exception 'Revision submission denied' using errcode='42501'; end if;
 if tg_op='UPDATE' then
   if old.status<>'draft' or
     (to_jsonb(new)-array['headline','subheadline','summary','body','status','updated_at','updated_by'])
     is distinct from (to_jsonb(old)-array['headline','subheadline','summary','body','status','updated_at','updated_by']) then
     raise exception 'Protected revision fields or submitted revision' using errcode='42501'; end if;
   v_body:=old.body;
 else
   select coalesce(array_agg(category_id order by category_id),'{}'::uuid[]) into v_categories
     from public.story_categories where story_id=s.id;
   select coalesce(array_agg(tag_id order by tag_id),'{}'::uuid[]) into v_tags
     from public.story_tags where story_id=s.id;
   if new.created_by is distinct from (select auth.uid())
      or new.created_at is distinct from transaction_timestamp()
      or new.updated_at is distinct from transaction_timestamp()
      or row(new.short_title,new.story_type,new.language,new.access_level,new.author_id,new.editor_id,
        new.primary_category_id,new.island,new.featured_image_id,new.image_caption,new.image_credit,
        new.seo_title,new.seo_description,new.slug,new.originally_published_at,new.scheduled_at)
      is distinct from row(s.short_title,s.story_type,s.language,s.access_level,s.author_id,s.editor_id,
        s.primary_category_id,s.island,s.featured_image_id,s.image_caption,s.image_credit,
        s.seo_title,s.seo_description,s.slug,s.originally_published_at,s.scheduled_at)
      or new.category_ids is distinct from v_categories or new.tag_ids is distinct from v_tags then
     raise exception 'Revision must preserve live editorial metadata' using errcode='42501'; end if;
   v_body:=s.body;
 end if;
 if length(btrim(new.headline)) not between 1 and 300
    or length(coalesce(new.subheadline,''))>600 or length(coalesce(new.summary,''))>3000
    or jsonb_typeof(new.body)<>'object' or new.body->>'type' is distinct from 'doc'
    or octet_length(new.body::text)>524288 then
   raise exception 'Invalid revision copy' using errcode='22023'; end if;
 if not newsroom_private.assigned_inline_media_allowed(new.story_id,v_body,new.body) then
   raise exception 'Inline media not eligible; remove or reselect it' using errcode='22023';end if;
 return new;
end;
$fn$;

CREATE OR REPLACE FUNCTION public.staff_save_assigned_revision(p_story uuid,p_live_updated_at timestamptz,
 p_revision uuid,p_updated_at timestamptz,p_action text,p_headline text,p_subheadline text,p_summary text,p_body jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare s public.stories%rowtype; r public.story_revisions%rowtype;
  v_status public.story_status;
begin
 if not newsroom_private.can_edit_assigned_revision(p_story) then
   raise exception 'Revision unavailable' using errcode='42501'; end if;
 if p_action is null or p_action not in ('save','submit') or p_live_updated_at is null or p_updated_at is null
   or p_headline is null or length(btrim(p_headline)) not between 1 and 300
   or length(coalesce(p_subheadline,''))>600 or length(coalesce(p_summary,''))>3000
   or p_body is null or jsonb_typeof(p_body)<>'object' or p_body->>'type' is distinct from 'doc'
   or octet_length(p_body::text)>524288 or not newsroom_private.valid_assigned_body(p_body) then raise exception 'Invalid copy' using errcode='22023';end if;
 if p_action='submit' and not newsroom_private.has_staff_permission('story.submit_review',p_story) then
   raise exception 'Revision submission denied' using errcode='42501'; end if;
 v_status:=case when p_action='submit' then 'in_review'::public.story_status else 'draft'::public.story_status end;
 -- Same lock order as publish_story_revision. No live story UPDATE.
 select * into s from public.stories where id=p_story and status='published' for update;
 if not found or s.updated_at is distinct from p_live_updated_at then
   raise exception 'Live story changed' using errcode='40001'; end if;
 select * into r from public.story_revisions where story_id=p_story for update;
 if r.id is distinct from p_revision or coalesce(r.updated_at,s.updated_at) is distinct from p_updated_at
 or (r.id is not null and r.status<>'draft') then
   raise exception 'Revision changed' using errcode='40001'; end if;
 -- Even callers holding broad edit grants must obey the narrow RPC contract.
 if not newsroom_private.assigned_inline_media_allowed(p_story,coalesce(r.body,s.body),p_body) then
   raise exception 'Inline media not eligible; remove or reselect it' using errcode='22023';end if;
 if r.id is null then
   insert into public.story_revisions(story_id,headline,subheadline,summary,body,status,
    short_title,story_type,language,access_level,author_id,editor_id,primary_category_id,category_ids,tag_ids,
    island,featured_image_id,image_caption,image_credit,seo_title,seo_description,slug,
    originally_published_at,scheduled_at,created_by,updated_by)
   values(s.id,btrim(p_headline),p_subheadline,p_summary,p_body,v_status,
    s.short_title,s.story_type,s.language,s.access_level,s.author_id,s.editor_id,s.primary_category_id,
    array(select category_id from public.story_categories where story_id=s.id order by category_id),
    array(select tag_id from public.story_tags where story_id=s.id order by tag_id),
    s.island,s.featured_image_id,s.image_caption,s.image_credit,s.seo_title,s.seo_description,s.slug,
    s.originally_published_at,s.scheduled_at,(select auth.uid()),(select auth.uid()));
 else
   update public.story_revisions set headline=btrim(p_headline),subheadline=p_subheadline,summary=p_summary,
    body=p_body,status=v_status,updated_by=(select auth.uid()) where id=r.id;
 end if;
 return public.staff_read_assigned_revision(p_story);
end;
$fn$;

-- Explicit snapshots and both immediate/scheduled reviewed publication use the type.
CREATE OR REPLACE FUNCTION newsroom_private.guard_story_version_snapshot()
returns trigger language plpgsql security invoker set search_path = ''
as $fn$
begin
  if current_user <> 'authenticated' then return new; end if;
  if new.created_by is distinct from (select auth.uid()) then
    raise exception 'A version must be attributed to the current user'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.stories s
    where s.id = new.story_id
      and (
        newsroom_private.has_staff_permission('story.edit_all',new.story_id)
        or newsroom_private.has_staff_permission('story.edit_assigned',new.story_id)
      )
      and s.headline is not distinct from new.headline
      and s.short_title is not distinct from new.short_title
      and s.story_type is not distinct from new.story_type
      and s.subheadline is not distinct from new.subheadline
      and s.summary is not distinct from new.summary
      and s.body is not distinct from new.body
      and s.author_id is not distinct from new.author_id
      and s.editor_id is not distinct from new.editor_id
      and s.language is not distinct from new.language
      and s.primary_category_id is not distinct from new.primary_category_id
  ) then
    raise exception 'History snapshot must match the current editable story'
      using errcode = '42501';
  end if;
  return new;
end;
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
    story_type,
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
    v_story.story_type,
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
    story_type = v_revision.story_type,
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

CREATE OR REPLACE FUNCTION newsroom_private.apply_validated_publication(p_story uuid,p_kind text,p_request uuid,p_fingerprint text,actor uuid,p_schedule uuid)
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
  insert into public.story_versions(story_id,headline,short_title,story_type,subheadline,summary,body,author_id,editor_id,language,primary_category_id,created_by)
   values(s.id,s.headline,s.short_title,s.story_type,s.subheadline,s.summary,s.body,s.author_id,s.editor_id,s.language,s.primary_category_id,actor);
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

commit;
