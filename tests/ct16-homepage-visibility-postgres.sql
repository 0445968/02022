\set ON_ERROR_STOP on
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='owner'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='managing_editor';
-- Isolated bootstrap fixture only; production Owner preset remains immutable.
alter table public.staff_role_capabilities disable trigger ct03c_preset_grant_guard;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
 select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['newsroom.access','homepage.view_editor','homepage.edit','homepage.publish','story.view_all','story.edit_all']) k where p.role_key='owner'
 union all select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['newsroom.access','homepage.view_editor','homepage.edit']) k where p.role_key='managing_editor';
alter table public.staff_role_capabilities enable trigger ct03c_preset_grant_guard;
do $fn$begin
 if has_function_privilege('authenticated','newsroom_private.change_homepage_layout_core(text,integer,jsonb,integer)','EXECUTE') or has_table_privilege('anon','newsroom_private.homepage_visibility','SELECT') or has_function_privilege('anon','public.staff_read_homepage_visibility_versioned()','EXECUTE') then raise exception 'Draft layout leaked';end if;
 begin update public.stories set created_by='a1500000-0000-4000-8000-000000000002' where id='b1500000-0000-4000-8000-000000000002';raise exception 'Creator reassigned';exception when insufficient_privilege then null;end;
 begin insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by,expires_at) values ('c1600000-0000-4000-8000-000000000002','media.quota_exempt','allow','all','Incorrect scope must fail','a1500000-0000-4000-8000-000000000001',now()+interval '2 days');raise exception 'Broad exemption accepted';exception when invalid_parameter_value then null;end;
end;$fn$;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$
declare p jsonb; v jsonb; c jsonb:='[{"slot":"lead","position":0,"storyId":"b1500000-0000-4000-8000-000000000001","categoryId":null}]';
begin
 p:=public.staff_read_homepage_visibility_versioned();
 if p->'visibility'->>'latest_news'<>'true' then raise exception 'Legacy visibility lost';end if;
 v:=jsonb_set(p->'visibility','{latest_news}','false');
 p:=public.staff_change_homepage_visibility_versioned('save',0,c,null,v);
 if p->'visibility'->>'latest_news'<>'false' or public.read_public_homepage_visibility()->>'latest_news'<>'true' then raise exception 'Draft visibility leaked';end if;
 begin perform public.staff_change_homepage_visibility_versioned('publish',1,c,null,v);raise exception 'Editor published';exception when insufficient_privilege then null;end;
 begin perform public.staff_change_homepage_visibility_versioned('save',1,c,null,v||'{"lead":false}');raise exception 'Lead toggle accepted';exception when invalid_parameter_value then null;end;
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare p jsonb; v jsonb; c jsonb:='[{"slot":"lead","position":0,"storyId":"b1500000-0000-4000-8000-000000000001","categoryId":null}]';
begin
 p:=public.staff_change_homepage_visibility_versioned('publish',1,c,null,null);
 if public.read_public_homepage_visibility()->>'latest_news'<>'false' or p->'published'<>c then raise exception 'Publish failed or selections discarded';end if;
 v:=jsonb_set(p->'visibility','{latest_news}','true');
 p:=public.staff_change_homepage_visibility_versioned('save',2,c,null,v);
 p:=public.staff_change_homepage_visibility_versioned('restore',3,null,2,null);
 if p->'visibility'->>'latest_news'<>'false' or p->'selections'<>c then raise exception 'Version restore missing visibility';end if;
 p:=public.staff_change_homepage_visibility_versioned('restore',4,null,0,null);
 if p->'visibility'->>'latest_news'<>'true' or p->'publishedVisibility'->>'latest_news'<>'false' then raise exception 'Baseline restore leaked';end if;
 p:=public.staff_change_homepage_versioned('revert',5,null,null);
 if p?'visibility' or public.staff_read_homepage_visibility_versioned()->'visibility'->>'latest_news'<>'false' then raise exception 'Legacy revert inconsistent';end if;
end;$fn$;
reset role;
set local role anon;
do $fn$begin if public.read_public_homepage_visibility()->>'latest_news'<>'false' then raise exception 'Public visibility missing';end if;end;$fn$;
rollback;
select 'CT16 ownership hardening and versioned homepage visibility passed' as result;
