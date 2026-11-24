-- CT-05b.2 STAGED ONLY. CLI filename #45441637332.
begin;

-- Defense in depth for direct authenticated REST/RPC calls: the application
-- parser is stricter about attributes, but malformed node arrays and executable
-- link URLs must also be denied at the database boundary.
create function newsroom_private.valid_assigned_body(p_body jsonb)
returns boolean language plpgsql immutable security invoker set search_path=''
as $fn$
declare n jsonb; m jsonb; v_depth integer; v_count integer:=0; v_type text; v_href text;
begin
 if p_body is null or jsonb_typeof(p_body)<>'object' or p_body->>'type' is distinct from 'doc'
   or octet_length(p_body::text)>524288 then return false;end if;
 for n,v_depth in
   with recursive walk(node,depth) as (
     select p_body,0
     union all
     select child,walk.depth+1 from walk
     cross join lateral jsonb_array_elements(case when jsonb_typeof(walk.node->'content')='array'
       then walk.node->'content' else '[]'::jsonb end) child
     where walk.depth<=40
   ) select node,depth from walk
 loop
   v_count:=v_count+1;
   v_type:=n->>'type';
   if v_count>12000 or v_depth>40 or jsonb_typeof(n)<>'object'
     or jsonb_typeof(n->'type') is distinct from 'string'
     or v_type not in ('doc','paragraph','heading','text','bulletList','orderedList','listItem','blockquote','codeBlock','horizontalRule','hardBreak','image')
     or (v_depth>0 and v_type='doc')
     or (n?'content' and jsonb_typeof(n->'content')<>'array')
     or (n?'attrs' and jsonb_typeof(n->'attrs')<>'object')
     or exists(select 1 from jsonb_object_keys(n) k where k not in ('type','attrs','content','marks','text'))
     or (v_type='text' and (jsonb_typeof(n->'text') is distinct from 'string' or n?'content'))
     or (v_type<>'text' and n?'text')
     or (v_type='image' and (n?'content' or n?'marks')) then return false;end if;
   if n?'marks' then
     if v_type<>'text' or jsonb_typeof(n->'marks')<>'array' then return false;end if;
     if jsonb_array_length(n->'marks')>12 then return false;end if;
     for m in select value from jsonb_array_elements(n->'marks') loop
       if jsonb_typeof(m)<>'object' or jsonb_typeof(m->'type') is distinct from 'string'
         or m->>'type' not in ('bold','italic','strike','underline','code','link','textStyle','highlight','subscript','superscript')
         or (m?'attrs' and jsonb_typeof(m->'attrs')<>'object')
         or exists(select 1 from jsonb_object_keys(m) k where k not in ('type','attrs')) then return false;end if;
       if m->>'type'='link' then
         v_href:=m->'attrs'->>'href';
         if jsonb_typeof(m->'attrs'->'href') is distinct from 'string' or length(v_href)>2048
           or v_href~'[[:cntrl:][:space:]]' or position(chr(92) in v_href)>0
           or v_href!~*'^(https?://|mailto:|tel:|/([^/]|$)|#)' then return false;end if;
       end if;
     end loop;
   end if;
 end loop;
 return true;
end;
$fn$;
revoke all on function newsroom_private.valid_assigned_body(jsonb) from public,anon,authenticated;
grant execute on function newsroom_private.valid_assigned_body(jsonb) to authenticated;
create function newsroom_private.guard_assigned_body_shape()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
declare sid uuid;
begin
 if current_user<>'authenticated' then return new;end if;
 if tg_table_name='stories' then sid:=new.id;else sid:=new.story_id;end if;
 if not newsroom_private.has_staff_permission('story.edit_all',sid)
   and not newsroom_private.valid_assigned_body(new.body) then
   raise exception 'Invalid assigned rich text' using errcode='22023';end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_assigned_body_shape() from public,anon,authenticated;
create trigger ct05b_assigned_body_shape_guard before update on public.stories
for each row execute function newsroom_private.guard_assigned_body_shape();
create trigger ct05b_assigned_revision_body_shape_guard before insert or update on public.story_revisions
for each row execute function newsroom_private.guard_assigned_body_shape();

create function newsroom_private.can_edit_assigned_revision(p_story uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select newsroom_private.has_staff_permission('newsroom.access')
 and newsroom_private.has_staff_permission('story.view_assigned',p_story)
 and newsroom_private.has_staff_permission('story.edit_assigned',p_story)
 and newsroom_private.has_staff_permission('revision.view',p_story)
 and newsroom_private.has_staff_permission('revision.edit_assigned',p_story)
$fn$;
revoke all on function newsroom_private.can_edit_assigned_revision(uuid) from public,anon,authenticated;
grant execute on function newsroom_private.can_edit_assigned_revision(uuid) to authenticated;

-- Independently protect direct REST inserts/updates. Preserve the exact
-- existing metadata on updates; on creation derive it from the live row.
create function newsroom_private.guard_assigned_revision_copy()
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
 if exists(select 1 from jsonb_path_query(new.body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n(node)
   where not exists(select 1 from jsonb_path_query(v_body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) o(node)
   where jsonb_strip_nulls(n.node)=jsonb_strip_nulls(o.node))) then
   raise exception 'New inline media requires editorial review' using errcode='42501'; end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.guard_assigned_revision_copy() from public,anon,authenticated;
create trigger ct05b_assigned_revision_copy_guard before insert or update on public.story_revisions
for each row execute function newsroom_private.guard_assigned_revision_copy();

-- Narrow read projection, no staff directory or protected metadata in reply.
create function public.staff_read_assigned_revision(p_story uuid)
returns jsonb language plpgsql stable security invoker set search_path=''
as $fn$
declare s public.stories%rowtype; r public.story_revisions%rowtype;
begin
 if not newsroom_private.can_edit_assigned_revision(p_story) then
   raise exception 'Revision unavailable' using errcode='42501'; end if;
 select * into s from public.stories where id=p_story and status='published';
 if not found then raise exception 'Published source missing' using errcode='P0002'; end if;
 select * into r from public.story_revisions where story_id=p_story;
 if found and r.status not in ('draft','in_review') then
   raise exception 'Revision unavailable' using errcode='40001'; end if;
 return jsonb_build_object('id',s.id,'language',case when r.id is null then s.language else r.language end,
  'headline',case when r.id is null then s.headline else r.headline end,
  'subheadline',case when r.id is null then s.subheadline else r.subheadline end,
  'summary',case when r.id is null then s.summary else r.summary end,
  'body',case when r.id is null then s.body else r.body end,
  'status',case when r.id is null then 'draft' else r.status::text end,
  'updatedAt',coalesce(r.updated_at,s.updated_at),'liveUpdatedAt',s.updated_at,'revisionId',r.id,
  'canSubmit',(r.id is null or r.status='draft') and newsroom_private.has_staff_permission('story.submit_review',p_story));
end;
$fn$;

create function public.staff_save_assigned_revision(p_story uuid,p_live_updated_at timestamptz,
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
 if exists(select 1 from jsonb_path_query(p_body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n(node)
   where not exists(select 1 from jsonb_path_query(coalesce(r.body,s.body),'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) o(node)
     where jsonb_strip_nulls(n.node)=jsonb_strip_nulls(o.node))) then
   raise exception 'New inline media requires editorial review' using errcode='42501';end if;
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
revoke all on function public.staff_read_assigned_revision(uuid),
 public.staff_save_assigned_revision(uuid,timestamptz,uuid,timestamptz,text,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.staff_read_assigned_revision(uuid),
 public.staff_save_assigned_revision(uuid,timestamptz,uuid,timestamptz,text,text,text,text,jsonb) to authenticated;
commit;
