-- CT16 R4c candidate: reuse approved public translation pairs for article placements.
-- No changes to stored placements, poll copy, votes, grants or feature gates.
begin;
create or replace function newsroom_private.public_placed_polls(p_language text,p_kind text,p_target text)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=auth.uid(); verified boolean; result jsonb; targets text[]:=array[p_target]; counterpart text;
begin
 if p_language is null or p_language not in ('en','es') or p_kind is null or p_target is null or length(p_target)>120 then raise exception 'Invalid placement' using errcode='22023';end if;
 if not coalesce((select public_enabled from newsroom_private.poll_settings where singleton),false) or not newsroom_private.poll_placement_target_valid(p_kind,p_target) then return jsonb_build_object('enabled',false,'items','[]'::jsonb,'hasMore',false,'verified',false);end if;
 -- Match an explicitly placed article or its current, independently published public counterpart.
 -- Existing exact placements stay unchanged; never inherit through stale, draft, restricted or archived pairs.
 -- Validate before casting the target; reuse the existing safe public relationship projection.
 if p_kind='article' then
  if exists(select 1 from public.stories s where s.id=p_target::uuid and s.language=p_language::public.story_language) then
   select j#>>'{counterpart,id}' into counterpart
   from jsonb_array_elements(newsroom_private.public_story_translation_pairs(array[p_target::uuid])) j
   where j->>'storyId'=p_target;
   if counterpart is not null then targets:=array_append(targets,counterpart);end if;
  end if;
 end if;
 verified:=coalesce(public.staff_invite_verified_identity(actor),false);
 with rows as materialized(select p.* from newsroom_private.polls p join newsroom_private.poll_placement_state s on s.poll_id=p.id
 where (p.language=p_language or newsroom_private.poll_translation_visible(p.id,p_language)) and p.status='published' and p.opens_at<=statement_timestamp()
 and exists(select 1 from jsonb_array_elements(s.published) x where x->>'kind'=p_kind and x->>'target'=any(targets)
 and ((x->>'startsAt') is null or (x->>'startsAt')::timestamptz<=statement_timestamp())
 and ((x->>'endsAt') is null or (x->>'endsAt')::timestamptz>statement_timestamp()))
 order by p.opens_at desc,p.id limit 21),
 numbered as(select r.*,row_number() over(order by opens_at desc,id) rn from rows r)
 select jsonb_build_object('enabled',true,'verified',verified,'hasMore',count(*)>20,'items',coalesce(jsonb_agg(jsonb_build_object('id',p.id,'question',case when p.language=p_language then p.question else tr.published_question end,'options',case when p.language=p_language then p.options else tr.published_options end,'closesAt',p.closes_at,
 'open',p.closed_at is null and p.closes_at>statement_timestamp(),
 'ownChoice',case when verified then (select v.choice from newsroom_private.poll_votes v where v.poll_id=p.id and v.voter_id=actor) else null end,
 'counts',case when p.results_released and (p.closed_at is not null or p.closes_at<=statement_timestamp()) and (select count(*) from newsroom_private.poll_votes v where v.poll_id=p.id)>=5 then newsroom_private.poll_counts(p.id,cardinality(p.options)) else null end) order by p.rn) filter(where p.rn<=20),'[]'::jsonb)) into result from numbered p left join newsroom_private.poll_translations tr on tr.poll_id=p.id and tr.language=p_language;
 return result;
end;$fn$;
create or replace function newsroom_private.guard_story_translation()
returns trigger language plpgsql security definer set search_path='' as $fn$
declare l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype;
begin
 select * into l from newsroom_private.story_translation_links where source_id=old.id or target_id=old.id;
 if not found then return new;end if;
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
commit;
