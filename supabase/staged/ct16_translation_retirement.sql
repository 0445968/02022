-- Candidate 49: permanently retire an archived, discussion-free relationship.
-- Keep link IDs and history; no automatic article changes, no re-linking.
begin;
alter table newsroom_private.story_translation_links add column retired_at timestamptz, add column retired_by uuid,
 add constraint ct16_translation_retired_pair check((retired_at is null)=(retired_by is null));
alter table newsroom_private.story_translation_events drop constraint story_translation_events_action_check;
alter table newsroom_private.story_translation_events add constraint story_translation_events_action_check check(action in ('create','refresh','retire'));
create or replace function newsroom_private.read_story_translation(p_story uuid)
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
 if l.retired_at is not null then
  return jsonb_build_object('linked',false,'sourceId',s.id,'sourceLanguage',s.language,'sourceFingerprint',newsroom_private.translation_source_fingerprint(s.id),'canCreate',false,'retired',true);
 end if;
 select * into s from public.stories where id=l.source_id;
 select * into t from public.stories where id=l.target_id;
 select * into r from public.story_revisions where story_id=l.target_id;
 current_hash:=newsroom_private.translation_source_fingerprint(l.source_id);
 return jsonb_build_object('linked',true,'sourceId',s.id,'sourceLanguage',s.language,'sourceHeadline',s.headline,'sourceFingerprint',current_hash,'targetId',t.id,'targetLanguage',t.language,'targetHeadline',t.headline,'targetStatus',t.status,'revision',l.revision,
 'draftStale',current_hash is distinct from l.draft_fingerprint,'publishedStale',l.published_fingerprint is not null and current_hash is distinct from l.published_fingerprint,
 'canRefresh',coalesce(s.status in ('draft','published') and (t.status='draft' or (t.status='published' and r.status='draft' and newsroom_private.publication_actor_permission(auth.uid(),'revision.view',t.id) and newsroom_private.publication_actor_permission(auth.uid(),'revision.publish',t.id))),false),
 'targetUpdatedAt',case when t.status='published' then r.updated_at else t.updated_at end);
end;$fn$;
create or replace function newsroom_private.refresh_story_translation(p_source uuid,p_expected text,p_revision integer,p_target_updated timestamptz,p_request uuid,p_reason text)
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
 if l.retired_at is not null or l.revision<>p_revision or l.draft_fingerprint=p_expected then raise exception 'Translation version changed or already current' using errcode='40001';end if;
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
create or replace function newsroom_private.guard_story_translation()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype;
begin
 select * into l from newsroom_private.story_translation_links where source_id=old.id or target_id=old.id;
 if not found or l.retired_at is not null then return new;end if;
 if new.language is distinct from old.language or new.access_level is distinct from old.access_level then raise exception 'Linked translation language and access must remain matched' using errcode='42501';end if;
 -- Do not leave an independently readable public translation behind when retiring its source.
 -- The existing reviewed-publication guard still authorizes each archive separately.
 -- Target publication already locks the source FOR SHARE, serializing against source retirement.
 if l.source_id=old.id and old.status='published' and new.status<>'published'
 and exists(select 1 from public.stories t where t.id=l.target_id and t.status='published') then
  raise exception 'Archive the published translation before archiving the original' using errcode='42501';
 end if;
 if l.target_id=old.id and new.status='published' then
  if not newsroom_private.publication_permitted(old.id) then raise exception 'Independent reviewed translation publication required' using errcode='42501';end if;
  select * into s from public.stories where id=l.source_id for share;
  if s.status<>'published' or s.language<>l.source_language or new.language<>l.target_language or s.access_level<>new.access_level or newsroom_private.translation_source_fingerprint(l.source_id) is distinct from l.draft_fingerprint then raise exception 'Source must be published and current; refresh translation' using errcode='40001';end if;
  if not coalesce(jsonb_path_exists(new.body,'strict $.** ? (@.type == "text" || @.type == "image")'::jsonpath,silent=>true),false) then raise exception 'Complete the translated article before publishing' using errcode='22023';end if;
  update newsroom_private.story_translation_links set published_fingerprint=draft_fingerprint where source_id=l.source_id;
 end if;
 return new;
end;$fn$;
create or replace function newsroom_private.public_story_translation_pairs(p_ids uuid[])
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare result jsonb;
begin
 if p_ids is null or cardinality(p_ids)>100 or array_position(p_ids,null) is not null then raise exception 'Invalid translation lookup' using errcode='22023';end if;
 with pairs as (
  select l.*,s.slug source_slug,t.slug target_slug,
   l.published_fingerprint is not null and l.published_fingerprint=newsroom_private.translation_source_fingerprint(s.id) as is_current
  from newsroom_private.story_translation_links l join public.stories s on s.id=l.source_id join public.stories t on t.id=l.target_id
  where l.retired_at is null and (l.source_id=any(p_ids) or l.target_id=any(p_ids)) and s.status='published' and t.status='published'
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

create function newsroom_private.retire_story_translation(p_source uuid,p_expected text,p_revision integer,p_target_updated timestamptz,p_request uuid,p_reason text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype; t public.stories%rowtype; prior newsroom_private.story_translation_events%rowtype; cmd_hash text;
begin
 if p_source is null or p_request is null or p_expected is null or p_expected!~'^[a-f0-9]{64}$' or p_revision is null or p_revision<1 or p_revision>=2147483647 or p_target_updated is null or not isfinite(p_target_updated) or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid retirement command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into l from newsroom_private.story_translation_links where source_id=p_source for update;
 if not found or not newsroom_private.translation_editor_allowed(l.source_id) or not newsroom_private.translation_editor_allowed(l.target_id)
 or not newsroom_private.publication_actor_permission(actor,'story.publish',l.source_id) or not newsroom_private.publication_actor_permission(actor,'story.publish',l.target_id)
 or not newsroom_private.publication_actor_permission(actor,'story.archive_delete',l.source_id) or not newsroom_private.publication_actor_permission(actor,'story.archive_delete',l.target_id) then raise exception 'Retirement unavailable' using errcode='42501';end if;
 cmd_hash:=encode(sha256(convert_to(jsonb_build_array('retire',p_source,p_expected,p_revision,p_target_updated,btrim(p_reason))::text,'UTF8')),'hex');
 select * into prior from newsroom_private.story_translation_events where request_id=p_request;
 if found then
  if prior.actor is distinct from actor or prior.source_id is distinct from p_source or prior.command_hash is distinct from cmd_hash then raise exception 'Request conflict' using errcode='40001';end if;
  return newsroom_private.read_story_translation(p_source);
 end if;
 perform 1 from public.stories where id in (l.source_id,l.target_id) order by id for update;
 select * into s from public.stories where id=l.source_id;
 select * into t from public.stories where id=l.target_id;
 if l.retired_at is not null or l.revision<>p_revision or s.status<>'archived' or t.status<>'archived' or t.updated_at is distinct from p_target_updated or newsroom_private.translation_source_fingerprint(s.id) is distinct from p_expected then raise exception 'Archive both current articles first; reload' using errcode='40001';end if;
 if exists(select 1 from public.story_revisions r where r.story_id in (s.id,t.id))
 or exists(select 1 from newsroom_private.reviewed_publication_schedules q where q.story_id in (s.id,t.id) and q.state in ('pending','blocked'))
 or exists(select 1 from newsroom_private.story_review_requests q join newsroom_private.story_review_epochs e on e.story_id=q.story_id and e.generation=q.generation where q.story_id in (s.id,t.id) and not exists(select 1 from newsroom_private.story_review_decisions d where d.request_id=q.id))
 or exists(select 1 from public.comments c where c.story_id in (s.id,t.id)) then raise exception 'Working copy, pending review, schedule or discussion prevents retirement' using errcode='40001';end if;
 update newsroom_private.story_translation_links set retired_at=clock_timestamp(),retired_by=actor,revision=revision+1 where source_id=p_source;
 insert into newsroom_private.story_translation_events(request_id,source_id,actor,action,source_fingerprint,revision,reason,command_hash) values(p_request,p_source,actor,'retire',p_expected,p_revision+1,btrim(p_reason),cmd_hash);
 return newsroom_private.read_story_translation(p_source);
end;$fn$;
create function public.staff_retire_story_translation(p_source uuid,p_expected text,p_revision integer,p_target_updated timestamptz,p_request uuid,p_reason text) returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.retire_story_translation(p_source,p_expected,p_revision,p_target_updated,p_request,p_reason);
revoke all on function newsroom_private.retire_story_translation(uuid,text,integer,timestamptz,uuid,text),public.staff_retire_story_translation(uuid,text,integer,timestamptz,uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.retire_story_translation(uuid,text,integer,timestamptz,uuid,text),public.staff_retire_story_translation(uuid,text,integer,timestamptz,uuid,text) to authenticated;
commit;
