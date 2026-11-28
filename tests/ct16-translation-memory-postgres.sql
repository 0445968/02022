-- Disposable glossary tests. No provider or API activation.
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
do $fn$
declare owner_id uuid:='a1500000-0000-4000-8000-000000000001';editor_id uuid:='a1500000-0000-4000-8000-000000000002';entries jsonb:='[{"term":"parking lot","preferred":"parqueadero","kind":"preferred","note":"Colombian usage"},{"term":"Clear Talks","preferred":"Clear Talks","kind":"protected","note":"Brand name"}]';r text;tbl text;
begin
 foreach r in array array['anon','authenticated','service_role'] loop
  foreach tbl in array array['translation_memory_baselines','translation_memory_alignments','translation_terminology_versions'] loop
   if has_table_privilege(r,'newsroom_private.'||tbl,'SELECT,INSERT,UPDATE,DELETE') then raise exception 'Private memory or terminology exposed';end if;
  end loop;
  if has_function_privilege(r,'newsroom_private.capture_translation_baseline(uuid,uuid,text,text,integer)','EXECUTE') or has_function_privilege(r,'newsroom_private.append_translation_terminology(uuid,integer,jsonb,text)','EXECUTE') then raise exception 'Unapproved trusted writer exposed';end if;
 end loop;
 if newsroom_private.append_translation_terminology(owner_id,0,entries,'Establish Colombian editorial terminology')<>1 then raise exception 'Initial glossary revision missing';end if;
 begin perform newsroom_private.append_translation_terminology(editor_id,1,entries,'Nonowner attempts terminology changes');raise exception 'Nonowner glossary write accepted';exception when insufficient_privilege then null;end;
 begin perform newsroom_private.append_translation_terminology(owner_id,0,entries,'Stale terminology revision rejected');raise exception 'Stale glossary accepted';exception when serialization_failure then null;end;
 begin perform newsroom_private.append_translation_terminology(owner_id,1,entries||entries,'Reject duplicate glossary entries');raise exception 'Duplicate glossary accepted';exception when invalid_parameter_value then null;end;
 begin perform newsroom_private.append_translation_terminology(owner_id,1,'[{"term":"Clear Talks","preferred":"Changed","kind":"protected","note":""}]','Reject protected name alteration');raise exception 'Protected name altered';exception when invalid_parameter_value then null;end;
 if newsroom_private.append_translation_terminology(owner_id,1,'[]','Remove all current terminology entries')<>2 then raise exception 'Glossary revision did not advance';end if;
 if (select count(*) from newsroom_private.translation_terminology_versions)<>2 or (select v.entries from newsroom_private.translation_terminology_versions v where revision=1) is distinct from entries then raise exception 'Terminology history overwritten';end if;
end;$fn$;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$declare result jsonb;begin
 result:=public.staff_read_translation_terminology();
 if result is distinct from '{"revision":2,"entries":[]}'::jsonb then raise exception 'Owner glossary read incorrect';end if;
 result:=public.staff_save_translation_terminology(2,'[{"term":"computer","preferred":"computador","kind":"preferred","note":""}]','Add Colombian preferred vocabulary');
 if result->>'revision' is distinct from '3' then raise exception 'Owner glossary save incorrect';end if;
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$begin
 begin perform public.staff_read_translation_terminology();raise exception 'Editor read accepted';exception when insufficient_privilege then null;end;
 begin perform public.staff_save_translation_terminology(3,'[]','Unauthorized terminology revision');raise exception 'Editor write accepted';exception when insufficient_privilege then null;end;
end;$fn$;
reset role;
do $fn$begin
 if has_function_privilege('anon','public.staff_read_translation_terminology()','EXECUTE') or has_function_privilege('service_role','public.staff_save_translation_terminology(integer,jsonb,text)','EXECUTE') then raise exception 'Glossary RPC ACL violation';end if;
end;$fn$;
rollback;
select 'CT16 private glossary ACL, version history and validation passed' as result;
