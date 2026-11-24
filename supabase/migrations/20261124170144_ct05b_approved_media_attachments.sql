-- CT-05b.4 STAGED ONLY. CLI generated #45443868336.
-- No public article or object mutation, no private draft URL disclosure.
begin;
-- Fixed owner-rights projection over the existing PUBLIC bucket and reviewed
-- assets only. Keep private schema outside exposed PostgREST schemas. This
-- intentionally does not expand media_assets RLS or reveal internal notes.
create view newsroom_private.assigned_approved_media with(security_barrier=true) as
 select m.id, jsonb_strip_nulls(jsonb_build_object('type','image','attrs',
  jsonb_build_object('src',m.url,'alt',case when m.decorative then '' else btrim(m.alt_text) end,
   'mediaAssetId',m.id::text,'approvedAttachment',true,
   'description',case when m.display_caption then nullif(btrim(m.caption),'') end,
   'credit',case when m.display_credit then nullif(btrim(m.credit),'') end))) as node
 from public.media_assets m
 where m.status='approved' and m.trashed_at is null and m.archived_at is null
  and not m.is_superseded
  and (m.embargo_until is null or m.embargo_until<=now())
  and (m.license_expires_at is null or m.license_expires_at>now())
  and m.rights_status::text in ('owned','staff_created','licensed','public_domain','creative_commons')
  and (m.rights_status::text not in ('licensed','creative_commons') or
    (m.display_credit and nullif(btrim(m.credit),'') is not null and nullif(btrim(m.license_name),'') is not null))
  and m.mime_type in ('image/jpeg','image/png','image/webp','image/gif','image/avif')
  and (m.decorative or nullif(btrim(m.alt_text),'') is not null)
  and length(m.url)<=4096 and length(coalesce(m.alt_text,''))<=4096
  and length(coalesce(m.caption,''))<=4096 and length(coalesce(m.credit,''))<=4096
  and m.url~'^https://[a-z0-9-]+[.]supabase[.]co/storage/v1/object/public/media/[A-Za-z0-9_./%+-]+$'
  and substring(m.url from '^https://[a-z0-9-]+[.]supabase[.]co/storage/v1/object/public/media/(.*)$')=m.storage_path
  and m.storage_path!~'(^|/)[.][.]?(/|$)' and m.storage_path!~*'%2e|%2f|%5c'
  and exists(select 1 from storage.objects o where o.bucket_id='media' and o.name=m.storage_path);
revoke all on newsroom_private.assigned_approved_media from public,anon,authenticated;
grant select on newsroom_private.assigned_approved_media to authenticated;

-- Compare full canonical nodes and multiplicity, not merely an asset ID or
-- URL. Existing untagged legacy images can remain/reorder/remove, but cannot
-- be duplicated or modified unless replaced by an eligible canonical node.
-- Previously attached tagged images must still be eligible on every save,
-- including review submission. No new metadata/credit/URL from the client.
create function newsroom_private.assigned_inline_media_allowed(p_story uuid,p_old jsonb,p_new jsonb)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 with old_nodes as(
  select jsonb_strip_nulls(node) node,count(*) n
  from jsonb_path_query(p_old,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) node
  group by 1
 ), new_nodes as(
  select jsonb_strip_nulls(node) node,count(*) n
  from jsonb_path_query(p_new,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) node
  group by 1
 )
 select not exists(
  select 1 from new_nodes n left join old_nodes o on o.node=n.node
  where
   (n.n>coalesce(o.n,0) and not(
      newsroom_private.has_staff_permission('newsroom.access')
      and newsroom_private.has_staff_permission('story.view_assigned',p_story)
      and newsroom_private.has_staff_permission('story.edit_assigned',p_story)
      and newsroom_private.has_staff_permission('media.upload')
   ))
   or ((n.n>coalesce(o.n,0) or n.node->'attrs'->'approvedAttachment'='true'::jsonb)
       and not exists(select 1 from newsroom_private.assigned_approved_media m where m.node=n.node))
 )
$fn$;
revoke all on function newsroom_private.assigned_inline_media_allowed(uuid,jsonb,jsonb) from public,anon,authenticated;
grant execute on function newsroom_private.assigned_inline_media_allowed(uuid,jsonb,jsonb) to authenticated;

-- Catalog access is story-specific. No arbitrary offset or unscoped base
-- media table query, and no signed or private draft URLs.
create function public.staff_list_assigned_approved_media(p_story uuid,p_revision boolean,p_page integer)
returns jsonb language plpgsql stable security invoker set search_path=''
as $fn$
declare result jsonb;
begin
 if p_revision is null or p_page is null or p_page<0 or p_page>100 then
  raise exception 'Invalid media request' using errcode='22023';end if;
 if not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('story.view_assigned',p_story)
 or not newsroom_private.has_staff_permission('story.edit_assigned',p_story)
 or not newsroom_private.has_staff_permission('media.upload') then
  raise exception 'Media picker unavailable' using errcode='42501';end if;
 if p_revision then
  if not newsroom_private.can_edit_assigned_revision(p_story)
   or not exists(select 1 from public.stories where id=p_story and status='published')
   or exists(select 1 from public.story_revisions where story_id=p_story and status<>'draft') then
    raise exception 'Revision picker unavailable' using errcode='42501';end if;
 elsif not exists(select 1 from public.stories where id=p_story and status='draft') then
  raise exception 'Draft picker unavailable' using errcode='42501';end if;
 select jsonb_build_object('items',coalesce(jsonb_agg(node order by id) filter(where rn<=24),'[]'::jsonb),
  'hasMore',count(*)>24 and p_page<100) into result
 from (select id,node,row_number() over(order by id) rn from
   (select id,node from newsroom_private.assigned_approved_media order by id limit 25 offset p_page*24) page) numbered;
 return result;
end;
$fn$;
revoke all on function public.staff_list_assigned_approved_media(uuid,boolean,integer) from public,anon,authenticated;
grant execute on function public.staff_list_assigned_approved_media(uuid,boolean,integer) to authenticated;

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
  if not newsroom_private.assigned_inline_media_allowed(old.id,old.body,new.body) then
   raise exception 'Inline media not eligible; remove or reselect it' using errcode='22023';end if;
  return new;
end;
$fn$;
create or replace function newsroom_private.guard_assigned_revision_copy()
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
      or row(new.short_title,new.language,new.access_level,new.author_id,new.editor_id,
        new.primary_category_id,new.island,new.featured_image_id,new.image_caption,new.image_credit,
        new.seo_title,new.seo_description,new.slug,new.originally_published_at,new.scheduled_at)
      is distinct from row(s.short_title,s.language,s.access_level,s.author_id,s.editor_id,
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
create or replace function public.staff_save_assigned_revision(p_story uuid,p_live_updated_at timestamptz,
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
    short_title,language,access_level,author_id,editor_id,primary_category_id,category_ids,tag_ids,
    island,featured_image_id,image_caption,image_credit,seo_title,seo_description,slug,
    originally_published_at,scheduled_at,created_by,updated_by)
   values(s.id,btrim(p_headline),p_subheadline,p_summary,p_body,v_status,
    s.short_title,s.language,s.access_level,s.author_id,s.editor_id,s.primary_category_id,
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

-- Same narrow copy contract even when the caller also has edit_all. The
-- legacy full editor retains its separate authority; the assigned editor
-- always uses an exact draft, verified actor, CAS and canonical media guard.
create function public.staff_save_assigned_draft_with_media(p_story uuid,p_updated_at timestamptz,
 p_action text,p_headline text,p_subheadline text,p_summary text,p_body jsonb)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
declare s public.stories%rowtype;
begin
 if not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('story.view_assigned',p_story)
 or not newsroom_private.has_staff_permission('story.edit_assigned',p_story) then
   raise exception 'Assigned draft unavailable' using errcode='42501';end if;
 if p_action is null or p_action not in ('save','submit') or p_updated_at is null
 or p_headline is null or length(btrim(p_headline)) not between 1 and 300
 or length(coalesce(p_subheadline,''))>600 or length(coalesce(p_summary,''))>3000
 or not newsroom_private.valid_assigned_body(p_body) then
   raise exception 'Invalid copy' using errcode='22023';end if;
 if p_action='submit' and not newsroom_private.has_staff_permission('story.submit_review',p_story) then
   raise exception 'Review submission denied' using errcode='42501';end if;
 select * into s from public.stories where id=p_story and status='draft' for update;
 if not found or s.updated_at is distinct from p_updated_at then
   raise exception 'Draft changed' using errcode='40001';end if;
 if not newsroom_private.assigned_inline_media_allowed(p_story,s.body,p_body) then
   raise exception 'Inline media not eligible; remove or reselect it' using errcode='22023';end if;
 update public.stories set headline=btrim(p_headline),subheadline=p_subheadline,summary=p_summary,
   body=p_body,updated_by=(select auth.uid()),
   status=case when p_action='submit' then 'in_review'::public.story_status else 'draft'::public.story_status end
 where id=p_story and status='draft' and updated_at=p_updated_at returning * into s;
 if not found then raise exception 'Draft changed' using errcode='40001';end if;
 return jsonb_build_object('id',s.id,'headline',s.headline,'subheadline',s.subheadline,'summary',s.summary,
   'body',s.body,'language',s.language,'status',s.status,'updated_at',s.updated_at);
end;
$fn$;
revoke all on function public.staff_save_assigned_draft_with_media(uuid,timestamptz,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.staff_save_assigned_draft_with_media(uuid,timestamptz,text,text,text,text,jsonb) to authenticated;

commit;
