-- Candidate 51: private, immutable reviewed-copy baselines and versioned terminology.
-- No provider access, no client writes, no cross-story reuse.
begin;
create table newsroom_private.translation_memory_baselines(
 id uuid primary key default gen_random_uuid(),
 source_id uuid not null references newsroom_private.story_translation_links(source_id) on delete restrict,
 target_id uuid not null references public.stories(id) on delete restrict,
 source_fingerprint text not null check(source_fingerprint~'^[a-f0-9]{64}$'),
 target_fingerprint text not null check(target_fingerprint~'^[a-f0-9]{64}$'),
 publication_request_id uuid not null references newsroom_private.publication_events(request_id) on delete restrict,
 link_revision integer not null check(link_revision>0),
 captured_by uuid not null,
 captured_at timestamptz not null default clock_timestamp(),
 source_locale text not null check(source_locale in ('en','es-CO')),
 target_locale text not null check(target_locale in ('en','es-CO')),
 source_copy jsonb not null check(jsonb_typeof(source_copy)='object' and octet_length(source_copy::text)<=524288),
 target_copy jsonb not null check(jsonb_typeof(target_copy)='object' and octet_length(target_copy::text)<=524288),
 check(source_id<>target_id and source_locale<>target_locale),
 unique(source_id,target_id,source_fingerprint,target_fingerprint)
);
-- Alignment must be tied to an exact baseline and separately verified.
-- A future trusted review workflow records alignment only after comparing
-- the source/target saved copies and checking marks and sentence boundaries.
create table newsroom_private.translation_memory_alignments(
 baseline_id uuid not null references newsroom_private.translation_memory_baselines(id) on delete restrict,
 block_id text not null check(block_id~'^[a-zA-Z0-9_-]{1,100}$'),
 source_path jsonb not null check(jsonb_typeof(source_path)='array' and octet_length(source_path::text)<=1024),
 target_path jsonb not null check(jsonb_typeof(target_path)='array' and octet_length(target_path::text)<=1024),
 pairs jsonb not null check(jsonb_typeof(pairs)='array' and jsonb_array_length(pairs) between 1 and 2500 and octet_length(pairs::text)<=524288),
 verified_by uuid not null,
 verified_at timestamptz not null default clock_timestamp(),
 primary key(baseline_id,block_id),
 unique(baseline_id,source_path),unique(baseline_id,target_path)
);
create table newsroom_private.translation_terminology_versions(
 revision integer primary key check(revision>0),
 entries jsonb not null check(jsonb_typeof(entries)='array' and jsonb_array_length(entries)<=500 and octet_length(entries::text)<=131072),
 changed_by uuid not null,
 reason text not null check(length(btrim(reason)) between 12 and 500 and reason!~'[[:cntrl:]]'),
 changed_at timestamptz not null default clock_timestamp()
);
alter table newsroom_private.translation_memory_baselines enable row level security;
alter table newsroom_private.translation_memory_alignments enable row level security;
alter table newsroom_private.translation_terminology_versions enable row level security;
revoke all on newsroom_private.translation_memory_baselines,newsroom_private.translation_memory_alignments,newsroom_private.translation_terminology_versions from public,anon,authenticated,service_role;
-- Capture exact current, independently published pair only. Private invoker,
-- deliberately no grant even to service_role until trusted orchestration exists.
create function newsroom_private.capture_translation_baseline(p_source uuid,p_actor uuid,p_source_hash text,p_target_hash text,p_revision integer)
returns uuid language plpgsql security invoker set search_path='' set timezone='UTC' as $fn$
declare l newsroom_private.story_translation_links%rowtype; s public.stories%rowtype; t public.stories%rowtype; e newsroom_private.publication_events%rowtype; saved uuid; sc jsonb; tc jsonb;
begin
 if p_source is null or p_actor is null or p_source_hash is null or p_source_hash!~'^[a-f0-9]{64}$' or p_target_hash is null or p_target_hash!~'^[a-f0-9]{64}$' or p_revision is null or p_revision<1 then raise exception 'Invalid translation baseline' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into l from newsroom_private.story_translation_links where source_id=p_source for update;
 if not found or not coalesce(public.staff_invite_verified_identity(p_actor),false) or not newsroom_private.publication_actor_permission(p_actor,'newsroom.access')
 or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',l.source_id)
 or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',l.target_id)
 or not newsroom_private.publication_actor_permission(p_actor,'story.review',l.target_id) then raise exception 'Translation baseline unavailable' using errcode='42501';end if;
 perform 1 from public.stories where id in(l.source_id,l.target_id) order by id for update;
 select * into s from public.stories where id=l.source_id;
 select * into t from public.stories where id=l.target_id;
 if l.retired_at is not null or l.revision<>p_revision or s.status<>'published' or t.status<>'published' or s.language<>l.source_language or t.language<>l.target_language or s.access_level<>t.access_level or s.access_level not in('public','registered')
 or l.published_fingerprint is distinct from p_source_hash or newsroom_private.translation_source_fingerprint(s.id) is distinct from p_source_hash or newsroom_private.translation_source_fingerprint(t.id) is distinct from p_target_hash
 then raise exception 'Published pair changed' using errcode='40001';end if;
 select * into e from newsroom_private.publication_events where story_id=t.id order by published_at desc,request_id desc limit 1;
 if not found then raise exception 'Independent publication evidence required' using errcode='42501';end if;
 sc:=jsonb_build_object('headline',s.headline,'shortTitle',s.short_title,'subheadline',s.subheadline,'summary',s.summary,'seoTitle',s.seo_title,'seoDescription',s.seo_description,'imageCaption',s.image_caption,'body',s.body);
 tc:=jsonb_build_object('headline',t.headline,'shortTitle',t.short_title,'subheadline',t.subheadline,'summary',t.summary,'seoTitle',t.seo_title,'seoDescription',t.seo_description,'imageCaption',t.image_caption,'body',t.body);
 select id into saved from newsroom_private.translation_memory_baselines where source_id=s.id and target_id=t.id and source_fingerprint=p_source_hash and target_fingerprint=p_target_hash;
 if found then return saved;end if;
 insert into newsroom_private.translation_memory_baselines(source_id,target_id,source_fingerprint,target_fingerprint,publication_request_id,link_revision,captured_by,source_locale,target_locale,source_copy,target_copy)
 values(s.id,t.id,p_source_hash,p_target_hash,e.request_id,p_revision,p_actor,case when s.language='es' then 'es-CO' else 'en' end,case when t.language='es' then 'es-CO' else 'en' end,sc,tc) returning id into saved;
 return saved;
end;$fn$;
revoke all on function newsroom_private.capture_translation_baseline(uuid,uuid,text,text,integer) from public,anon,authenticated,service_role;
-- Owner-managed glossary versions: safe read/write contract is intentionally
-- private until the authorized settings UI/API is implemented.
create function newsroom_private.append_translation_terminology(p_actor uuid,p_expected integer,p_entries jsonb,p_reason text)
returns integer language plpgsql security invoker set search_path='' as $fn$
declare rev integer; item jsonb; term text; preferred text; k text; seen text[]:='{}'; kind text;
begin
 if p_actor is null or p_expected is null or p_expected<0 or p_expected>=2147483647 or p_entries is null or jsonb_typeof(p_entries)<>'array' or jsonb_array_length(p_entries)>500 or octet_length(p_entries::text)>131072 or p_reason is null or length(btrim(p_reason)) not between 12 and 500 or p_reason~'[[:cntrl:]]' then raise exception 'Invalid terminology settings' using errcode='22023';end if;
 if not coalesce(public.staff_invite_verified_identity(p_actor),false) or not newsroom_private.publication_actor_permission(p_actor,'newsroom.access')
 or not exists(select 1 from public.staff_memberships m join public.staff_member_roles mr on mr.membership_id=m.id join public.staff_role_presets p on p.id=mr.role_preset_id where m.auth_user_id=p_actor and m.status='active' and m.member_type='employee' and m.expires_at is null and mr.expires_at is null and p.role_key='owner')
 then raise exception 'Terminology settings unavailable' using errcode='42501';end if;
 for item in select value from jsonb_array_elements(p_entries) loop
  if jsonb_typeof(item)<>'object' or not(item ?& array['term','preferred','kind','note']) or (select count(*) from jsonb_object_keys(item))<>4 or exists(select 1 from jsonb_each(item) x where jsonb_typeof(x.value)<>'string') then raise exception 'Invalid terminology entry' using errcode='22023';end if;
  term:=item->>'term';preferred:=item->>'preferred';kind:=item->>'kind';k:=lower(btrim(term));
  if length(btrim(term)) not between 1 and 160 or length(btrim(preferred)) not between 1 and 160 or length(item->>'note')>500 or term~'[[:cntrl:]]' or preferred~'[[:cntrl:]]' or (item->>'note')~'[[:cntrl:]]' or kind not in('preferred','protected') or (kind='protected' and preferred<>term) or k=any(seen) then raise exception 'Invalid or duplicate terminology entry' using errcode='22023';end if;
  seen:=array_append(seen,k);
 end loop;
 perform pg_advisory_xact_lock(202611,2351);
 select coalesce(max(revision),0) into rev from newsroom_private.translation_terminology_versions;
 if rev<>p_expected then raise exception 'Terminology revision changed' using errcode='40001';end if;
 insert into newsroom_private.translation_terminology_versions(revision,entries,changed_by,reason) values(rev+1,p_entries,p_actor,btrim(p_reason));
 return rev+1;
end;$fn$;
revoke all on function newsroom_private.append_translation_terminology(uuid,integer,jsonb,text) from public,anon,authenticated,service_role;
-- Explicit owner-only access; private trusted append still has no grants.
create function newsroom_private.read_translation_terminology()
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access')
 or not exists(select 1 from public.staff_memberships m join public.staff_member_roles mr on mr.membership_id=m.id join public.staff_role_presets p on p.id=mr.role_preset_id where m.auth_user_id=actor and m.status='active' and m.member_type='employee' and m.expires_at is null and mr.expires_at is null and p.role_key='owner')
 then raise exception 'Terminology settings unavailable' using errcode='42501';end if;
 select jsonb_build_object('revision',revision,'entries',entries) into result from newsroom_private.translation_terminology_versions order by revision desc limit 1;
 return coalesce(result,jsonb_build_object('revision',0,'entries','[]'::jsonb));
end;$fn$;
create function newsroom_private.save_translation_terminology(p_expected integer,p_entries jsonb,p_reason text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 perform newsroom_private.append_translation_terminology(auth.uid(),p_expected,p_entries,p_reason);
 return newsroom_private.read_translation_terminology();
end;$fn$;
create function public.staff_read_translation_terminology()
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_translation_terminology();
create function public.staff_save_translation_terminology(p_expected integer,p_entries jsonb,p_reason text)
returns jsonb language sql security invoker set search_path='' RETURN newsroom_private.save_translation_terminology(p_expected,p_entries,p_reason);
revoke all on function newsroom_private.read_translation_terminology(),newsroom_private.save_translation_terminology(integer,jsonb,text),public.staff_read_translation_terminology(),public.staff_save_translation_terminology(integer,jsonb,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_translation_terminology(),newsroom_private.save_translation_terminology(integer,jsonb,text),public.staff_read_translation_terminology(),public.staff_save_translation_terminology(integer,jsonb,text) to authenticated;
-- Read-only source for a translation estimate. Never returns target draft or
-- cross-story memory. Scope is exactly the current editor's linked source.
create function newsroom_private.read_translation_preview(p_source uuid,p_expected text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare s public.stories%rowtype; l newsroom_private.story_translation_links%rowtype; fp text;
begin
 if p_source is null or p_expected is null or p_expected!~'^[a-f0-9]{64}$' then raise exception 'Invalid preview' using errcode='22023';end if;
 if not newsroom_private.translation_editor_allowed(p_source) then raise exception 'Translation preview unavailable' using errcode='42501';end if;
 select * into s from public.stories where id=p_source;
 if not found or s.status not in('draft','published') or s.access_level not in('public','registered') then raise exception 'Translation preview unavailable' using errcode='42501';end if;
 select * into l from newsroom_private.story_translation_links where source_id=p_source or target_id=p_source;
 if found then
  if l.source_id<>p_source or l.retired_at is not null or not newsroom_private.translation_editor_allowed(l.target_id) then raise exception 'Translation preview unavailable' using errcode='42501';end if;
 elsif not newsroom_private.publication_actor_permission(auth.uid(),'story.create') then raise exception 'Translation preview unavailable' using errcode='42501';end if;
 fp:=newsroom_private.translation_source_fingerprint(p_source);
 if fp is distinct from p_expected then raise exception 'Saved source changed' using errcode='40001';end if;
 return jsonb_build_object('sourceFingerprint',fp,'sourceLocale',s.language,'copy',jsonb_build_object('headline',s.headline,'shortTitle',s.short_title,'subheadline',s.subheadline,'summary',s.summary,'seoTitle',s.seo_title,'seoDescription',s.seo_description,'imageCaption',s.image_caption,'body',s.body));
end;$fn$;
create function public.staff_read_translation_preview(p_source uuid,p_expected text)
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_translation_preview(p_source,p_expected);
revoke all on function newsroom_private.read_translation_preview(uuid,text),public.staff_read_translation_preview(uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_translation_preview(uuid,text),public.staff_read_translation_preview(uuid,text) to authenticated;
-- Verify exact immutable saved plain text. Marked nodes, nested content,
-- links and code deliberately require manual alignment outside this writer.
create function newsroom_private.translation_alignment_text(p_copy jsonb,p_path jsonb)
returns text language plpgsql immutable security invoker set search_path='' as $fn$
declare n jsonb; idx integer; key text;
begin
 if jsonb_typeof(p_path) is distinct from 'array' then raise exception 'Unsupported alignment path' using errcode='22023';end if;
 if jsonb_array_length(p_path)=1 then
  key:=p_path->>0;
  if key not in('headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption') or jsonb_typeof(p_copy->key) is distinct from 'string' then raise exception 'Unsupported alignment field' using errcode='22023';end if;
  return p_copy->>key;
 end if;
 if jsonb_array_length(p_path)<>5 or p_path->>0 is distinct from 'body' or p_path->>1 is distinct from 'content' or coalesce(p_path->>2,'')!~'^(0|[1-9][0-9]{0,3})$' or p_path->>3 is distinct from 'content' or p_path->>4 is distinct from '0' then raise exception 'Unsupported alignment path' using errcode='22023';end if;
 idx:=(p_path->>2)::integer;n:=p_copy#>array['body','content',idx::text];
 if jsonb_typeof(n) is distinct from 'object' or n->>'type' is distinct from 'paragraph' or (select count(*) from jsonb_object_keys(n))<>2 or jsonb_typeof(n->'content') is distinct from 'array' or jsonb_array_length(n->'content')<>1 then raise exception 'Unsupported alignment paragraph' using errcode='22023';end if;
 n:=n#>'{content,0}';
 if jsonb_typeof(n) is distinct from 'object' or n->>'type' is distinct from 'text' or (select count(*) from jsonb_object_keys(n))<>2 or jsonb_typeof(n->'text') is distinct from 'string' then raise exception 'Unsupported alignment text' using errcode='22023';end if;
 return n->>'text';
end;$fn$;
-- Trusted reviewer writer, not a public RPC. The future orchestrator must
-- independently validate segmentation and present explicit human confirmation.
-- SQL proves exact reconstruction, scope and immutable provenance.
create function newsroom_private.record_translation_alignment(p_baseline uuid,p_actor uuid,p_block text,p_source_path jsonb,p_target_path jsonb,p_pairs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $fn$
declare b newsroom_private.translation_memory_baselines%rowtype; l newsroom_private.story_translation_links%rowtype; old newsroom_private.translation_memory_alignments%rowtype; item jsonb; source_text text; target_text text; source_join text:=''; target_join text:='';
begin
 if p_baseline is null or p_actor is null or p_block is null or p_block!~'^[a-zA-Z0-9_-]{1,100}$' or jsonb_typeof(p_pairs) is distinct from 'array' or jsonb_array_length(p_pairs) not between 1 and 2500 or octet_length(p_pairs::text)>524288 then raise exception 'Invalid alignment' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into b from newsroom_private.translation_memory_baselines where id=p_baseline;
 if not found then raise exception 'Alignment unavailable' using errcode='42501';end if;
 select * into l from newsroom_private.story_translation_links where source_id=b.source_id for update;
 if not found or not coalesce(public.staff_invite_verified_identity(p_actor),false) or not newsroom_private.publication_actor_permission(p_actor,'newsroom.access') or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',b.source_id) or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',b.target_id) or not newsroom_private.publication_actor_permission(p_actor,'story.review',b.target_id) then raise exception 'Alignment unavailable' using errcode='42501';end if;
 perform 1 from public.stories where id in(b.source_id,b.target_id) order by id for update;
 if l.retired_at is not null or l.target_id<>b.target_id or l.revision<>b.link_revision or l.published_fingerprint is distinct from b.source_fingerprint or newsroom_private.translation_source_fingerprint(b.source_id) is distinct from b.source_fingerprint or newsroom_private.translation_source_fingerprint(b.target_id) is distinct from b.target_fingerprint or (select count(*) from public.stories where id in(b.source_id,b.target_id) and status='published')<>2 then raise exception 'Baseline changed' using errcode='40001';end if;
 source_text:=newsroom_private.translation_alignment_text(b.source_copy,p_source_path);
 target_text:=newsroom_private.translation_alignment_text(b.target_copy,p_target_path);
 if length(btrim(source_text))=0 or length(btrim(target_text))=0 then raise exception 'Empty alignment' using errcode='22023';end if;
 for item in select value from jsonb_array_elements(p_pairs) loop
  if jsonb_typeof(item) is distinct from 'object' or not(item ?& array['source','translation','sourceSeparator','targetSeparator','reviewed','manuallyEdited']) or (select count(*) from jsonb_object_keys(item))<>6 or jsonb_typeof(item->'source') is distinct from 'string' or jsonb_typeof(item->'translation') is distinct from 'string' or jsonb_typeof(item->'sourceSeparator') is distinct from 'string' or jsonb_typeof(item->'targetSeparator') is distinct from 'string' or item->'reviewed' is distinct from 'true'::jsonb or jsonb_typeof(item->'manuallyEdited') is distinct from 'boolean' or length(btrim(item->>'source'))=0 or length(btrim(item->>'translation'))=0 or (item->>'sourceSeparator')!~'^[[:space:]]*$' or (item->>'targetSeparator')!~'^[[:space:]]*$' then raise exception 'Invalid reviewed sentence pair' using errcode='22023';end if;
  source_join:=source_join||(item->>'source')||(item->>'sourceSeparator');target_join:=target_join||(item->>'translation')||(item->>'targetSeparator');
 end loop;
 if source_join is distinct from source_text or target_join is distinct from target_text then raise exception 'Alignment does not reproduce saved copy' using errcode='40001';end if;
 select * into old from newsroom_private.translation_memory_alignments where baseline_id=p_baseline and block_id=p_block;
 if found then
  if old.source_path is distinct from p_source_path or old.target_path is distinct from p_target_path or old.pairs is distinct from p_pairs then raise exception 'Alignment already verified' using errcode='40001';end if;
  return false;
 end if;
 insert into newsroom_private.translation_memory_alignments(baseline_id,block_id,source_path,target_path,pairs,verified_by) values(p_baseline,p_block,p_source_path,p_target_path,p_pairs,p_actor);
 return true;
end;$fn$;
revoke all on function newsroom_private.translation_alignment_text(jsonb,jsonb),newsroom_private.record_translation_alignment(uuid,uuid,text,jsonb,jsonb,jsonb) from public,anon,authenticated,service_role;
-- Read-only historical alignment projection for an exact current authorized
-- pair. No target working copy, retired link or mismatched audience is eligible.
-- Until stable block identities exist, restrict body reuse to a sole simple
-- paragraph and fields whose source and target paths are exactly the same.
create function newsroom_private.read_translation_memory_preview(p_source uuid,p_expected text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare p jsonb; l newsroom_private.story_translation_links%rowtype; b newsroom_private.translation_memory_baselines%rowtype; s public.stories%rowtype; t public.stories%rowtype; a newsroom_private.translation_memory_alignments%rowtype; items jsonb:='[]'::jsonb; current_text text; old_source text; old_target text;
begin
 p:=newsroom_private.read_translation_preview(p_source,p_expected);
 select * into l from newsroom_private.story_translation_links where source_id=p_source and retired_at is null;
 if not found then return jsonb_build_object('sourceFingerprint',p_expected,'rows',items);end if;
 select * into s from public.stories where id=l.source_id;
 select * into t from public.stories where id=l.target_id;
 if s.status<>'published' or t.status<>'published' or s.access_level<>t.access_level or s.language<>l.source_language or t.language<>l.target_language or l.published_fingerprint is null
 or exists(select 1 from public.story_revisions where story_id in(l.source_id,l.target_id)) then return jsonb_build_object('sourceFingerprint',p_expected,'rows',items);end if;
 select * into b from newsroom_private.translation_memory_baselines where source_id=l.source_id and target_id=l.target_id and source_fingerprint=l.published_fingerprint and target_fingerprint=newsroom_private.translation_source_fingerprint(t.id) and link_revision=l.revision order by captured_at desc limit 1;
 if not found then return jsonb_build_object('sourceFingerprint',p_expected,'rows',items);end if;
 for a in select * from newsroom_private.translation_memory_alignments where baseline_id=b.id order by block_id limit 100 loop
  if a.source_path is distinct from a.target_path then continue;end if;
  if jsonb_array_length(a.source_path)=5 then
   if a.source_path->>2 is distinct from '0' or jsonb_typeof(b.source_copy#>'{body,content}') is distinct from 'array' or jsonb_typeof(b.target_copy#>'{body,content}') is distinct from 'array' or jsonb_typeof(p#>'{copy,body,content}') is distinct from 'array' then continue;end if;
   if jsonb_array_length(b.source_copy#>'{body,content}')<>1 or jsonb_array_length(b.target_copy#>'{body,content}')<>1 or jsonb_array_length(p#>'{copy,body,content}')<>1 then continue;end if;
  elsif jsonb_array_length(a.source_path)<>1 then continue;end if;
  begin
   current_text:=newsroom_private.translation_alignment_text(p->'copy',a.source_path);
   old_source:=newsroom_private.translation_alignment_text(b.source_copy,a.source_path);
   old_target:=newsroom_private.translation_alignment_text(b.target_copy,a.target_path);
  exception when invalid_parameter_value then continue;end;
  if current_text is null or length(btrim(current_text))=0 then continue;end if;
  items:=items||jsonb_build_array(jsonb_build_object('blockId',a.block_id,'path',a.source_path,'currentSource',current_text,'previousSource',old_source,'previousTarget',old_target,'pairs',a.pairs));
  if octet_length(items::text)>524288 then return jsonb_build_object('sourceFingerprint',p_expected,'rows','[]'::jsonb);end if;
 end loop;
 return jsonb_build_object('sourceFingerprint',p_expected,'rows',items);
end;$fn$;
create function public.staff_read_translation_memory_preview(p_source uuid,p_expected text)
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_translation_memory_preview(p_source,p_expected);
revoke all on function newsroom_private.read_translation_memory_preview(uuid,text),public.staff_read_translation_memory_preview(uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_translation_memory_preview(uuid,text),public.staff_read_translation_memory_preview(uuid,text) to authenticated;
-- Reviewer approval gate: only the independent reviewer who approved the
-- actual latest publication may approve an aligned field for that version.
-- Not yet exposed: future UI must show both saved texts and explicit approval.
create function newsroom_private.approve_translation_alignment(p_source uuid,p_actor uuid,p_source_hash text,p_target_hash text,p_revision integer,p_block text,p_path jsonb,p_pairs jsonb)
returns boolean language plpgsql security invoker set search_path='' as $fn$
declare l newsroom_private.story_translation_links%rowtype; e newsroom_private.publication_events%rowtype; b uuid;
begin
 if p_source is null or p_actor is null or p_source_hash is null or p_target_hash is null or p_revision is null then raise exception 'Invalid alignment approval' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select * into l from newsroom_private.story_translation_links where source_id=p_source for update;
 if not found or l.retired_at is not null or not coalesce(public.staff_invite_verified_identity(p_actor),false) or not newsroom_private.publication_actor_permission(p_actor,'newsroom.access') or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',l.source_id) or not newsroom_private.publication_actor_permission(p_actor,'story.view_all',l.target_id) or not newsroom_private.publication_actor_permission(p_actor,'story.review',l.target_id) then raise exception 'Alignment approval unavailable' using errcode='42501';end if;
 perform 1 from public.stories where id in(l.source_id,l.target_id) order by id for update;
 if exists(select 1 from public.story_revisions where story_id in(l.source_id,l.target_id)) then raise exception 'Working revision prevents alignment approval' using errcode='40001';end if;
 select * into e from newsroom_private.publication_events where story_id=l.target_id order by published_at desc,request_id desc limit 1;
 if not found or not exists(select 1 from newsroom_private.story_review_decisions d where d.request_id=e.request_id and d.decision='approved' and d.decided_by=p_actor) then raise exception 'Independent publication reviewer required' using errcode='42501';end if;
 if jsonb_typeof(p_path) is distinct from 'array' or jsonb_array_length(p_path) not in(1,5) then raise exception 'Invalid alignment path' using errcode='22023';end if;
 b:=newsroom_private.capture_translation_baseline(p_source,p_actor,p_source_hash,p_target_hash,p_revision);
 return newsroom_private.record_translation_alignment(b,p_actor,p_block,p_path,p_path,p_pairs);
end;$fn$;
revoke all on function newsroom_private.approve_translation_alignment(uuid,uuid,text,text,integer,text,jsonb,jsonb) from public,anon,authenticated,service_role;
-- Authenticated reviewer-only read of exact current published candidates.
-- Return only supported matching fields; never expose working revisions.
create function newsroom_private.read_alignment_candidates(p_source uuid,p_expected text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare actor uuid:=auth.uid(); l newsroom_private.story_translation_links%rowtype; e newsroom_private.publication_events%rowtype; s public.stories%rowtype; t public.stories%rowtype; sc jsonb; tc jsonb; p jsonb; k text; a text; b text; rows jsonb:='[]'; tf text; saved uuid; approved boolean;
begin
 if p_source is null or p_expected is null or p_expected!~'^[a-f0-9]{64}$' then raise exception 'Invalid alignment request' using errcode='22023';end if;
 select * into l from newsroom_private.story_translation_links where source_id=p_source;
 if not found or l.retired_at is not null or not coalesce(public.staff_invite_verified_identity(actor),false) or not newsroom_private.publication_actor_permission(actor,'newsroom.access') or not newsroom_private.publication_actor_permission(actor,'story.view_all',l.source_id) or not newsroom_private.publication_actor_permission(actor,'story.view_all',l.target_id) or not newsroom_private.publication_actor_permission(actor,'story.review',l.target_id) then raise exception 'Alignment unavailable' using errcode='42501';end if;
 select * into e from newsroom_private.publication_events where story_id=l.target_id order by published_at desc,request_id desc limit 1;
 if not found or not exists(select 1 from newsroom_private.story_review_decisions d where d.request_id=e.request_id and d.decision='approved' and d.decided_by=actor) then raise exception 'Independent reviewer required' using errcode='42501';end if;
 select * into s from public.stories where id=l.source_id;select * into t from public.stories where id=l.target_id;
 if s.status<>'published' or t.status<>'published' or s.access_level<>t.access_level or s.access_level not in('public','registered') or s.language<>l.source_language or t.language<>l.target_language or l.published_fingerprint is distinct from p_expected or newsroom_private.translation_source_fingerprint(s.id) is distinct from p_expected or exists(select 1 from public.story_revisions where story_id in(s.id,t.id)) then raise exception 'Current quiet published pair required' using errcode='40001';end if;
 tf:=newsroom_private.translation_source_fingerprint(t.id);
 sc:=jsonb_build_object('headline',s.headline,'shortTitle',s.short_title,'subheadline',s.subheadline,'summary',s.summary,'seoTitle',s.seo_title,'seoDescription',s.seo_description,'imageCaption',s.image_caption,'body',s.body);
 tc:=jsonb_build_object('headline',t.headline,'shortTitle',t.short_title,'subheadline',t.subheadline,'summary',t.summary,'seoTitle',t.seo_title,'seoDescription',t.seo_description,'imageCaption',t.image_caption,'body',t.body);
 select id into saved from newsroom_private.translation_memory_baselines where source_id=s.id and target_id=t.id and source_fingerprint=p_expected and target_fingerprint=tf and link_revision=l.revision;
 foreach k in array array['headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption','body'] loop
  if k='body' then
   if jsonb_typeof(sc#>'{body,content}') is distinct from 'array' or jsonb_typeof(tc#>'{body,content}') is distinct from 'array' then continue;end if;
   if jsonb_array_length(sc#>'{body,content}')<>1 or jsonb_array_length(tc#>'{body,content}')<>1 then continue;end if;
   p:='["body","content",0,"content",0]'::jsonb;
  else p:=jsonb_build_array(k);end if;
  begin a:=newsroom_private.translation_alignment_text(sc,p);b:=newsroom_private.translation_alignment_text(tc,p);exception when invalid_parameter_value then continue;end;
  if length(btrim(a))=0 or length(btrim(b))=0 or length(a)>20000 or length(b)>20000 then continue;end if;
  approved:=exists(select 1 from newsroom_private.translation_memory_alignments m where m.baseline_id=saved and m.source_path=p and m.target_path=p);
  rows:=rows||jsonb_build_array(jsonb_build_object('blockId',k,'source',a,'target',b,'approved',approved));
 end loop;
 if octet_length(rows::text)>262144 then raise exception 'Alignment too large' using errcode='22023';end if;
 return jsonb_build_object('sourceId',s.id,'sourceFingerprint',p_expected,'targetFingerprint',tf,'revision',l.revision,'sourceLocale',s.language,'rows',rows);
end;$fn$;
create function newsroom_private.confirm_alignment_candidate(p_source uuid,p_expected text,p_target text,p_revision integer,p_block text,p_pairs jsonb)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare state jsonb; p jsonb;
begin
 if p_block not in('headline','shortTitle','subheadline','summary','seoTitle','seoDescription','imageCaption','body') or p_block is null or jsonb_typeof(p_pairs) is distinct from 'array' then raise exception 'Invalid alignment approval' using errcode='22023';end if;
 -- No provider provenance exists yet: all human-approved copies are protected.
 if exists(select 1 from jsonb_array_elements(p_pairs) v where v->'manuallyEdited' is distinct from 'true'::jsonb) then raise exception 'Manual translation protection required' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 state:=newsroom_private.read_alignment_candidates(p_source,p_expected);
 if state->>'targetFingerprint' is distinct from p_target or (state->>'revision')::integer is distinct from p_revision or not exists(select 1 from jsonb_array_elements(state->'rows') r where r->>'blockId'=p_block) then raise exception 'Alignment candidate changed' using errcode='40001';end if;
 p:=case when p_block='body' then '["body","content",0,"content",0]'::jsonb else jsonb_build_array(p_block) end;
 return newsroom_private.approve_translation_alignment(p_source,auth.uid(),p_expected,p_target,p_revision,p_block,p,p_pairs);
end;$fn$;
create function public.staff_read_alignment_candidates(p_source uuid,p_expected text)
returns jsonb language sql stable security invoker set search_path='' RETURN newsroom_private.read_alignment_candidates(p_source,p_expected);
create function public.staff_confirm_alignment_candidate(p_source uuid,p_expected text,p_target text,p_revision integer,p_block text,p_pairs jsonb)
returns boolean language sql security invoker set search_path='' RETURN newsroom_private.confirm_alignment_candidate(p_source,p_expected,p_target,p_revision,p_block,p_pairs);
revoke all on function newsroom_private.read_alignment_candidates(uuid,text),newsroom_private.confirm_alignment_candidate(uuid,text,text,integer,text,jsonb),public.staff_read_alignment_candidates(uuid,text),public.staff_confirm_alignment_candidate(uuid,text,text,integer,text,jsonb) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_alignment_candidates(uuid,text),newsroom_private.confirm_alignment_candidate(uuid,text,text,integer,text,jsonb),public.staff_read_alignment_candidates(uuid,text),public.staff_confirm_alignment_candidate(uuid,text,text,integer,text,jsonb) to authenticated;
commit;
