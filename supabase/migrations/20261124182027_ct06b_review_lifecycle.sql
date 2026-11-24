-- CT-06b.1 STAGED ONLY. CLI generated #45458419432.
-- Immutable review requests and decisions; no publication gate until CT-06c.
-- Separate private content epoch invalidates even change-then-revert edits.
begin;
create table newsroom_private.story_review_epochs(
 story_id uuid primary key references public.stories(id) on delete cascade,
 generation bigint not null default 0 check(generation>=0),
 last_actor uuid
);
create table newsroom_private.story_review_requests(
 id uuid primary key default gen_random_uuid(),
 seq bigint generated always as identity unique,
 story_id uuid not null references public.stories(id) on delete restrict,
 kind text not null check(kind in ('draft','revision')),
 revision_id uuid,
 generation bigint not null check(generation>=0),
 fingerprint text not null check(fingerprint~'^[0-9a-f]{64}$'),
 requested_by uuid not null,
 request_note text not null check(length(btrim(request_note)) between 12 and 1000),
 created_at timestamptz not null default clock_timestamp(),
 command_id uuid not null unique,
 check((kind='draft' and revision_id is null) or (kind='revision' and revision_id is not null))
);
-- Revision ID deliberately is not an FK: publication/discard may remove the
-- working revision, while historical review records must remain immutable.
create table newsroom_private.story_review_decisions(
 request_id uuid primary key references newsroom_private.story_review_requests(id) on delete restrict,
 decision text not null check(decision in ('approved','changes_requested','rejected')),
 decided_by uuid not null,
 decision_note text not null check(length(btrim(decision_note)) between 12 and 1000),
 decided_at timestamptz not null default clock_timestamp(),
 command_id uuid not null unique
);
create index ct06b_review_requests_story_seq on newsroom_private.story_review_requests(story_id,kind,seq desc);
alter table newsroom_private.story_review_epochs enable row level security;
alter table newsroom_private.story_review_requests enable row level security;
alter table newsroom_private.story_review_decisions enable row level security;
revoke all on newsroom_private.story_review_epochs,newsroom_private.story_review_requests,newsroom_private.story_review_decisions from public,anon,authenticated,service_role;
revoke all on sequence newsroom_private.story_review_requests_seq_seq from public,anon,authenticated,service_role;

-- Private trigger, no EXECUTE for clients. It only increments counters for
-- actual row changes. On relation moves, invalidate both parent stories.
create function newsroom_private.bump_story_review_epoch()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare old_story uuid; new_story uuid; sid uuid;
begin
 if tg_table_name='stories' then
  if tg_op<>'DELETE' then new_story:=new.id;end if;
 else
  if tg_op<>'INSERT' then old_story:=old.story_id;end if;
  if tg_op<>'DELETE' then new_story:=new.story_id;end if;
 end if;
 for sid in select distinct x from unnest(array[old_story,new_story]) x where x is not null order by x loop
  -- Skip cascade from an already deleted parent.
  if exists(select 1 from public.stories where id=sid) then
   insert into newsroom_private.story_review_epochs(story_id,generation,last_actor)
   values(sid,1,(select auth.uid()))
   on conflict(story_id) do update set generation=story_review_epochs.generation+1,last_actor=(select auth.uid());
  end if;
 end loop;
 return null;
end;
$fn$;
revoke all on function newsroom_private.bump_story_review_epoch() from public,anon,authenticated,service_role;
create trigger ct06b_review_epoch_story after insert or update on public.stories for each row execute function newsroom_private.bump_story_review_epoch();
create trigger ct06b_review_epoch_revision after insert or update or delete on public.story_revisions for each row execute function newsroom_private.bump_story_review_epoch();
create trigger ct06b_review_epoch_category after insert or update or delete on public.story_categories for each row execute function newsroom_private.bump_story_review_epoch();
create trigger ct06b_review_epoch_tag after insert or update or delete on public.story_tags for each row execute function newsroom_private.bump_story_review_epoch();

-- Fingerprint all stored source fields + live baseline + sorted relations,
-- epoch and exact revision identity. UTC avoids session timezone variance.
-- Private helper never returns article content or actor UUIDs to browser.
create function newsroom_private.review_snapshot(p_story uuid,p_kind text)
returns jsonb language plpgsql stable security invoker set search_path='' set timezone='UTC'
as $fn$
declare s public.stories%rowtype; r public.story_revisions%rowtype; gen bigint; actor uuid; source jsonb; digest text; cats jsonb; tags jsonb;
begin
 select * into s from public.stories where id=p_story;
 if not found or p_kind is null or p_kind not in ('draft','revision') then return null;end if;
 if p_kind='revision' then
  if s.status<>'published' then return null;end if;
  select * into r from public.story_revisions where story_id=p_story;
  if not found then return null;end if;
  source:=to_jsonb(r);
 else
  if s.status not in ('draft','in_review','scheduled') then return null;end if;
  source:=to_jsonb(s);
 end if;
 select generation,last_actor into gen,actor from newsroom_private.story_review_epochs where story_id=p_story;
 gen:=coalesce(gen,0);
 select coalesce(jsonb_agg(to_jsonb(c) order by c.category_id),'[]'::jsonb) into cats from public.story_categories c where c.story_id=p_story;
 select coalesce(jsonb_agg(to_jsonb(t) order by t.tag_id),'[]'::jsonb) into tags from public.story_tags t where t.story_id=p_story;
 digest:=encode(sha256(convert_to(jsonb_build_array(p_story,p_kind,gen,to_jsonb(s),source,cats,tags)::text,'UTF8')),'hex');
 return jsonb_build_object('storyId',p_story,'kind',p_kind,'revisionId',r.id,'headline',source->>'headline',
  'status',source->>'status','fingerprint',digest,'generation',gen,
  'creator',source->>'created_by','updater',source->>'updated_by','lastActor',actor);
end;
$fn$;
revoke all on function newsroom_private.review_snapshot(uuid,text) from public,anon,authenticated,service_role;

create function newsroom_private.review_access(p_story uuid,p_kind text,p_action text)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select public.staff_invite_verified_identity((select auth.uid()))
 and newsroom_private.has_staff_permission('newsroom.access')
 and (newsroom_private.has_staff_permission('story.view_all',p_story) or newsroom_private.has_staff_permission('story.view_assigned',p_story))
 and (p_kind='draft' or (p_kind='revision' and newsroom_private.has_staff_permission('revision.view',p_story)))
 and case p_action
  when 'submit' then newsroom_private.has_staff_permission('story.submit_review',p_story)
    and (newsroom_private.has_staff_permission('story.edit_all',p_story)
      or (newsroom_private.has_staff_permission('story.edit_assigned',p_story)
       and (p_kind='draft' or newsroom_private.has_staff_permission('revision.edit_assigned',p_story))))
  when 'decide' then newsroom_private.has_staff_permission('story.review',p_story)
  else false end
$fn$;
revoke all on function newsroom_private.review_access(uuid,text,text) from public,anon,authenticated,service_role;

create function newsroom_private.review_independent(p_story uuid,p_snapshot jsonb,p_requester uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select (select auth.uid()) is not null
 and (select auth.uid()) is distinct from p_requester
 and (select auth.uid())::text is distinct from p_snapshot->>'creator'
 and (select auth.uid())::text is distinct from p_snapshot->>'updater'
 and (select auth.uid())::text is distinct from p_snapshot->>'lastActor'
 and not exists(select 1 from public.staff_story_assignments a join public.staff_memberships m on m.id=a.membership_id
  where a.story_id=p_story and a.assignment_type='author' and a.status='active' and m.auth_user_id=(select auth.uid()))
$fn$;
revoke all on function newsroom_private.review_independent(uuid,jsonb,uuid) from public,anon,authenticated,service_role;

-- Lock same parent/revision order as publisher then epoch. Relation changes
-- bump the epoch inside their transaction; later committed changes invalidate
-- the decision. Deadlocks serialize by rollback; API maps them to conflict.
create function newsroom_private.lock_review_snapshot(p_story uuid,p_kind text)
returns jsonb language plpgsql security invoker set search_path=''
as $fn$
begin
 perform 1 from public.stories where id=p_story for update;
 if not found then return null;end if;
 if p_kind='revision' then perform 1 from public.story_revisions where story_id=p_story for update;end if;
 insert into newsroom_private.story_review_epochs(story_id,generation) values(p_story,0) on conflict(story_id) do nothing;
 perform 1 from newsroom_private.story_review_epochs where story_id=p_story for update;
 return newsroom_private.review_snapshot(p_story,p_kind);
end;
$fn$;
revoke all on function newsroom_private.lock_review_snapshot(uuid,text) from public,anon,authenticated,service_role;

create function newsroom_private.read_review_state(p_story uuid,p_kind text)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare snap jsonb; req newsroom_private.story_review_requests%rowtype; dec newsroom_private.story_review_decisions%rowtype;
 submitter boolean; reviewer boolean; current_review boolean:=false; history jsonb;
begin
 submitter:=coalesce(newsroom_private.review_access(p_story,p_kind,'submit'),false);
 reviewer:=coalesce(newsroom_private.review_access(p_story,p_kind,'decide'),false);
 if not(submitter or reviewer) then raise exception 'Review unavailable' using errcode='42501';end if;
 snap:=newsroom_private.review_snapshot(p_story,p_kind);
 if snap is null then raise exception 'Review source unavailable' using errcode='P0002';end if;
 select * into req from newsroom_private.story_review_requests where story_id=p_story and kind=p_kind order by seq desc limit 1;
 if found then
  select * into dec from newsroom_private.story_review_decisions where request_id=req.id;
  current_review:=snap->>'status'='in_review' and req.fingerprint=snap->>'fingerprint'
   and req.generation=(snap->>'generation')::bigint and req.revision_id is not distinct from (snap->>'revisionId')::uuid;
 end if;
 select coalesce(jsonb_agg(entry order by seq desc),'[]'::jsonb) into history from (
  select q.seq,jsonb_build_object('id',q.id,'requestedAt',q.created_at,'requestNote',q.request_note,
   'requestedByMe',q.requested_by=(select auth.uid()),'decision',d.decision,'decisionNote',d.decision_note,
   'decidedAt',d.decided_at,'decidedByMe',coalesce(d.decided_by=(select auth.uid()),false),
   'current',q.id=req.id and current_review) entry
  from newsroom_private.story_review_requests q left join newsroom_private.story_review_decisions d on d.request_id=q.id
  where q.story_id=p_story and q.kind=p_kind order by q.seq desc limit 10
 ) h;
 return (snap-array['creator','updater','lastActor','generation'])||jsonb_build_object(
  'requestId',req.id,'decision',dec.decision,'current',current_review,
  'canRequest',submitter and snap->>'status'='in_review' and not current_review,
  'canDecide',reviewer and current_review and dec.request_id is null and newsroom_private.review_independent(p_story,snap,req.requested_by),
  'history',history);
end;
$fn$;
revoke all on function newsroom_private.read_review_state(uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_review_state(uuid,text) to authenticated;

create function newsroom_private.change_review_state(p_story uuid,p_kind text,p_action text,p_fingerprint text,
 p_request uuid,p_note text,p_command uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=(select auth.uid()); snap jsonb; req newsroom_private.story_review_requests%rowtype;
begin
 if p_action is null or p_action not in ('request','approve','request_changes','reject')
 or p_kind is null or p_kind not in ('draft','revision')
 or p_fingerprint is null or p_fingerprint!~'^[0-9a-f]{64}$'
 or p_command is null or p_note is null or length(btrim(p_note)) not between 12 and 1000
 or p_note~'[[:cntrl:]]' or (p_action='request' and p_request is not null)
 or (p_action<>'request' and p_request is null) then
  raise exception 'Invalid review command' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(202611,2302);
 if actor is null or not coalesce(newsroom_private.review_access(p_story,p_kind,
   case when p_action='request' then 'submit' else 'decide' end),false) then
  raise exception 'Review unavailable' using errcode='42501';end if;
 snap:=newsroom_private.lock_review_snapshot(p_story,p_kind);
 if snap is null or snap->>'status'<>'in_review' or snap->>'fingerprint' is distinct from p_fingerprint then
  raise exception 'Review source changed; reload' using errcode='40001';end if;
 if exists(select 1 from newsroom_private.story_review_requests where command_id=p_command)
 or exists(select 1 from newsroom_private.story_review_decisions where command_id=p_command) then
  raise exception 'Review command already used; reload' using errcode='40001';end if;
 select * into req from newsroom_private.story_review_requests where story_id=p_story and kind=p_kind order by seq desc limit 1;
 if p_action='request' then
  if req.id is not null and req.fingerprint=p_fingerprint and req.generation=(snap->>'generation')::bigint then
   raise exception 'Current review already exists; reload' using errcode='40001';end if;
  insert into newsroom_private.story_review_requests(story_id,kind,revision_id,generation,fingerprint,requested_by,request_note,command_id)
  values(p_story,p_kind,(snap->>'revisionId')::uuid,(snap->>'generation')::bigint,p_fingerprint,actor,btrim(p_note),p_command);
 else
  if req.id is distinct from p_request or req.fingerprint is distinct from p_fingerprint
   or req.generation is distinct from (snap->>'generation')::bigint
   or req.revision_id is distinct from (snap->>'revisionId')::uuid
   or exists(select 1 from newsroom_private.story_review_decisions where request_id=p_request) then
   raise exception 'Review request changed; reload' using errcode='40001';end if;
  if not newsroom_private.review_independent(p_story,snap,req.requested_by) then
   raise exception 'Independent reviewer required' using errcode='42501';end if;
  insert into newsroom_private.story_review_decisions(request_id,decision,decided_by,decision_note,command_id)
  values(req.id,case p_action when 'approve' then 'approved' when 'request_changes' then 'changes_requested' else 'rejected' end,actor,btrim(p_note),p_command);
  -- Approval leaves copy/status intact. Negative decision atomically returns
  -- only the reviewed working copy to draft; never updates a live article.
  if p_action in ('request_changes','reject') then
   if p_kind='revision' then
    update public.story_revisions set status='draft' where id=req.revision_id and story_id=p_story and status='in_review';
   else
    update public.stories set status='draft' where id=p_story and status='in_review';
   end if;
   if not found then raise exception 'Review source changed; reload' using errcode='40001';end if;
  end if;
 end if;
 return newsroom_private.read_review_state(p_story,p_kind);
end;
$fn$;
revoke all on function newsroom_private.change_review_state(uuid,text,text,text,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.change_review_state(uuid,text,text,text,uuid,text,uuid) to authenticated;

-- Current approval helper for the NEXT publisher gate. No caller can use
-- this to publish. CT06c must evaluate under locks and recheck actual media.
create function newsroom_private.has_current_review_approval(p_story uuid,p_kind text)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select exists(select 1 from (select * from newsroom_private.story_review_requests
  where story_id=p_story and kind=p_kind order by seq desc limit 1) q
  join newsroom_private.story_review_decisions d on d.request_id=q.id
  cross join lateral (select newsroom_private.review_snapshot(p_story,p_kind) snap) s
  where d.decision='approved' and s.snap->>'status'='in_review'
   and q.fingerprint=s.snap->>'fingerprint' and q.generation=(s.snap->>'generation')::bigint
   and q.revision_id is not distinct from (s.snap->>'revisionId')::uuid)
$fn$;
revoke all on function newsroom_private.has_current_review_approval(uuid,text) from public,anon,authenticated,service_role;

create function public.staff_read_review(p_story uuid,p_kind text)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_review_state(p_story,p_kind) $fn$;
create function public.staff_change_review(p_story uuid,p_kind text,p_action text,p_fingerprint text,p_request uuid,p_note text,p_command uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.change_review_state(p_story,p_kind,p_action,p_fingerprint,p_request,p_note,p_command) $fn$;
revoke all on function public.staff_read_review(uuid,text),public.staff_change_review(uuid,text,text,text,uuid,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_review(uuid,text),public.staff_change_review(uuid,text,text,text,uuid,text,uuid) to authenticated;
commit;
