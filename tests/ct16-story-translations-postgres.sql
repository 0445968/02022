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
end;$fn$;
reset role;
do $fn$begin
 if (select count(*) from newsroom_private.story_translation_events)<>3 or (select count(*) from newsroom_private.story_translation_links)<>2 or exists(select 1 from newsroom_private.self_publication_events) then raise exception 'Unexpected translation audit or bypass';end if;
end;$fn$;
rollback;
select 'CT16 linked draft, independent publication, public pair and stale source refresh passed' as result;
