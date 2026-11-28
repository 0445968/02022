-- CT16 staged candidate, no automatic grants, separate from article assignments.
alter type public.staff_capability_key add value 'assignment.view_team';
alter type public.staff_capability_key add value 'assignment.manage';
alter type public.staff_capability_key add value 'assignment.view_assigned';
alter type public.staff_capability_key add value 'assignment.update_assigned';
begin;
create or replace function public.staff_preset_grant_allowed(
  p_role text,p_cap public.staff_capability_key,p_scope text
)
returns boolean language plpgsql immutable security invoker set search_path=''
as $fn$
declare
  v_allowed text[];
  v_cap text := p_cap::text;
begin
  if p_scope not in ('all','assigned','own')
    or p_role='owner'
    or v_cap in ('settings.security_admin','reader.personal','byline.manage')
    or v_cap like 'team.%' then return false; end if;

  if v_cap in ('assignment.view_team','assignment.manage') then return p_role in ('managing_editor','editor') and p_scope='all';end if;
  if v_cap in ('assignment.view_assigned','assignment.update_assigned') then return p_role in ('managing_editor','editor','staff_writer','copy_editor','media_editor','moderator','audience_staff','freelancer') and p_scope='assigned';end if;
  v_allowed := case p_role
    when 'managing_editor' then array[
      'newsroom.access','story.view_all','story.create','story.edit_all',
      'story.submit_review','story.review','story.publish','story.schedule',
      'story.archive_delete','story.assign','revision.view','revision.publish',
      'revision.discard','media.view_all','media.upload','media.edit_all',
      'media.approve','byline.view','homepage.view_editor','homepage.edit',
      'homepage.publish','comment.view_queue','comment.moderate',
      'poll.view_manage','poll.edit','poll.publish',
      'calendar.view_team','calendar.manage'
    ]
    when 'editor' then array[
      'newsroom.access','story.view_all','story.create','story.edit_all',
      'story.submit_review','story.review','story.publish','story.schedule',
      'story.archive_delete','story.assign','revision.view','revision.publish',
      'revision.discard','media.view_all','media.upload','media.edit_all',
      'media.approve','byline.view','homepage.view_editor','calendar.view_team'
    ]
    when 'staff_writer' then array[
      'newsroom.access','story.create','media.upload',
      'story.view_assigned','story.edit_assigned','story.submit_review',
      'revision.view','revision.edit_assigned','media.edit_own'
    ]
    when 'copy_editor' then array[
      'newsroom.access','story.view_assigned','story.edit_assigned',
      'story.review','revision.view','revision.edit_assigned'
    ]
    when 'media_editor' then array[
      'newsroom.access','media.view_all','media.upload','media.edit_all',
      'media.approve','media.delete','story.view_assigned',
      'revision.view','revision.edit_assigned'
    ]
    when 'moderator' then array[
      'newsroom.access','comment.view_queue','comment.moderate',
      'comment.manage_reports'
    ]
    when 'audience_staff' then array[
      'newsroom.access','audience.view','audience.notify',
      'newsletter.manage'
    ]
    when 'freelancer' then array[
      'newsroom.access','media.upload','story.view_assigned',
      'story.edit_assigned','story.submit_review',
      'revision.view','revision.edit_assigned','media.edit_own'
    ]
    else array[]::text[]
  end;

  if not v_cap=any(v_allowed) then return false; end if;
  -- Semantic scopes cannot be widened beyond their resource-specific
  -- contract; 'own' and 'assigned' are not interchangeable.
  if v_cap in (
    'story.view_assigned','story.edit_assigned','revision.edit_assigned',
    'calendar.view_assigned'
  ) then return p_scope='assigned'; end if;
  if v_cap='media.edit_own' then return p_scope='own'; end if;
  if p_role in ('staff_writer','copy_editor','freelancer') and v_cap in (
    'story.submit_review','story.review','revision.view'
  ) then return p_scope='assigned'; end if;
  if p_role='media_editor' and v_cap='revision.view' then
    return p_scope='assigned'; end if;
  -- In this slice all other listed grants must be all-scope;
  -- narrower resource scopes require separate schema-level policy review.
  return p_scope='all';
end;
$fn$;

create table newsroom_private.work_assignments (
 id uuid primary key default gen_random_uuid(),title text not null check(length(btrim(title)) between 1 and 240 and title !~ '[[:cntrl:]]'),
 activity text not null check(activity in ('interview','research','observe','report','public_records_request','fact_checking','other','source_outreach','transcription','photo_video','data_analysis','translation','copy_edit','follow_up','field_reporting','document_review')),
 coverage text check(coverage in ('profile_feature','meeting_event','breaking','investigative','community','government_civic','culture','sports','environment','education','health','business','courts_public_safety','service_explainer','opinion','data','other')),
 story_id uuid references public.stories(id) on delete restrict,
 priority text not null check(priority in ('low','normal','high','urgent')),
 status text not null default 'assigned' check(status in ('assigned','in_progress','blocked','completed','cancelled')),
 due_at timestamptz,notes text not null default '' check(length(notes)<=10000),
 created_by uuid not null references auth.users(id) on delete restrict,updated_by uuid not null references auth.users(id) on delete restrict,
 revision integer not null default 1 check(revision>0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table newsroom_private.work_assignment_members (
 assignment_id uuid not null references newsroom_private.work_assignments(id) on delete restrict,
 membership_id uuid not null references public.staff_memberships(id) on delete restrict,primary key(assignment_id,membership_id)
);
create index ct16_work_member on newsroom_private.work_assignment_members(membership_id,assignment_id);
create index ct16_work_deadline on newsroom_private.work_assignments(status,due_at,id);
create table newsroom_private.work_assignment_events (
 id uuid primary key default gen_random_uuid(),assignment_id uuid not null references newsroom_private.work_assignments(id) on delete restrict,
 actor uuid not null references auth.users(id) on delete restrict,request_id uuid not null,
 fingerprint text not null check(fingerprint~'^[0-9a-f]{64}$'),action text not null check(action in ('create','edit','status')),
 reason text not null check(length(btrim(reason)) between 12 and 500 and reason !~ '[[:cntrl:]]'),revision integer not null check(revision>0),
 before_state jsonb,after_state jsonb not null,occurred_at timestamptz not null default clock_timestamp(),
 unique(actor,request_id),unique(assignment_id,revision)
);
alter table newsroom_private.work_assignments enable row level security;
alter table newsroom_private.work_assignment_members enable row level security;
alter table newsroom_private.work_assignment_events enable row level security;
revoke all on newsroom_private.work_assignments,newsroom_private.work_assignment_members,newsroom_private.work_assignment_events from public,anon,authenticated,service_role;
create function newsroom_private.work_actor()
returns uuid language sql stable security invoker set search_path='' as $fn$
 select m.id from public.staff_memberships m where m.auth_user_id=(select auth.uid())
 and m.status='active' and (m.expires_at is null or m.expires_at>now())
 and public.staff_invite_verified_identity(m.auth_user_id) and newsroom_private.has_staff_permission('newsroom.access')
$fn$;
create function newsroom_private.work_permission(p_member uuid,p_cap text,p_assigned boolean)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select p_cap in ('assignment.view_team','assignment.manage','assignment.view_assigned','assignment.update_assigned')
 and (p_cap in ('assignment.view_team','assignment.manage') or p_assigned)
 and exists(select 1 from public.staff_memberships m where m.id=p_member and m.status='active'
 and (m.expires_at is null or m.expires_at>now()) and public.staff_invite_verified_identity(m.auth_user_id)
 and newsroom_private.assignment_target_capability(m.id,'newsroom.access',false)
 and not exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id and o.capability_key::text=p_cap
  and o.effect='deny' and (o.expires_at is null or o.expires_at>now()) and (o.scope='all' or (p_assigned and o.scope='assigned')))
 and (
  -- Verified current indefinite Owner, without rewriting immutable Owner preset.
  exists(select 1 from public.staff_member_roles mr join public.staff_role_presets pr on pr.id=mr.role_preset_id
   where mr.membership_id=m.id and pr.role_key='owner' and mr.expires_at is null and m.expires_at is null and m.member_type='employee')
  or exists(select 1 from public.staff_member_roles mr join public.staff_role_capabilities g on g.role_preset_id=mr.role_preset_id
   where mr.membership_id=m.id and (mr.expires_at is null or mr.expires_at>now()) and g.capability_key::text=p_cap and (g.scope='all' or (p_assigned and g.scope='assigned')))
  or exists(select 1 from public.staff_capability_overrides o where o.membership_id=m.id and o.capability_key::text=p_cap
   and o.effect='allow' and (o.expires_at is null or o.expires_at>now()) and (o.scope='all' or (p_assigned and o.scope='assigned')))
 ))
$fn$;
create function newsroom_private.work_can_view_story(p_story uuid)
returns boolean language sql stable security invoker set search_path='' as $fn$
 select p_story is null or (exists(select 1 from public.stories where id=p_story)
 and (newsroom_private.has_staff_permission('story.view_all',p_story) or newsroom_private.has_staff_permission('story.view_assigned',p_story)))
$fn$;
create function newsroom_private.work_snapshot(p_id uuid)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select to_jsonb(a)||jsonb_build_object('assignees',coalesce((select jsonb_agg(membership_id order by membership_id)
 from newsroom_private.work_assignment_members where assignment_id=a.id),'[]'::jsonb))
 from newsroom_private.work_assignments a where a.id=p_id
$fn$;
create function newsroom_private.read_work_assignments(p_mode text,p_page integer,p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare member uuid:=newsroom_private.work_actor(); team boolean; manager boolean; items jsonb; more boolean; history jsonb:='[]'; candidates jsonb:='[]';
begin
 if member is null then raise exception 'Assignments unavailable' using errcode='42501';end if;
 if p_mode is null or p_mode not in ('team','personal') or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 team:=newsroom_private.work_permission(member,'assignment.view_team',false);
 manager:=team and newsroom_private.work_permission(member,'assignment.manage',false);
 if p_mode='team' and not team then raise exception 'Team assignments unavailable' using errcode='42501';end if;
 if p_mode='personal' and not newsroom_private.work_permission(member,'assignment.view_assigned',true) then raise exception 'Personal assignments unavailable' using errcode='42501';end if;
 with visible as materialized (
 select a.*,newsroom_private.work_can_view_story(a.story_id) as story_visible from newsroom_private.work_assignments a
 where (p_id is null or a.id=p_id) and (p_mode='team' or exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=a.id and am.membership_id=member))
 order by a.updated_at desc,a.id limit 26 offset p_page*25
 ), numbered as (select v.*,row_number() over(order by updated_at desc,id) rn from visible v)
 select coalesce(jsonb_agg(jsonb_build_object('id',a.id,'title',a.title,'activity',a.activity,'coverage',a.coverage,
  'storyId',case when a.story_visible then a.story_id end,'storyHeadline',case when a.story_visible then (select s.headline from public.stories s where s.id=a.story_id) end,
  'priority',a.priority,'status',a.status,'dueAt',a.due_at,'notes',a.notes,'revision',a.revision,'updatedAt',a.updated_at,
  'assignees',coalesce((select jsonb_agg(jsonb_build_object('id',m.id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8))) order by m.id)
   from newsroom_private.work_assignment_members am join public.staff_memberships m on m.id=am.membership_id left join public.profiles p on p.id=m.auth_user_id where am.assignment_id=a.id),'[]'::jsonb),
  'canEdit',manager and a.story_visible,'canUpdateStatus',manager or (newsroom_private.work_permission(member,'assignment.update_assigned',true)
   and exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=a.id and am.membership_id=member))) order by a.rn) filter(where a.rn<=25),'[]'::jsonb),count(*)>25 and p_page<100 into items,more from numbered a;
 if p_id is not null and jsonb_array_length(items)=0 then raise exception 'Assignment unavailable' using errcode='42501';end if;
 if manager then
  select coalesce(jsonb_agg(entry order by mid),'[]'::jsonb) into candidates from (
   select m.id mid,jsonb_build_object('id',m.id,'name',coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8))) entry
   from public.staff_memberships m left join public.profiles p on p.id=m.auth_user_id where newsroom_private.work_permission(m.id,'assignment.view_assigned',true) order by m.id limit 100) c;
  if p_id is not null then
   select coalesce(jsonb_agg(entry order by at desc,id desc),'[]'::jsonb) into history from (
    select e.id,e.occurred_at at,jsonb_build_object('id',e.id,'at',e.occurred_at,'action',e.action,'revision',e.revision,'reason',e.reason,
    'actor',coalesce(nullif(left(btrim(p.name),120),''),'Staff')) entry from newsroom_private.work_assignment_events e left join public.profiles p on p.id=e.actor
    where e.assignment_id=p_id order by e.occurred_at desc,e.id desc limit 25) h;
  end if;
 end if;
 return jsonb_build_object('mode',p_mode,'canManage',manager,'canViewTeam',team,'items',items,'hasMore',more,'candidates',candidates,'history',history);
end;
$fn$;
create function newsroom_private.change_work_assignment(p_command jsonb)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare member uuid; v_actor uuid:=(select auth.uid()); manager boolean; assigned boolean; cmd text; rid uuid; aid uuid; expected integer;
 reason text; details jsonb; ids uuid[]; link uuid; deadline timestamptz; next_status text; before_data jsonb; after_data jsonb; fp text;
 a newsroom_private.work_assignments%rowtype; previous newsroom_private.work_assignment_events%rowtype;
begin
 perform pg_advisory_xact_lock(202611,2302);
 member:=newsroom_private.work_actor();
 if member is null then raise exception 'Assignments unavailable' using errcode='42501';end if;
 manager:=newsroom_private.work_permission(member,'assignment.view_team',false) and newsroom_private.work_permission(member,'assignment.manage',false);
 if p_command is null or jsonb_typeof(p_command)<>'object' or octet_length(p_command::text)>48000 then raise exception 'Invalid command' using errcode='22023';end if;
 cmd:=p_command->>'action';
 if cmd is null or cmd not in ('create','edit','status') or (select count(*) from jsonb_object_keys(p_command))<>6
 or not (p_command ?& array['action','assignmentId','expectedRevision','requestId','reason',case when cmd='status' then 'status' else 'details' end])
 or jsonb_typeof(p_command->'expectedRevision')<>'number' or (p_command->>'expectedRevision') !~ '^[0-9]{1,10}$'
 or jsonb_typeof(p_command->'requestId')<>'string' or jsonb_typeof(p_command->'reason')<>'string' then raise exception 'Invalid command' using errcode='22023';end if;
 if (p_command->>'expectedRevision')::numeric>2147483646 then raise exception 'Invalid revision' using errcode='22023';end if;
 expected:=(p_command->>'expectedRevision')::integer;reason:=btrim(p_command->>'reason');
 if length(reason) not between 12 and 500 or reason~'[[:cntrl:]]' then raise exception 'Invalid reason' using errcode='22023';end if;
 if (p_command->>'requestId') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then raise exception 'Invalid request ID' using errcode='22023';end if;
 rid:=(p_command->>'requestId')::uuid;
 if cmd='create' then
  if not manager then raise exception 'Creation denied' using errcode='42501';end if;
  if expected<>0 or p_command->'assignmentId'<>'null'::jsonb then raise exception 'Invalid creation token' using errcode='22023';end if;
 else
  if expected=0 or jsonb_typeof(p_command->'assignmentId')<>'string' or (p_command->>'assignmentId') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then raise exception 'Invalid revision' using errcode='22023';end if;
  aid:=(p_command->>'assignmentId')::uuid;select * into a from newsroom_private.work_assignments where id=aid for update;
  assigned:=exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=aid and am.membership_id=member);
  if a.id is null or (not manager and (cmd<>'status' or not assigned or not newsroom_private.work_permission(member,'assignment.view_assigned',true)
   or not newsroom_private.work_permission(member,'assignment.update_assigned',true))) then raise exception 'Assignment unavailable' using errcode='42501';end if;
 end if;
 fp:=encode(sha256(convert_to(p_command::text,'UTF8')),'hex');
 select * into previous from newsroom_private.work_assignment_events e where e.actor=v_actor and e.request_id=rid;
 if found then
  if previous.fingerprint<>fp then raise exception 'Request ID already used' using errcode='40001';end if;
  return jsonb_build_object('id',previous.assignment_id,'revision',previous.revision,'status',previous.after_state->>'status');
 end if;
 if cmd<>'create' and a.revision<>expected then raise exception 'Assignment changed; reload' using errcode='40001';end if;
 if cmd in ('create','edit') then
  details:=p_command->'details';
  if not manager or (cmd='edit' and not newsroom_private.work_can_view_story(a.story_id)) then raise exception 'Edit denied' using errcode='42501';end if;
  if jsonb_typeof(details) is distinct from 'object' then raise exception 'Invalid details' using errcode='22023';end if;
  if (select count(*) from jsonb_object_keys(details))<>8 or not (details ?& array['title','activity','coverage','storyId','assigneeIds','priority','dueAt','notes'])
   or jsonb_typeof(details->'title')<>'string' or jsonb_typeof(details->'activity')<>'string' or jsonb_typeof(details->'priority')<>'string'
   or jsonb_typeof(details->'notes')<>'string' or length(btrim(details->>'title')) not between 1 and 240 or (details->>'title')~'[[:cntrl:]]'
   or length(details->>'notes')>10000 or translate(details->>'notes',chr(9)||chr(10)||chr(13),'')~'[[:cntrl:]]'
   or (details->>'activity') not in ('interview','research','observe','report','public_records_request','fact_checking','other','source_outreach','transcription','photo_video','data_analysis','translation','copy_edit','follow_up','field_reporting','document_review')
   or (details->'coverage'<>'null'::jsonb and (jsonb_typeof(details->'coverage')<>'string' or (details->>'coverage') not in ('profile_feature','meeting_event','breaking','investigative','community','government_civic','culture','sports','environment','education','health','business','courts_public_safety','service_explainer','opinion','data','other')))
   or (details->>'priority') not in ('low','normal','high','urgent') or jsonb_typeof(details->'assigneeIds')<>'array'
   then raise exception 'Invalid details' using errcode='22023';end if;
  if jsonb_array_length(details->'assigneeIds') not between 1 and 25 or exists(select 1 from jsonb_array_elements(details->'assigneeIds') v
   where jsonb_typeof(v)<>'string' or (v#>>'{}') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$') then raise exception 'Invalid assignees' using errcode='22023';end if;
  select array_agg(v::uuid order by v::uuid) into ids from jsonb_array_elements_text(details->'assigneeIds') v;
  if cardinality(ids)<>(select count(distinct v) from unnest(ids) v) then raise exception 'Duplicate assignee' using errcode='22023';end if;
  if exists(select 1 from unnest(ids) v where not newsroom_private.work_permission(v,'assignment.view_assigned',true)) then raise exception 'Assignee unavailable' using errcode='42501';end if;
  if details->'storyId'<>'null'::jsonb then
   if jsonb_typeof(details->'storyId')<>'string' or (details->>'storyId') !~* '^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$' then raise exception 'Invalid article' using errcode='22023';end if;
   link:=(details->>'storyId')::uuid;if not newsroom_private.work_can_view_story(link) then raise exception 'Article unavailable' using errcode='42501';end if;
  end if;
  if details->'dueAt'<>'null'::jsonb then
   if jsonb_typeof(details->'dueAt')<>'string' or (details->>'dueAt') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}([.][0-9]{1,6})?(Z|[+-][0-9]{2}:[0-9]{2})$' then raise exception 'Invalid deadline' using errcode='22023';end if;
   begin deadline:=(details->>'dueAt')::timestamptz;exception when datetime_field_overflow or invalid_datetime_format then raise exception 'Invalid deadline' using errcode='22023';end;
  end if;
  if cmd='create' then
   insert into newsroom_private.work_assignments(title,activity,coverage,story_id,priority,due_at,notes,created_by,updated_by)
   values(btrim(details->>'title'),details->>'activity',details->>'coverage',link,details->>'priority',deadline,btrim(details->>'notes'),v_actor,v_actor) returning * into a;aid:=a.id;
  else
   before_data:=newsroom_private.work_snapshot(aid);
   update newsroom_private.work_assignments set title=btrim(details->>'title'),activity=details->>'activity',coverage=details->>'coverage',
   story_id=link,priority=details->>'priority',due_at=deadline,notes=btrim(details->>'notes'),revision=revision+1,updated_by=v_actor,updated_at=clock_timestamp() where id=aid returning * into a;
   delete from newsroom_private.work_assignment_members where assignment_id=aid;
  end if;
  insert into newsroom_private.work_assignment_members select aid,v from unnest(ids) v;
 else
  next_status:=p_command->>'status';
  if jsonb_typeof(p_command->'status')<>'string' or next_status not in ('assigned','in_progress','blocked','completed','cancelled') or a.status=next_status
   or (a.status in ('completed','cancelled') and (not manager or next_status<>'assigned')) or (not manager and next_status not in ('in_progress','blocked','completed'))
   then raise exception 'Invalid transition' using errcode='22023';end if;
  before_data:=newsroom_private.work_snapshot(aid);
  update newsroom_private.work_assignments set status=next_status,revision=revision+1,updated_by=v_actor,updated_at=clock_timestamp() where id=aid returning * into a;
 end if;
 after_data:=newsroom_private.work_snapshot(aid);
 insert into newsroom_private.work_assignment_events(assignment_id,actor,request_id,fingerprint,action,reason,revision,before_state,after_state)
 values(aid,v_actor,rid,fp,cmd,reason,a.revision,before_data,after_data);
 return jsonb_build_object('id',aid,'revision',a.revision,'status',a.status);
end;
$fn$;
revoke all on function newsroom_private.work_actor(),newsroom_private.work_permission(uuid,text,boolean),newsroom_private.work_can_view_story(uuid),newsroom_private.work_snapshot(uuid),
 newsroom_private.read_work_assignments(text,integer,uuid),newsroom_private.change_work_assignment(jsonb) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_work_assignments(text,integer,uuid),newsroom_private.change_work_assignment(jsonb) to authenticated;
create function public.staff_read_work_assignments(p_mode text,p_page integer,p_id uuid default null)
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_work_assignments(p_mode,p_page,p_id) $fn$;
create function public.staff_change_work_assignment(p_command jsonb)
returns jsonb language sql security invoker set search_path='' as $fn$ select newsroom_private.change_work_assignment(p_command) $fn$;
revoke all on function public.staff_read_work_assignments(text,integer,uuid),public.staff_change_work_assignment(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_work_assignments(text,integer,uuid),public.staff_change_work_assignment(jsonb) to authenticated;
commit;
