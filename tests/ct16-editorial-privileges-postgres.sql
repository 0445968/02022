-- Disposable only; never run on hosted data.
\set ON_ERROR_STOP on
do $fn$begin
 if exists(select 1 from newsroom_private.work_assignments) or exists(select 1 from public.staff_role_capabilities where capability_key::text like 'assignment.%') then raise exception 'Unexpected seed';end if;
 if has_function_privilege('anon','public.staff_change_work_assignment(jsonb)','EXECUTE') or has_table_privilege('authenticated','newsroom_private.work_assignments','SELECT')
 or has_table_privilege('authenticated','newsroom_private.work_assignment_events','INSERT')
 or has_function_privilege('authenticated','newsroom_private.work_permission(uuid,text,boolean)','EXECUTE') then raise exception 'Privilege leak';end if;
end;$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$begin
 begin perform public.staff_read_work_assignments('personal',0,null);raise exception 'Reader accessed assignments';exception when insufficient_privilege then null;end;
 begin perform public.staff_change_work_assignment('{}');raise exception 'Reader mutated assignments';exception when insufficient_privilege then null;end;
end;$fn$;
rollback;
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='editor'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='staff_writer';
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
 select id,'newsroom.access'::public.staff_capability_key,'all' from public.staff_role_presets where role_key in ('editor','staff_writer')
 union all select id,'assignment.view_team'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor'
 union all select id,'assignment.manage'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor'
 union all select id,'story.view_all'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor'
 union all select id,'assignment.view_assigned'::public.staff_capability_key,'assigned' from public.staff_role_presets where role_key in ('editor','staff_writer')
 union all select id,'assignment.update_assigned'::public.staff_capability_key,'assigned' from public.staff_role_presets where role_key='staff_writer';
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare cmd jsonb; result jsonb; replay jsonb; aid uuid;
begin
 cmd:='{"action":"create","assignmentId":null,"expectedRevision":0,"requestId":"d1600000-0000-4000-8000-000000000001","reason":"Assign research coverage","details":{"title":"Standalone research","activity":"research","coverage":"community","storyId":"b1500000-0000-4000-8000-000000000002","assigneeIds":["c1600000-0000-4000-8000-000000000001","c1600000-0000-4000-8000-000000000002"],"priority":"high","dueAt":"2026-12-01T10:00:00Z","notes":"Test research notes"}}';
 result:=public.staff_change_work_assignment(cmd);aid:=(result->>'id')::uuid;
 replay:=public.staff_change_work_assignment(cmd);
 if replay is distinct from result or result->>'revision'<>'1' then raise exception 'Creation or idempotency failed';end if;
 perform set_config('test.work_id',aid::text,true);
 if public.staff_read_work_assignments('team',0,aid)#>>'{items,0,storyId}' is distinct from 'b1500000-0000-4000-8000-000000000002' then raise exception 'Authorized link missing';end if;
 begin perform public.staff_change_work_assignment(jsonb_set(cmd,'{details,title}','"Changed"'));raise exception 'Conflicting replay accepted';exception when serialization_failure then null;end;
 result:=public.staff_change_work_assignment(jsonb_set(jsonb_set(jsonb_set(cmd,'{requestId}','"d1600000-0000-4000-8000-000000000002"'),'{details,storyId}','null'),'{details,title}','"No linked article"'));
 if result->>'revision'<>'1' then raise exception 'Unlinked creation failed';end if;
 if jsonb_array_length(public.staff_search_work_assignments('team',0,null,'Standalone','assigned','high')->'items')<>1 or jsonb_array_length(public.staff_search_work_assignments('team',0,null,'absent',null,null)->'items')<>0 then raise exception 'Global work search incorrect';end if;
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$
declare aid uuid:=current_setting('test.work_id')::uuid; cmd jsonb; page jsonb; result jsonb;
begin
 page:=public.staff_read_work_assignments('personal',0,aid);
 if page#>>'{items,0,title}' is distinct from 'Standalone research' or page#>>'{items,0,storyId}' is not null or page#>>'{items,0,storyHeadline}' is not null then raise exception 'Assigned visibility or link redaction failed';end if;
 if exists(select 1 from public.stories where slug='ct15-draft') then raise exception 'Work assignment granted story access';end if;
 begin perform public.staff_read_work_assignments('team',0,null);raise exception 'Assignee accessed team';exception when insufficient_privilege then null;end;
 cmd:=jsonb_build_object('action','status','assignmentId',aid,'expectedRevision',1,'requestId','d1600000-0000-4000-8000-000000000003','reason','Begin assigned research','status','in_progress');
 result:=public.staff_change_work_assignment(cmd);
 if result->>'status'<>'in_progress' or result->>'revision'<>'2' then raise exception 'Progress failed';end if;
 begin perform public.staff_change_work_assignment(jsonb_set(cmd,'{requestId}','"d1600000-0000-4000-8000-000000000004"'));raise exception 'Stale mutation accepted';exception when serialization_failure then null;end;
 begin perform public.staff_change_work_assignment(jsonb_set(jsonb_set(jsonb_set(cmd,'{requestId}','"d1600000-0000-4000-8000-000000000005"'),'{expectedRevision}','2'),'{status}','"cancelled"'));raise exception 'Assignee cancelled';exception when invalid_parameter_value then null;end;
end;$fn$;
reset role;
do $fn$begin
 if (select count(*) from newsroom_private.work_assignment_events)<>3 or (select count(*) from newsroom_private.work_assignments)<>2 then raise exception 'Unexpected audit or assignment count';end if;
 if exists(select 1 from public.staff_story_assignments) then raise exception 'Work assignment mutated story grants';end if;
end;$fn$;
rollback;
select 'CT16 standalone assignment candidate authorization, redaction, idempotency and audit checks passed' as result;

-- Prove feature defaults disabled, no direct grant, then simulate explicit rollout in rollback-only transaction.
do $fn$begin
 if (select enabled from newsroom_private.editorial_privilege_settings) or has_function_privilege('anon','public.staff_publish_own_story(uuid,text,uuid,text,text)','EXECUTE') or has_table_privilege('authenticated','newsroom_private.self_publication_events','INSERT') or has_column_privilege('authenticated','newsroom_private.private_upload_reservations','slot','INSERT') then raise exception 'Unsafe privilege defaults';end if;
end;$fn$;
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='editor'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='staff_writer';
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
 select id,'newsroom.access'::public.staff_capability_key,'all' from public.staff_role_presets where role_key in ('editor','staff_writer')
 union all select id,'media.upload'::public.staff_capability_key,'all' from public.staff_role_presets where role_key in ('editor','staff_writer')
 union all select id,'story.view_all'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor'
 union all select id,'story.edit_all'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor'
 union all select id,'story.publish'::public.staff_capability_key,'all' from public.staff_role_presets where role_key='editor';
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by,expires_at)
select 'c1600000-0000-4000-8000-000000000001',k::public.staff_capability_key,'allow','own','Disposable individual exemption','a1500000-0000-4000-8000-000000000002',now()+interval '2 days'
from unnest(array['story.publish_own_without_review','media.quota_exempt','byline.self_service']) k;
select public.staff_save_onboarding('a1500000-0000-4000-8000-000000000001',0,'Synthetic Self Author','en',true,1,gen_random_uuid());
insert into public.editorial_profiles(id,account_id,byline_name,slug,byline_status) values ('e1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','Synthetic Self Author','ct16-self-byline','active'),('e1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','Other Author','ct16-other-byline','active');
select set_config('test.self_fingerprint',newsroom_private.review_snapshot('b1500000-0000-4000-8000-000000000002','draft')->>'fingerprint',true);
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$begin
 if public.staff_can_self_publish('b1500000-0000-4000-8000-000000000002','draft') then raise exception 'Feature enabled without approval';end if;
 if public.staff_private_upload_quota()->>'maxSlots'<>'25' then raise exception 'Quota bypassed before activation';end if;
 begin perform public.staff_read_self_byline();raise exception 'Disabled self byline accessible';exception when insufficient_privilege then null;end;
end;$fn$;
reset role;
update newsroom_private.editorial_privilege_settings set enabled=true where id;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$
declare q jsonb; result jsonb; f text:=current_setting('test.self_fingerprint');
begin
 if not public.staff_can_self_publish('b1500000-0000-4000-8000-000000000002','draft') then raise exception 'Own draft privilege missing';end if;
 begin perform public.staff_publish_own_story('b1500000-0000-4000-8000-000000000002','draft',gen_random_uuid(),repeat('0',64),'Stale copy must not publish');raise exception 'Stale copy published';exception when serialization_failure then null;end;
 result:=public.staff_publish_own_story('b1500000-0000-4000-8000-000000000002','draft','d1600000-0000-4000-8000-000000000010',f,'Explicit independent review bypass');
 if result->>'method'<>'self_publication' or result is distinct from public.staff_publish_own_story('b1500000-0000-4000-8000-000000000002','draft','d1600000-0000-4000-8000-000000000010',f,'Explicit independent review bypass') then raise exception 'Self publication or idempotency failed';end if;
 for n in 1..26 loop perform public.staff_reserve_private_upload('png');end loop;
 q:=public.staff_private_upload_quota();
 if q->>'maxSlots' is not null or q->>'usedSlots'<>'26' or q->>'maxFileBytes'<>'10485760' then raise exception 'Exempt quota not correct';end if;
 q:=public.staff_read_self_byline();
 if jsonb_array_length(q->'items')<>1 or q#>>'{items,0,id}'<>'e1600000-0000-4000-8000-000000000001' then raise exception 'Self byline options leaked';end if;
 begin perform public.staff_link_self_byline('e1600000-0000-4000-8000-000000000002',1,0,'Try claiming another author',gen_random_uuid());raise exception 'Other byline claimed';exception when insufficient_privilege then null;end;
 if public.staff_link_self_byline('e1600000-0000-4000-8000-000000000001',1,0,'Link existing personal editorial profile',gen_random_uuid())<>1 then raise exception 'Self byline not linked';end if;
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$begin
 if public.staff_can_self_publish('b1500000-0000-4000-8000-000000000002','draft') then raise exception 'Ordinary writer bypass';end if;
 for n in 1..25 loop perform public.staff_reserve_private_upload('png');end loop;
 begin perform public.staff_reserve_private_upload('png');raise exception 'Quota bypass' using errcode='XX000';exception when raise_exception then null;end;
end;$fn$;
reset role;
delete from public.staff_capability_overrides where capability_key='media.quota_exempt';
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $fn$begin
 if public.staff_private_upload_quota()->>'remainingSlots'<>'0' then raise exception 'Revoked over-limit quota incorrect';end if;
 begin perform public.staff_reserve_private_upload('jpg');raise exception 'Revoked exemption still allowed' using errcode='XX000';exception when raise_exception then null;end;
end;$fn$;
reset role;
do $fn$begin
 if (select count(*) from newsroom_private.self_publication_events)<>1 or exists(select 1 from newsroom_private.publication_events where story_id='b1500000-0000-4000-8000-000000000002') or exists(select 1 from newsroom_private.story_review_decisions) or (select status from public.stories where id='b1500000-0000-4000-8000-000000000002')<>'published' then raise exception 'Self publication audit incorrect or false independent approval';end if;
 if (select author_id from public.stories where id='b1500000-0000-4000-8000-000000000002')<>'a1500000-0000-4000-8000-000000000001' or (select account_id from public.editorial_profiles where id='e1600000-0000-4000-8000-000000000002')<>'a1500000-0000-4000-8000-000000000002' then raise exception 'Historical attribution changed';end if;
end;$fn$;
rollback;
select 'CT16 editorial privilege boundaries and global assignment filters passed' as result;
