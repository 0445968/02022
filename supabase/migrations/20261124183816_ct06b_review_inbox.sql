-- CT-06b.2b STAGED ONLY. CLI #45461576834.
-- Derive inbox entries from immutable review history; no duplicate event fanout.
begin;
create table newsroom_private.review_feedback_receipts(
 request_id uuid primary key references newsroom_private.story_review_requests(id) on delete restrict,
 reader_id uuid not null,
 read_at timestamptz not null default clock_timestamp()
);
alter table newsroom_private.review_feedback_receipts enable row level security;
revoke all on newsroom_private.review_feedback_receipts from public,anon,authenticated,service_role;
create index ct06b_requester_feedback on newsroom_private.story_review_requests(requested_by,seq desc);
-- Receipt ownership derives from the original requester, not arbitrary recipients.
-- Restrict notifications to the still-accessible working source; a discarded
-- revision or published/archived draft has no review page and is omitted.
create function newsroom_private.review_feedback_allowed(p_request uuid)
returns boolean language sql stable security invoker set search_path=''
as $fn$
 select exists(select 1 from newsroom_private.story_review_requests q
  join newsroom_private.story_review_decisions d on d.request_id=q.id
  join public.stories s on s.id=q.story_id
  where q.id=p_request and q.requested_by=(select auth.uid())
  and newsroom_private.review_access(q.story_id,q.kind,'submit')
  and ((q.kind='draft' and s.status in ('draft','in_review','scheduled'))
   or (q.kind='revision' and s.status='published' and exists(select 1 from public.story_revisions r
     where r.story_id=q.story_id and r.id=q.revision_id))))
$fn$;
revoke all on function newsroom_private.review_feedback_allowed(uuid) from public,anon,authenticated,service_role;
create function newsroom_private.read_review_inbox(p_mode text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid()))
 and newsroom_private.has_staff_permission('newsroom.access'),false) then
   raise exception 'Review inbox unavailable' using errcode='42501';end if;
 if p_mode is null or p_mode not in ('pending','feedback','unread') or p_page is null or p_page not between 0 and 100 then
   raise exception 'Invalid inbox page' using errcode='22023';end if;
 if p_mode='pending' then
  -- Check current authorization BEFORE computing any fingerprints. Only
  -- latest requests with unchanged generation, exact copy and no decision.
  with latest as materialized(
    select distinct on(q.story_id,q.kind) q.* from newsroom_private.story_review_requests q
    order by q.story_id,q.kind,q.seq desc
  ), allowed as materialized(
    select q.* from latest q left join newsroom_private.story_review_epochs e on e.story_id=q.story_id
    where q.generation=coalesce(e.generation,0)
    and not exists(select 1 from newsroom_private.story_review_decisions d where d.request_id=q.id)
    and newsroom_private.review_access(q.story_id,q.kind,'decide')
  ), snapshots as materialized(
    select q.*,newsroom_private.review_snapshot(q.story_id,q.kind) snap from allowed q
  ), page as(
    select q.seq,jsonb_build_object('id',q.id,'storyId',q.story_id,'kind',q.kind,
     'headline',q.snap->>'headline','at',q.created_at,'note',q.request_note,
     'decision',null,'readAt',null) entry
    from snapshots q
    where q.snap->>'status'='in_review' and q.fingerprint=q.snap->>'fingerprint'
    and q.revision_id is not distinct from (q.snap->>'revisionId')::uuid
    and newsroom_private.review_independent(q.story_id,q.snap,q.requested_by)
    order by q.seq desc limit 26 offset p_page*25
  ), numbered as(select *,row_number() over(order by seq desc) rn from page)
  select jsonb_build_object('items',coalesce(jsonb_agg(entry order by seq desc) filter(where rn<=25),'[]'::jsonb),
   'hasMore',count(*)>25 and p_page<100) into result from numbered;
 else
  -- Filter scope/recipient/read status before pagination. No global counts.
  with page as(
    select q.seq,d.decided_at at,jsonb_build_object('id',q.id,'storyId',q.story_id,'kind',q.kind,
     'headline',case when q.kind='revision' then r.headline else s.headline end,
     'at',d.decided_at,'note',d.decision_note,'decision',d.decision,'readAt',rr.read_at) entry
    from newsroom_private.story_review_requests q join newsroom_private.story_review_decisions d on d.request_id=q.id
    join public.stories s on s.id=q.story_id left join public.story_revisions r on r.id=q.revision_id and r.story_id=q.story_id
    left join newsroom_private.review_feedback_receipts rr on rr.request_id=q.id and rr.reader_id=(select auth.uid())
    where q.requested_by=(select auth.uid()) and newsroom_private.review_feedback_allowed(q.id)
      and (p_mode<>'unread' or rr.read_at is null)
    order by d.decided_at desc,q.seq desc limit 26 offset p_page*25
  ), numbered as(select *,row_number() over(order by at desc,seq desc) rn from page)
  select jsonb_build_object('items',coalesce(jsonb_agg(entry order by at desc,seq desc) filter(where rn<=25),'[]'::jsonb),
   'hasMore',count(*)>25 and p_page<100) into result from numbered;
 end if;
 return result;
end;
$fn$;
create function newsroom_private.acknowledge_review_feedback(p_request uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare stamp timestamptz;
begin
 -- Serialize with staff grant/assignment lifecycle changes, then recheck.
 perform pg_catalog.pg_advisory_xact_lock(202611,2302);
 if p_request is null or not coalesce(newsroom_private.review_feedback_allowed(p_request),false) then
  raise exception 'Feedback unavailable' using errcode='42501';end if;
 insert into newsroom_private.review_feedback_receipts(request_id,reader_id) values(p_request,(select auth.uid()))
 on conflict(request_id) do nothing;
 select read_at into stamp from newsroom_private.review_feedback_receipts where request_id=p_request and reader_id=(select auth.uid());
 if stamp is null then raise exception 'Feedback unavailable' using errcode='42501';end if;
 return jsonb_build_object('id',p_request,'readAt',stamp);
end;
$fn$;
revoke all on function newsroom_private.read_review_inbox(text,integer),newsroom_private.acknowledge_review_feedback(uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_review_inbox(text,integer),newsroom_private.acknowledge_review_feedback(uuid) to authenticated;
create function public.staff_read_review_inbox(p_mode text,p_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_review_inbox(p_mode,p_page) $fn$;
create function public.staff_acknowledge_review_feedback(p_request uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.acknowledge_review_feedback(p_request) $fn$;
revoke all on function public.staff_read_review_inbox(text,integer),public.staff_acknowledge_review_feedback(uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_review_inbox(text,integer),public.staff_acknowledge_review_feedback(uuid) to authenticated;
commit;
