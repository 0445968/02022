-- Rollback-only translation relationship, review and public projection tests.
\set ON_ERROR_STOP on
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='owner'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='editor';
-- Only synthetic bootstrap fixture, rolled back.
alter table public.staff_role_capabilities disable trigger ct03c_preset_grant_guard;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
 select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['newsroom.access','story.view_all','story.edit_all','story.create','story.submit_review','story.publish','story.review','story.archive_delete','revision.view','revision.publish']) k where p.role_key in ('owner','editor');
alter table public.staff_role_capabilities enable trigger ct03c_preset_grant_guard;
update newsroom_private.editorial_privilege_settings set enabled=true where id;
do $fn$begin
 if has_table_privilege('anon','newsroom_private.story_translation_links','SELECT') or has_table_privilege('authenticated','newsroom_private.story_translation_events','INSERT') or has_function_privilege('anon','public.staff_read_story_translation(uuid)','EXECUTE') then raise exception 'Private translation data exposed';end if;
end;$fn$;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001'; state jsonb; target uuid; f text; rq uuid:='d1600000-0000-4000-8000-000000000021';review jsonb;
begin
 state:=public.staff_read_story_translation(source);f:=state->>'sourceFingerprint';
 if to_regprocedure('public.staff_read_translation_preview(uuid,text)') is not null then
  if public.staff_read_translation_preview(source,f)#>>'{copy,headline}' is distinct from 'Synthetic public story' then raise exception 'Saved source preview incorrect';end if;
  begin perform public.staff_read_translation_preview(source,repeat('0',64));raise exception 'Stale preview accepted';exception when serialization_failure then null;end;
  if has_function_privilege('anon','public.staff_read_translation_preview(uuid,text)','EXECUTE') or has_function_privilege('service_role','public.staff_read_translation_preview(uuid,text)','EXECUTE') then raise exception 'Preview RPC ACL violation';end if;
 end if;
 if state->>'canCreate'<>'true' then raise exception 'Missing creation eligibility';end if;
 begin perform public.staff_create_story_translation(source,repeat('0',64),'Titular',gen_random_uuid(),'Attempt stale translation copy');raise exception 'Stale source accepted';exception when serialization_failure then null;end;
 state:=public.staff_create_story_translation(source,f,'Noticias sintéticas',rq,'Create manually translated article draft');target:=(state->>'targetId')::uuid;
 if state->>'targetLanguage'<>'es' or state->>'targetStatus'<>'draft' or state->>'draftStale'<>'false' or state is distinct from public.staff_create_story_translation(source,f,'Noticias sintéticas',rq,'Create manually translated article draft') then raise exception 'Incorrect or nonidempotent linked draft';end if;
 perform set_config('test.translation_target',target::text,true);
 if (select headline from public.stories where id=source)<>'Synthetic public story' or (select created_by from public.stories where id=target)<>'a1500000-0000-4000-8000-000000000001' or (select language from public.stories where id=target)<>'es' then raise exception 'Source or target attribution incorrect';end if;
 if jsonb_array_length(public.public_story_translation_pairs(array[source,target]))<>0 or public.staff_can_self_publish(target,'draft') then raise exception 'Draft translation exposed or independent review bypassed';end if;
 begin perform public.staff_create_story_translation(source,f,'Duplicate',gen_random_uuid(),'Attempt duplicate language pair');raise exception 'Duplicate translation created';exception when serialization_failure then null;end;
 begin update public.stories set language='en' where id=target;raise exception 'Linked language changed';exception when insufficient_privilege then null;end;
 begin update public.stories set status='published' where id=target;raise exception 'Direct publication accepted';exception when insufficient_privilege then null;end;
 update public.stories set body='{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Contenido traducido."}]}]}'::jsonb,updated_by=auth.uid() where id=target;
 review:=public.staff_read_review(target,'draft');
 perform public.staff_change_review(target,'draft','request',review->>'fingerprint',null,'Submit manually translated article for review',gen_random_uuid());
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$
declare target uuid:=current_setting('test.translation_target')::uuid; review jsonb;
begin
 review:=public.staff_read_review(target,'draft');
 perform public.staff_change_review(target,'draft','approve',review->>'fingerprint',(review->>'requestId')::uuid,'Independently verify translated article',gen_random_uuid());
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare target uuid:=current_setting('test.translation_target')::uuid; review jsonb;
begin
 review:=public.staff_read_review(target,'draft');
 perform public.staff_publish_reviewed_story(target,'draft',(review->>'requestId')::uuid,review->>'fingerprint');
 if (select status from public.stories where id=target)<>'published' then raise exception 'Independent publication failed';end if;
end;$fn$;
reset role;
-- Trusted baseline capture is tested only when the separately staged schema
-- is present. No API role can write a baseline or verified alignment.
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001';target uuid:=current_setting('test.translation_target')::uuid;actor uuid:='a1500000-0000-4000-8000-000000000001';sf text;tf text;rev integer;baseline uuid;
begin
 if to_regprocedure('newsroom_private.capture_translation_baseline(uuid,uuid,text,text,integer)') is not null then
  sf:=newsroom_private.translation_source_fingerprint(source);tf:=newsroom_private.translation_source_fingerprint(target);
  select revision into rev from newsroom_private.story_translation_links where source_id=source;
  baseline:=newsroom_private.capture_translation_baseline(source,actor,sf,tf,rev);
  if baseline is null or baseline is distinct from newsroom_private.capture_translation_baseline(source,actor,sf,tf,rev) or not exists(select 1 from newsroom_private.translation_memory_baselines b where b.id=baseline and b.source_id=source and b.target_id=target and b.source_copy->>'headline'='Synthetic public story' and b.target_copy->>'headline'='Noticias sintéticas') then raise exception 'Incorrect or duplicate memory baseline';end if;
  begin perform newsroom_private.capture_translation_baseline(source,actor,repeat('0',64),tf,rev);raise exception 'Stale baseline accepted';exception when serialization_failure then null;end;
  if to_regprocedure('newsroom_private.record_translation_alignment(uuid,uuid,text,jsonb,jsonb,jsonb)') is not null then
   declare pairs jsonb:='[{"source":"Synthetic public story","translation":"Noticias sintéticas","sourceSeparator":"","targetSeparator":"","reviewed":true,"manuallyEdited":true}]';begin
    if not newsroom_private.record_translation_alignment(baseline,actor,'headline','["headline"]','["headline"]',pairs) then raise exception 'Initial alignment not recorded';end if;
    if newsroom_private.record_translation_alignment(baseline,actor,'headline','["headline"]','["headline"]',pairs) then raise exception 'Alignment replay duplicated';end if;
    if to_regprocedure('public.staff_read_translation_memory_preview(uuid,text)') is not null then
     perform set_config('test.translation_preview_hash',sf,true);
    end if;
    begin perform newsroom_private.record_translation_alignment(baseline,actor,'headline','["headline"]','["headline"]',jsonb_set(pairs,'{0,translation}','"Incorrect"'));raise exception 'Mismatched alignment accepted';exception when serialization_failure then null;end;
    begin perform newsroom_private.record_translation_alignment(baseline,actor,'headline','["body","content",0,"marks",0]','["headline"]',pairs);raise exception 'Unsupported path accepted';exception when invalid_parameter_value then null;end;
   end;
  end if;
 end if;
end;$fn$;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$declare result jsonb; fp text;begin
 if to_regprocedure('public.staff_read_translation_memory_preview(uuid,text)') is not null then
  fp:=current_setting('test.translation_preview_hash');
  result:=public.staff_read_translation_memory_preview('b1500000-0000-4000-8000-000000000001',fp);
  if result->>'sourceFingerprint' is distinct from fp or jsonb_array_length(result->'rows')<>0 then raise exception 'Working revision must block memory preview';end if;
  begin perform public.staff_read_translation_memory_preview('b1500000-0000-4000-8000-000000000001',repeat('0',64));raise exception 'Stale memory preview accepted';exception when serialization_failure then null;end;
  if has_function_privilege('anon','public.staff_read_translation_memory_preview(uuid,text)','EXECUTE') or has_function_privilege('service_role','public.staff_read_translation_memory_preview(uuid,text)','EXECUTE') then raise exception 'Memory preview ACL violation';end if;
 end if;
end;$fn$;
reset role;
-- The historical fixture deliberately has an unpublished source revision.
-- Temporarily remove it in a rollback-only subtransaction to prove the
-- positive memory case without destroying the later retirement-denial fixture.
do $fn$declare result jsonb; fp text;begin
 if to_regprocedure('public.staff_read_translation_memory_preview(uuid,text)') is not null then
  fp:=current_setting('test.translation_preview_hash');
  begin
   delete from public.story_revisions where story_id='b1500000-0000-4000-8000-000000000001';
   result:=public.staff_read_translation_memory_preview('b1500000-0000-4000-8000-000000000001',fp);
   if result->>'sourceFingerprint' is distinct from fp or jsonb_array_length(result->'rows')<>1 or result#>>'{rows,0,currentSource}' is distinct from 'Synthetic public story' or result#>>'{rows,0,previousTarget}' is distinct from 'Noticias sintéticas' then raise exception 'Verified quiet-pair memory preview incorrect';end if;
   if to_regprocedure('newsroom_private.approve_translation_alignment(uuid,uuid,text,text,integer,text,jsonb,jsonb)') is not null then
    declare source uuid:='b1500000-0000-4000-8000-000000000001';target uuid:=current_setting('test.translation_target')::uuid;tf text;rev integer;pairs jsonb:='[{"source":"Synthetic public story","translation":"Noticias sintéticas","sourceSeparator":"","targetSeparator":"","reviewed":true,"manuallyEdited":true}]';begin
     tf:=newsroom_private.translation_source_fingerprint(target);select revision into rev from newsroom_private.story_translation_links where source_id=source;
     begin perform newsroom_private.approve_translation_alignment(source,'a1500000-0000-4000-8000-000000000001',fp,tf,rev,'headline','["headline"]',pairs);raise exception 'Non-reviewer approval accepted';exception when insufficient_privilege then null;end;
     if newsroom_private.approve_translation_alignment(source,'a1500000-0000-4000-8000-000000000002',fp,tf,rev,'headline','["headline"]',pairs) then raise exception 'Exact reviewer replay created duplicate';end if;
     if has_function_privilege('authenticated','newsroom_private.approve_translation_alignment(uuid,uuid,text,text,integer,text,jsonb,jsonb)','EXECUTE') then raise exception 'Approval writer exposed';end if;
    end;
   end if;
   raise exception 'Restore synthetic working revision' using errcode='P4321';
  exception when sqlstate 'P4321' then null;end;
  if not exists(select 1 from public.story_revisions where story_id='b1500000-0000-4000-8000-000000000001') then raise exception 'Original working fixture lost';end if;
 end if;
end;$fn$;
set local request.jwt.claim.sub='';
set local role anon;
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001'; target uuid:=current_setting('test.translation_target')::uuid; result jsonb;
begin
 result:=public.public_story_translation_pairs(array[source,target]);
 if jsonb_array_length(result)<>2 or not exists(select 1 from jsonb_array_elements(result) x where x->>'storyId'=target::text and x->>'sourceId'=source::text and x#>>'{counterpart,id}'=source::text) then raise exception 'Published pair or shared discussion missing';end if;
 if result::text like '%Fingerprint%' then raise exception 'Private fingerprint leak';end if;
end;$fn$;
reset role;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000002';state jsonb; target uuid; previous text;
begin
 state:=public.staff_read_story_translation(source);
 state:=public.staff_create_story_translation(source,state->>'sourceFingerprint','Borrador traducido',gen_random_uuid(),'Create linked unpublished source translation');
 target:=(state->>'targetId')::uuid;previous:=state->>'sourceFingerprint';
 update public.stories set headline='Changed synthetic source',updated_by=auth.uid() where id=source;
 state:=public.staff_read_story_translation(source);
 if state->>'draftStale'<>'true' or state->>'sourceFingerprint'=previous or state->>'canRefresh'<>'true' then raise exception 'Stale source not detected';end if;
 state:=public.staff_refresh_story_translation(source,state->>'sourceFingerprint',(state->>'revision')::integer,(state->>'targetUpdatedAt')::timestamptz,gen_random_uuid(),'Confirm manual draft matches changed source');
 if state->>'draftStale'<>'false' or state->>'revision'<>'2' or (select headline from public.stories where id=target)<>'Borrador traducido' then raise exception 'Refresh failed or overwrote translated copy';end if;
 if jsonb_array_length(public.public_story_translation_pairs(array[source,target]))<>0 then raise exception 'Unpublished pair leaked';end if;
 if state->>'canChangeAccess' is distinct from 'true' then raise exception 'Quiet draft pair access eligibility missing';end if;
 begin update public.stories set access_level='registered',updated_by=auth.uid() where id=source;raise exception 'Direct access change accepted';exception when insufficient_privilege then null;end;
 declare before_state jsonb:=state; command_id uuid:=gen_random_uuid(); changed jsonb;
 begin
  changed:=public.staff_change_translation_access(source,before_state->>'sourceFingerprint',(before_state->>'revision')::integer,(before_state->>'targetUpdatedAt')::timestamptz,'registered',command_id,'Restrict both unpublished synthetic articles');
  if changed->>'accessLevel' is distinct from 'registered' or changed->>'draftStale' is distinct from 'true' or changed is distinct from public.staff_change_translation_access(source,before_state->>'sourceFingerprint',(before_state->>'revision')::integer,(before_state->>'targetUpdatedAt')::timestamptz,'registered',command_id,'Restrict both unpublished synthetic articles') then raise exception 'Paired audience update or replay incorrect';end if;
  if (select count(*) from public.stories where id in (source,target) and status='draft' and access_level='registered')<>2 or public.staff_can_self_publish(source,'draft') then raise exception 'Audience transition published copy or bypassed independent review';end if;
  begin perform public.staff_change_translation_access(source,before_state->>'sourceFingerprint',(before_state->>'revision')::integer,(before_state->>'targetUpdatedAt')::timestamptz,'public',gen_random_uuid(),'Try stale coordinated audience update');raise exception 'Stale access accepted';exception when serialization_failure then null;end;
 end;
end;$fn$;
reset role;
do $fn$begin
 if (select count(*) from newsroom_private.story_translation_events)<>4 or exists(select 1 from newsroom_private.translation_access_permits) or (select count(*) from newsroom_private.story_translation_links)<>2 or exists(select 1 from newsroom_private.self_publication_events) then raise exception 'Unexpected translation audit or bypass';end if;
end;$fn$;

-- Directly seeded, rollback-only published poll/placement fixtures isolate the public
-- projection. The real-platform suite exercises the independent approval APIs.
insert into newsroom_private.polls(id,language,question,options,opens_at,closes_at,response_cap,status,creator,last_editor,reviewer) values
 ('e1600000-0000-4000-8000-000000000031','es','Encuesta sintética',array['Sí','No'],now()-interval '1 hour',now()+interval '1 day',100,'published','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000002'),
 ('e1600000-0000-4000-8000-000000000032','en','Synthetic poll',array['Yes','No'],now()-interval '1 hour',now()+interval '1 day',100,'published','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000002'),
 ('e1600000-0000-4000-8000-000000000033','es','Expired placement',array['Sí','No'],now()-interval '1 hour',now()+interval '1 day',100,'published','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000002');
insert into newsroom_private.poll_placement_state(poll_id,revision,draft,published,draft_actor,published_actor)
select p.id,1,'[]'::jsonb,
 jsonb_build_array(jsonb_build_object('kind','article','target',case when p.language='en' then current_setting('test.translation_target') else 'b1500000-0000-4000-8000-000000000001' end,'startsAt',null,'endsAt',case when p.id='e1600000-0000-4000-8000-000000000033' then now()-interval '1 minute' else null end)),
 p.creator,p.creator from newsroom_private.polls p;
update newsroom_private.poll_settings set public_enabled=true where singleton;
set local role anon;
do $fn$
declare source text:='b1500000-0000-4000-8000-000000000001';target text:=current_setting('test.translation_target'); es jsonb; en jsonb;
begin
 es:=public.public_placed_polls('es','article',target)->'items';en:=public.public_placed_polls('en','article',source)->'items';
 if jsonb_array_length(es)<>1 or es#>>'{0,id}' is distinct from 'e1600000-0000-4000-8000-000000000031' or jsonb_array_length(en)<>1 or en#>>'{0,id}' is distinct from 'e1600000-0000-4000-8000-000000000032' then raise exception 'Approved pair inheritance/window/locale mismatch';end if;
 if (public.public_placed_polls('en','article','b1500000-0000-4000-8000-000000000002')->>'enabled')::boolean or (public.public_placed_polls('es','article','invalid')->>'enabled')::boolean then raise exception 'Unpublished or invalid placement target exposed';end if;
end;$fn$;
reset role;
-- Both explicit placements must still produce only one poll, even with inheritance.
update newsroom_private.poll_placement_state set published=published||jsonb_build_array(jsonb_build_object('kind','article','target',current_setting('test.translation_target'),'startsAt',null,'endsAt',null)) where poll_id='e1600000-0000-4000-8000-000000000031';
set local role anon;
do $fn$begin
 if jsonb_array_length(public.public_placed_polls('es','article',current_setting('test.translation_target'))->'items')<>1 then raise exception 'Duplicate inherited placement';end if;
end;$fn$;
reset role;
-- Deliberate stale fingerprint fixture: direct placements stay valid; inherited ones disappear.
update newsroom_private.story_translation_links set published_fingerprint=repeat('0',64) where source_id='b1500000-0000-4000-8000-000000000001';
set local role anon;
do $fn$begin
 if jsonb_array_length(public.public_placed_polls('en','article','b1500000-0000-4000-8000-000000000001')->'items')<>0 or jsonb_array_length(public.public_placed_polls('es','article',current_setting('test.translation_target'))->'items')<>1 then raise exception 'Stale pair inherited placement or lost explicit placement';end if;
end;$fn$;
reset role;
select 'CT16 linked article poll inheritance, deduplication, window and stale isolation passed' as result;
-- Ordered archival never silently modifies the counterpart or weakens access.
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001';target uuid:=current_setting('test.translation_target')::uuid;
begin
 begin update public.stories set status='archived',updated_by=auth.uid() where id=source;raise exception 'Original archived before live translation';exception when insufficient_privilege then null;end;
 begin update public.stories set access_level='registered',updated_by=auth.uid() where id=target;raise exception 'Linked access mutated directly';exception when insufficient_privilege then null;end;
 update public.stories set status='archived',updated_by=auth.uid() where id=target;
 if not found or (select status from public.stories where id=source)<>'published' then raise exception 'Target archival changed original';end if;
 update public.stories set status='archived',updated_by=auth.uid() where id=source;
 if not found or (select status from public.stories where id=source)<>'archived' then raise exception 'Ordered source archive failed';end if;
end;$fn$;
reset role;
set local role anon;
do $fn$begin
 if jsonb_array_length(public.public_story_translation_pairs(array['b1500000-0000-4000-8000-000000000001'::uuid,current_setting('test.translation_target')::uuid]))<>0 or (public.public_placed_polls('es','article',current_setting('test.translation_target'))->>'enabled')::boolean then raise exception 'Archived pair or placement exposed';end if;
end;$fn$;
reset role;
select 'CT16 linked article ordered archival and access guard passed' as result;
-- Existing working revision must block permanent retirement.
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001';state jsonb;
begin
 state:=public.staff_read_story_translation(source);
 if state->>'canRetire' is distinct from 'false' or state->>'canChangeAccess' is distinct from 'false' then raise exception 'Working revision eligibility leaked';end if;
 begin perform public.staff_retire_story_translation(source,state->>'sourceFingerprint',(state->>'revision')::integer,(state->>'targetUpdatedAt')::timestamptz,gen_random_uuid(),'Attempt retirement with working revision');raise exception 'Working revision retirement allowed';exception when serialization_failure then null;end;
end;$fn$;
reset role;
-- Disposable fixture cleanup only; actual UI must use authorized revision discard.
delete from public.story_revisions where story_id='b1500000-0000-4000-8000-000000000001';
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare source uuid:='b1500000-0000-4000-8000-000000000001';target uuid:=current_setting('test.translation_target')::uuid;state jsonb;result jsonb;cmd uuid:=gen_random_uuid();
begin
 state:=public.staff_read_story_translation(source);
 begin perform public.staff_retire_story_translation(source,state->>'sourceFingerprint',(state->>'revision')::integer+1,(state->>'targetUpdatedAt')::timestamptz,gen_random_uuid(),'Attempt stale relationship retirement');raise exception 'Stale retirement accepted';exception when serialization_failure then null;end;
 result:=public.staff_retire_story_translation(source,state->>'sourceFingerprint',(state->>'revision')::integer,(state->>'targetUpdatedAt')::timestamptz,cmd,'Retire archived discussion-free relationship');
 if result->>'retired' is distinct from 'true' or result->>'linked' is distinct from 'false' or result->>'canCreate' is distinct from 'false' or result is distinct from public.staff_retire_story_translation(source,state->>'sourceFingerprint',(state->>'revision')::integer,(state->>'targetUpdatedAt')::timestamptz,cmd,'Retire archived discussion-free relationship') then raise exception 'Retirement or exact replay failed';end if;
 if public.staff_read_story_translation(target)->>'retired' is distinct from 'true' or (select status from public.stories where id=source)<>'archived' or (select status from public.stories where id=target)<>'archived' then raise exception 'Retirement changed story state';end if;
end;$fn$;
reset role;
do $fn$begin
 if has_function_privilege('anon','public.staff_retire_story_translation(uuid,text,integer,timestamptz,uuid,text)','EXECUTE') or not exists(select 1 from newsroom_private.story_translation_links where source_id='b1500000-0000-4000-8000-000000000001' and retired_at is not null) or (select count(*) from newsroom_private.story_translation_events where action='retire')<>1 then raise exception 'Retirement ACL or audit failure';end if;
end;$fn$;
select 'CT16 archived relationship retirement, working-copy denial, stale replay and audit passed' as result;

rollback;
select 'CT16 linked draft, independent publication, public pair and stale source refresh passed' as result;
