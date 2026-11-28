-- CT16 R3c linked translation drafts: independent review, provider-neutral.
-- Candidate only, applied on disposable PostgreSQL after candidate 45 passes.
begin;
create table newsroom_private.story_translation_links(
 source_id uuid primary key references public.stories(id) on delete restrict,
 target_id uuid unique not null references public.stories(id) on delete restrict,
 source_language public.story_language not null,
 target_language public.story_language not null,
 draft_fingerprint text not null check(draft_fingerprint~'^[a-f0-9]{64}$'),
 published_fingerprint text check(published_fingerprint~'^[a-f0-9]{64}$'),
 revision integer not null default 1 check(revision>0),
 created_by uuid not null,
 created_at timestamptz not null default clock_timestamp(),
 check(source_id<>target_id and source_language<>target_language)
);
create table newsroom_private.story_translation_events(
 request_id uuid primary key,
 source_id uuid not null references newsroom_private.story_translation_links(source_id) on delete restrict,
 actor uuid not null, action text not null check(action in ('create','refresh')),
 source_fingerprint text not null check(source_fingerprint~'^[a-f0-9]{64}$'),
 revision integer not null,
 reason text not null check(length(btrim(reason)) between 12 and 500),
 command_hash text not null,
 created_at timestamptz not null default clock_timestamp(),
 unique(source_id,revision)
);
alter table newsroom_private.story_translation_links enable row level security;
alter table newsroom_private.story_translation_events enable row level security;
revoke all on newsroom_private.story_translation_links,newsroom_private.story_translation_events from public,anon,authenticated,service_role;

-- Stable content hash: editing an unpublished revision of a live original
-- does not invalidate its published counterpart until the revision publishes.
create function newsroom_private.translation_source_fingerprint(p_story uuid)
returns text language sql stable security invoker set search_path='' set timezone='UTC' as $fn$
 select encode(sha256(convert_to(jsonb_build_array(
  jsonb_build_array(s.id,s.slug,s.headline,s.short_title,s.subheadline,s.summary,s.body,s.language,s.story_type,s.access_level,s.author_id,s.editor_id,s.primary_category_id,s.island,s.featured_image_id,s.image_caption,s.image_credit,s.seo_title,s.seo_description),
  (select coalesce(jsonb_agg(c.category_id order by c.category_id),'[]'::jsonb) from public.story_categories c where c.story_id=s.id),
  (select coalesce(jsonb_agg(t.tag_id order by t.tag_id),'[]'::jsonb) from public.story_tags t where t.story_id=s.id)
 )::text,'UTF8')),'hex') from public.stories s where s.id=p_story
$fn$;
create function newsroom_private.translation_editor_allowed(p_story uuid)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select coalesce(public.staff_invite_verified_identity(auth.uid()),false)
 and newsroom_private.publication_actor_permission(auth.uid(),'newsroom.access')
 and newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',p_story)
 and newsroom_private.publication_actor_permission(auth.uid(),'story.edit_all',p_story)
$fn$;
create function newsroom_private.read_story_translation(p_story uuid)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype; t public.stories%rowtype; r public.story_revisions%rowtype; current_hash text;
begin
 if not newsroom_private.translation_editor_allowed(p_story) then raise exception 'Translation unavailable' using errcode='42501';end if;
 select * into s from public.stories where id=p_story;
 if not found then raise exception 'Story unavailable' using errcode='42501';end if;
 select * into l from newsroom_private.story_translation_links where source_id=p_story or target_id=p_story;
 if not found then
  return jsonb_build_object('linked',false,'sourceId',s.id,'sourceLanguage',s.language,'sourceFingerprint',newsroom_private.translation_source_fingerprint(s.id),'canCreate',s.status in ('draft','published') and s.access_level in ('public','registered') and newsroom_private.publication_actor_permission(auth.uid(),'story.create'));
 end if;
 if not newsroom_private.translation_editor_allowed(l.source_id) or not newsroom_private.translation_editor_allowed(l.target_id) then raise exception 'Translation unavailable' using errcode='42501';end if;
 select * into s from public.stories where id=l.source_id;
 select * into t from public.stories where id=l.target_id;
 select * into r from public.story_revisions where story_id=l.target_id;
 current_hash:=newsroom_private.translation_source_fingerprint(l.source_id);
 return jsonb_build_object('linked',true,'sourceId',s.id,'sourceLanguage',s.language,'sourceHeadline',s.headline,'sourceFingerprint',current_hash,'targetId',t.id,'targetLanguage',t.language,'targetHeadline',t.headline,'targetStatus',t.status,'revision',l.revision,
 'draftStale',current_hash is distinct from l.draft_fingerprint,'publishedStale',l.published_fingerprint is not null and current_hash is distinct from l.published_fingerprint,
 'canRefresh',coalesce(s.status in ('draft','published') and (t.status='draft' or (t.status='published' and r.status='draft' and newsroom_private.publication_actor_permission(auth.uid(),'revision.view',t.id) and newsroom_private.publication_actor_permission(auth.uid(),'revision.publish',t.id))),false),
 'targetUpdatedAt',case when t.status='published' then r.updated_at else t.updated_at end);
end;$fn$;
create function newsroom_private.create_story_translation(p_source uuid,p_expected text,p_headline text,p_request uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); s public.stories%rowtype; target uuid; lang public.story_language; prior newsroom_private.story_translation_events%rowtype; cmd_hash text;
begin
 if p_source is null or p_request is null or p_expected is null or p_expected!~'^[a-f0-9]{64}$' or p_headline is null or length(btrim(p_headline)) not between 1 and 300 or p_headline~'[[:cntrl:]]' or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid translation request' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 if not newsroom_private.translation_editor_allowed(p_source) or not newsroom_private.publication_actor_permission(actor,'story.create') then raise exception 'Translation creation denied' using errcode='42501';end if;
 cmd_hash:=encode(sha256(convert_to(jsonb_build_array('create',p_source,p_expected,btrim(p_headline),btrim(p_reason))::text,'UTF8')),'hex');
 select * into prior from newsroom_private.story_translation_events where request_id=p_request;
 if found then
  if prior.actor is distinct from actor or prior.source_id is distinct from p_source or prior.command_hash is distinct from cmd_hash then raise exception 'Request conflict' using errcode='40001';end if;
  return newsroom_private.read_story_translation(p_source);
 end if;
 select * into s from public.stories where id=p_source for update;
 if not found or s.status not in ('draft','published') or s.access_level not in ('public','registered') then raise exception 'Source unavailable' using errcode='42501';end if;
 if newsroom_private.translation_source_fingerprint(p_source) is distinct from p_expected then raise exception 'Source changed' using errcode='40001';end if;
 if exists(select 1 from newsroom_private.story_translation_links where source_id=p_source or target_id=p_source) then raise exception 'Story already linked' using errcode='40001';end if;
 lang:=case when s.language='en' then 'es'::public.story_language else 'en'::public.story_language end;
 -- A manual starting draft is deliberately blank, not a fake translation.
 -- Copy classification and rights metadata, preserve original attribution.
 target:=gen_random_uuid();
 insert into public.stories(id,slug,headline,body,language,status,access_level,story_type,author_id,editor_id,primary_category_id,island,featured_image_id,image_credit,created_by,updated_by)
 values(target,'translation-'||target::text,btrim(p_headline),'{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,lang,'draft',s.access_level,s.story_type,s.author_id,s.editor_id,s.primary_category_id,s.island,s.featured_image_id,s.image_credit,actor,actor);
 insert into public.story_categories(story_id,category_id) select target,category_id from public.story_categories where story_id=p_source;
 insert into public.story_tags(story_id,tag_id) select target,tag_id from public.story_tags where story_id=p_source;
 insert into newsroom_private.story_translation_links(source_id,target_id,source_language,target_language,draft_fingerprint,created_by) values(p_source,target,s.language,lang,p_expected,actor);
 insert into newsroom_private.story_translation_events(request_id,source_id,actor,action,source_fingerprint,revision,reason,command_hash) values(p_request,p_source,actor,'create',p_expected,1,btrim(p_reason),cmd_hash);
 return newsroom_private.read_story_translation(p_source);
end;$fn$;
create function newsroom_private.refresh_story_translation(p_source uuid,p_expected text,p_revision integer,p_target_updated timestamptz,p_request uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype; t public.stories%rowtype; r public.story_revisions%rowtype; prior newsroom_private.story_translation_events%rowtype; cmd_hash text;
begin
 if p_source is null or p_request is null or p_expected is null or p_expected!~'^[a-f0-9]{64}$' or p_revision is null or p_revision<1 or p_revision>=2147483647 or p_target_updated is null or not isfinite(p_target_updated) or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid translation refresh' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into l from newsroom_private.story_translation_links where source_id=p_source for update;
 if not found or not newsroom_private.translation_editor_allowed(l.source_id) or not newsroom_private.translation_editor_allowed(l.target_id) then raise exception 'Translation unavailable' using errcode='42501';end if;
 cmd_hash:=encode(sha256(convert_to(jsonb_build_array('refresh',p_source,p_expected,p_revision,p_target_updated,btrim(p_reason))::text,'UTF8')),'hex');
 select * into prior from newsroom_private.story_translation_events where request_id=p_request;
 if found then
  if prior.actor is distinct from actor or prior.source_id is distinct from p_source or prior.command_hash is distinct from cmd_hash then raise exception 'Request conflict' using errcode='40001';end if;
  return newsroom_private.read_story_translation(p_source);
 end if;
 if l.revision<>p_revision or l.draft_fingerprint=p_expected then raise exception 'Translation version changed or already current' using errcode='40001';end if;
 select * into s from public.stories where id=p_source for update;
 select * into t from public.stories where id=l.target_id for update;
 if s.status not in ('draft','published') or newsroom_private.translation_source_fingerprint(p_source) is distinct from p_expected then raise exception 'Source changed' using errcode='40001';end if;
 if t.status='draft' and t.updated_at=p_target_updated then
  update public.stories set updated_at=clock_timestamp(),updated_by=actor where id=t.id;
 elsif t.status='published' and newsroom_private.publication_actor_permission(actor,'revision.view',t.id) and newsroom_private.publication_actor_permission(actor,'revision.publish',t.id) then
  select * into r from public.story_revisions where story_id=t.id for update;
  if not found or r.status<>'draft' or r.updated_at is distinct from p_target_updated then raise exception 'Save an editable revision first' using errcode='40001';end if;
  update public.story_revisions set updated_at=clock_timestamp(),updated_by=actor where id=r.id;
 else raise exception 'Save an editable translation draft first' using errcode='40001';end if;
 -- Content is untouched. Updating the target row invalidates review epochs.
 update newsroom_private.story_translation_links set draft_fingerprint=p_expected,revision=revision+1 where source_id=p_source;
 insert into newsroom_private.story_translation_events(request_id,source_id,actor,action,source_fingerprint,revision,reason,command_hash) values(p_request,p_source,actor,'refresh',p_expected,p_revision+1,btrim(p_reason),cmd_hash);
 return newsroom_private.read_story_translation(p_source);
end;$fn$;
-- Translation targets never use the independent-review exemption.
create or replace function newsroom_private.may_self_publish(p_story uuid,p_kind text)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select newsroom_private.editorial_own_privilege(auth.uid(),'story.publish_own_without_review')
 and newsroom_private.publication_actor_permission(auth.uid(),'story.publish',p_story)
 and newsroom_private.publication_actor_permission(auth.uid(),'story.edit_all',p_story)
 and newsroom_private.publication_actor_permission(auth.uid(),'story.view_all',p_story)
 and exists(select 1 from public.stories s where s.id=p_story and s.author_id=auth.uid() and s.created_by=auth.uid()
 and ((p_kind='draft' and s.status='draft') or (p_kind='revision' and s.status='published' and newsroom_private.publication_actor_permission(auth.uid(),'revision.view',p_story) and newsroom_private.publication_actor_permission(auth.uid(),'revision.publish',p_story)
 and exists(select 1 from public.story_revisions r where r.story_id=s.id and r.status='draft' and r.author_id=auth.uid() and r.created_by=auth.uid()))))
 and not exists(select 1 from newsroom_private.story_translation_links l where l.target_id=p_story)
 and not exists(select 1 from newsroom_private.reviewed_publication_schedules q where q.story_id=p_story and q.state in ('pending','blocked'))
$fn$;
-- Enforce pair language/access invariants even on direct writes and scheduled
-- publication. A coordinated access-change/unlink workflow is not yet enabled.
create function newsroom_private.guard_story_translation()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype;
begin
 select * into l from newsroom_private.story_translation_links where source_id=old.id or target_id=old.id;
 if not found then return new;end if;
 if new.language is distinct from old.language or new.access_level is distinct from old.access_level then raise exception 'Linked translation language and access must remain matched' using errcode='42501';end if;
 if l.target_id=old.id and new.status='published' then
  if not newsroom_private.publication_permitted(old.id) then raise exception 'Independent reviewed translation publication required' using errcode='42501';end if;
  select * into s from public.stories where id=l.source_id for share;
  if s.status<>'published' or s.language<>l.source_language or new.language<>l.target_language or s.access_level<>new.access_level or newsroom_private.translation_source_fingerprint(l.source_id) is distinct from l.draft_fingerprint then raise exception 'Source must be published and current; refresh translation' using errcode='40001';end if;
  if not coalesce(jsonb_path_exists(new.body,'strict $.** ? (@.type == "text" || @.type == "image")'::jsonpath,silent=>true),false) then raise exception 'Complete the translated article before publishing' using errcode='22023';end if;
  update newsroom_private.story_translation_links set published_fingerprint=draft_fingerprint where source_id=l.source_id;
 end if;
 return new;
end;$fn$;
create trigger ct16_translation_guard before update on public.stories for each row execute function newsroom_private.guard_story_translation();
-- Public metadata only for pairs that are currently public and published.
-- No draft, fingerprint, author/account identifier or review metadata exposed.
create function newsroom_private.public_story_translation_pairs(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare result jsonb;
begin
 if p_ids is null or cardinality(p_ids)>100 or array_position(p_ids,null) is not null then raise exception 'Invalid translation lookup' using errcode='22023';end if;
 with pairs as (
  select l.*,s.slug source_slug,t.slug target_slug,
   l.published_fingerprint is not null and l.published_fingerprint=newsroom_private.translation_source_fingerprint(s.id) as is_current
  from newsroom_private.story_translation_links l join public.stories s on s.id=l.source_id join public.stories t on t.id=l.target_id
  where (l.source_id=any(p_ids) or l.target_id=any(p_ids)) and s.status='published' and t.status='published'
   and s.access_level='public' and t.access_level='public' and s.published_at<=statement_timestamp() and t.published_at<=statement_timestamp()
   and s.language=l.source_language and t.language=l.target_language
   and exists(select 1 from newsroom_private.publication_events e where e.story_id=t.id and e.kind='draft')
 ), items as (
  select source_id story_id,source_id,case when is_current then jsonb_build_object('id',target_id,'slug',target_slug,'language',target_language) else null end counterpart from pairs where source_id=any(p_ids)
  union all select target_id,source_id,case when is_current then jsonb_build_object('id',source_id,'slug',source_slug,'language',source_language) else null end from pairs where target_id=any(p_ids)
 )
 select coalesce(jsonb_agg(jsonb_build_object('storyId',story_id,'sourceId',source_id,'counterpart',counterpart) order by story_id),'[]'::jsonb) into result from items;
 return result;
end;$fn$;
create function public.staff_read_story_translation(p_story uuid) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_story_translation(p_story);
create function public.staff_create_story_translation(p_source uuid,p_expected text,p_headline text,p_request uuid,p_reason text) returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.create_story_translation(p_source,p_expected,p_headline,p_request,p_reason);
create function public.staff_refresh_story_translation(p_source uuid,p_expected text,p_revision integer,p_target_updated timestamptz,p_request uuid,p_reason text) returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.refresh_story_translation(p_source,p_expected,p_revision,p_target_updated,p_request,p_reason);
create function public.public_story_translation_pairs(p_ids uuid[]) returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.public_story_translation_pairs(p_ids);
revoke all on function newsroom_private.translation_source_fingerprint(uuid),newsroom_private.translation_editor_allowed(uuid),newsroom_private.read_story_translation(uuid),newsroom_private.create_story_translation(uuid,text,text,uuid,text),newsroom_private.refresh_story_translation(uuid,text,integer,timestamptz,uuid,text),newsroom_private.guard_story_translation(),newsroom_private.public_story_translation_pairs(uuid[]),public.staff_read_story_translation(uuid),public.staff_create_story_translation(uuid,text,text,uuid,text),public.staff_refresh_story_translation(uuid,text,integer,timestamptz,uuid,text),public.public_story_translation_pairs(uuid[]) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_story_translation(uuid),newsroom_private.create_story_translation(uuid,text,text,uuid,text),newsroom_private.refresh_story_translation(uuid,text,integer,timestamptz,uuid,text),public.staff_read_story_translation(uuid),public.staff_create_story_translation(uuid,text,text,uuid,text),public.staff_refresh_story_translation(uuid,text,integer,timestamptz,uuid,text) to authenticated;
grant execute on function newsroom_private.public_story_translation_pairs(uuid[]),public.public_story_translation_pairs(uuid[]) to anon,authenticated;
commit;
