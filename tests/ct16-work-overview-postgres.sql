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
end;$fn$;
do $fn$
declare p jsonb;
begin
 p:=public.staff_lookup_work_assignment_options('article','ct15-draft',0);
 if jsonb_array_length(p->'items')<>1 or p#>>'{items,0,id}' is distinct from 'b1500000-0000-4000-8000-000000000002' then raise exception 'Article picker failed';end if;
 p:=public.staff_lookup_work_assignment_options('member','',0);
 if jsonb_array_length(p->'items')<>2 then raise exception 'Member picker failed';end if;
 p:=public.staff_read_work_assignment_overview('team','2026-12-01T00:00:00Z','2026-12-02T00:00:00Z',false,0);
 if p#>>'{counts,total}'<>'2' or p#>>'{counts,active}'<>'2' or jsonb_array_length(p->'items')<>2 then raise exception 'Overview counts or range failed';end if;
 p:=public.staff_read_work_assignment_overview('team','2026-12-02T00:00:00Z','2026-12-03T00:00:00Z',false,0);
 if jsonb_array_length(p->'items')<>0 or p#>>'{counts,total}'<>'2' then raise exception 'Range leaked out-of-window work or distorted total';end if;
end;$fn$;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $fn$
declare p jsonb;
begin
 p:=public.staff_read_work_assignment_overview('personal',null,null,false,0);
 if p#>>'{counts,total}'<>'2' or jsonb_array_length(p->'items')<>2 or p#>'{items,0}' ? 'storyId' then raise exception 'Personal overview leaked or omitted work';end if;
 begin perform public.staff_read_work_assignment_overview('team',null,null,false,0);raise exception 'Team overview leak';exception when insufficient_privilege then null;end;
 begin perform public.staff_lookup_work_assignment_options('article','',0);raise exception 'Assignee article picker leak';exception when insufficient_privilege then null;end;
 begin perform public.staff_lookup_work_assignment_options('member','',0);raise exception 'Assignee member picker leak';exception when insufficient_privilege then null;end;
end;$fn$;
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
select 'CT16 work options and overview scope, range and exact totals passed' as result;
