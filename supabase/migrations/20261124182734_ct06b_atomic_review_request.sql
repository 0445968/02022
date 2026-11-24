-- CT-06b.2a staged only. CLI-generated #45459723027.
-- Atomic request from a saved draft, or recovery of existing in_review rows.
begin;
create or replace function newsroom_private.read_review_state(p_story uuid,p_kind text)
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
  'canRequest',submitter and snap->>'status' in ('draft','in_review') and not current_review,
  'canDecide',reviewer and current_review and dec.request_id is null and newsroom_private.review_independent(p_story,snap,req.requested_by),
  'history',history);
end;
$fn$;
create or replace function newsroom_private.change_review_state(p_story uuid,p_kind text,p_action text,p_fingerprint text,
 p_request uuid,p_note text,p_command uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=(select auth.uid()); snap jsonb; req newsroom_private.story_review_requests%rowtype; copy_body jsonb;
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
 if snap is null or (p_action='request' and snap->>'status' not in ('draft','in_review'))
 or (p_action<>'request' and snap->>'status'<>'in_review') or snap->>'fingerprint' is distinct from p_fingerprint then
  raise exception 'Review source changed; reload' using errcode='40001';end if;
 if exists(select 1 from newsroom_private.story_review_requests where command_id=p_command)
 or exists(select 1 from newsroom_private.story_review_decisions where command_id=p_command) then
  raise exception 'Review command already used; reload' using errcode='40001';end if;
 select * into req from newsroom_private.story_review_requests where story_id=p_story and kind=p_kind order by seq desc limit 1;
 if p_action='request' then
  if req.id is not null and req.fingerprint=p_fingerprint and req.generation=(snap->>'generation')::bigint then
   raise exception 'Current review already exists; reload' using errcode='40001';end if;
  -- No content or metadata is taken from the caller. Revalidate the saved
  -- document (restricted editors) and all tagged media before registration.
  if p_kind='revision' then
   select body into copy_body from public.story_revisions where id=(snap->>'revisionId')::uuid and story_id=p_story;
  else
   select body into copy_body from public.stories where id=p_story;
  end if;
  if not newsroom_private.has_staff_permission('story.edit_all',p_story)
    and not newsroom_private.valid_assigned_body(copy_body) then
   raise exception 'Invalid assigned copy' using errcode='22023';end if;
  if not newsroom_private.assigned_inline_media_allowed(p_story,copy_body,copy_body) then
   raise exception 'Attached media no longer eligible' using errcode='22023';end if;
  -- Transition and request insert are in the same database transaction.
  -- Existing in_review rows without a request can be registered safely.
  if snap->>'status'='draft' then
   if p_kind='revision' then
    update public.story_revisions set status='in_review',updated_by=actor
     where id=(snap->>'revisionId')::uuid and story_id=p_story and status='draft';
   else
    update public.stories set status='in_review',updated_by=actor where id=p_story and status='draft';
   end if;
   if not found then raise exception 'Review source changed; reload' using errcode='40001';end if;
   -- The status and epoch changed. Bind approval to the actual final
   -- persisted submitted snapshot, not the preceding draft fingerprint.
   snap:=newsroom_private.review_snapshot(p_story,p_kind);
   p_fingerprint:=snap->>'fingerprint';
  end if;
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
commit;
