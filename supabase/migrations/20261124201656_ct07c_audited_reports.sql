-- CT-07c.1 STAGED ONLY. CLI #45479085415.
begin;
alter table public.comment_reports add column review_revision integer not null default 1 check(review_revision>0),
 add column reported_comment_revision integer check(reported_comment_revision>0);
-- Do not invent a historical reported revision for preexisting reports.
create table newsroom_private.comment_report_events(
 id uuid primary key default gen_random_uuid(),
 command_id uuid not null unique,
 report_id uuid not null,
 comment_id uuid not null,
 story_id uuid not null,
 actor_id uuid not null,
 from_status public.comment_report_status not null,
 to_status public.comment_report_status not null,
 from_revision integer not null,
 to_revision integer not null check(to_revision=from_revision+1),
 comment_revision integer not null,
 reason text not null check(char_length(btrim(reason)) between 12 and 1000),
 moderation_event_id uuid references newsroom_private.comment_moderation_events(id) on delete restrict,
 created_at timestamptz not null default clock_timestamp(),
 check((to_status='actioned')=(moderation_event_id is not null))
);
create index ct07c_report_events_history on newsroom_private.comment_report_events(report_id,to_revision desc);
alter table newsroom_private.comment_report_events enable row level security;
revoke all on newsroom_private.comment_report_events from public,anon,authenticated,service_role;
-- Raw report rows now visible only to their own reader. Moderators use the
-- redacted projection below, including those with report-only capabilities.
drop policy ct07a_reports_staff_read on public.comment_reports;
revoke update,delete on public.comment_reports from authenticated;
create or replace function newsroom_private.guard_comment_report_review()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 if current_user='authenticated' and tg_op='UPDATE' then
  raise exception 'Use audited report resolution' using errcode='42501';end if;
 if current_user='authenticated' and tg_op='INSERT' and
 (new.reporter_id is distinct from (select auth.uid()) or new.status<>'open' or new.reviewed_by is not null or new.reviewed_at is not null) then
  raise exception 'Reports start as unreviewed self-owned submissions' using errcode='42501';end if;
 return new;
end;
$fn$;
-- Capture the actual reported version, never a client-supplied counter.
create function newsroom_private.capture_reported_comment()
returns trigger language plpgsql security definer set search_path=''
as $fn$
declare sid uuid; c public.comments%rowtype;
begin
 select story_id into sid from public.comments where id=new.comment_id;
 perform 1 from public.stories where id=sid and status='published' and published_at<=now() for share;
 if not found then raise exception 'Report target unavailable' using errcode='42501';end if;
 select * into c from public.comments where id=new.comment_id and story_id=sid for share;
 if not found or c.status<>'published' or c.user_id is not distinct from new.reporter_id then
  raise exception 'Report target unavailable' using errcode='42501';end if;
 new.reported_comment_revision:=c.moderation_revision;
 new.review_revision:=1;
 new.created_at:=clock_timestamp();
 return new;
end;
$fn$;
revoke all on function newsroom_private.capture_reported_comment() from public,anon,authenticated,service_role;
create trigger ct07c_capture_report before insert on public.comment_reports for each row execute function newsroom_private.capture_reported_comment();

create function newsroom_private.report_action_event(p_report uuid)
returns uuid language sql stable security invoker set search_path=''
as $fn$
 select e.id from public.comment_reports r join public.comments c on c.id=r.comment_id
 join newsroom_private.comment_moderation_events e on e.comment_id=c.id and e.story_id=c.story_id
 where r.id=p_report and e.from_revision=r.reported_comment_revision
 and e.to_revision=c.moderation_revision and e.action in ('hide','remove')
 and e.to_status=c.status and c.status in ('hidden','deleted') and e.created_at>=r.created_at
 limit 1
$fn$;
revoke all on function newsroom_private.report_action_event(uuid) from public,anon,authenticated,service_role;
create function newsroom_private.report_projection(p_report uuid)
returns jsonb language sql stable security invoker set search_path=''
as $fn$
 select jsonb_build_object('id',r.id,'commentId',c.id,'storyId',s.id,'headline',s.headline,
 'author',coalesce(p.display_name,'Reader'),'body',c.body,'commentStatus',c.status,
 'commentRevision',c.moderation_revision,'reportedRevision',r.reported_comment_revision,
 'reason',r.reason,'status',r.status,'revision',r.review_revision,'createdAt',r.created_at,
 'reviewedAt',r.reviewed_at,'actionEventId',newsroom_private.report_action_event(r.id),
 'canResolve',r.status in ('open','reviewed') and r.reporter_id is distinct from (select auth.uid())
  and c.user_id is distinct from (select auth.uid()))
 from public.comment_reports r join public.comments c on c.id=r.comment_id
 join public.stories s on s.id=c.story_id left join public.reader_public_profiles p on p.id=c.user_id
 where r.id=p_report
$fn$;
revoke all on function newsroom_private.report_projection(uuid) from public,anon,authenticated,service_role;
create function newsroom_private.read_report_queue(p_status text,p_story uuid,p_page integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false) or not newsroom_private.has_staff_permission('newsroom.access') then
  raise exception 'Reports unavailable' using errcode='42501';end if;
 if p_status is null or p_status not in ('all','open','reviewed','dismissed','actioned')
 or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid report filter' using errcode='22023';end if;
 with eligible as materialized(
  select r.id,r.created_at from public.comment_reports r join public.comments c on c.id=r.comment_id
  where newsroom_private.comment_scope_allowed(c.story_id,'reports')
  and (p_story is null or c.story_id=p_story) and (p_status='all' or r.status::text=p_status)
  order by r.created_at desc,r.id desc limit 21 offset p_page*20
 ), numbered as(select *,row_number() over(order by created_at desc,id desc) rn from eligible)
 select jsonb_build_object('items',coalesce(jsonb_agg(newsroom_private.report_projection(id) order by created_at desc,id desc) filter(where rn<=20),'[]'::jsonb),
 'hasMore',count(*)>20 and p_page<100) into result from numbered;
 return result;
end;
$fn$;
create function newsroom_private.read_report_detail(p_report uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare sid uuid; history jsonb;
begin
 select c.story_id into sid from public.comment_reports r join public.comments c on c.id=r.comment_id where r.id=p_report;
 if not found or not newsroom_private.comment_scope_allowed(sid,'reports') then raise exception 'Report unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(entry order by to_revision desc),'[]'::jsonb) into history from(
  select e.to_revision,jsonb_build_object('id',e.id,'fromStatus',e.from_status,'toStatus',e.to_status,
   'revision',e.to_revision,'commentRevision',e.comment_revision,'reason',e.reason,'at',e.created_at,
   'actionEventId',e.moderation_event_id,'byMe',e.actor_id=(select auth.uid())) entry
  from newsroom_private.comment_report_events e where e.report_id=p_report and e.story_id=sid
  order by e.to_revision desc limit 20
 ) h;
 return jsonb_build_object('report',newsroom_private.report_projection(p_report),'history',history);
end;
$fn$;
create function newsroom_private.resolve_comment_report(p_report uuid,p_revision integer,p_comment_revision integer,p_target text,p_reason text,p_event uuid,p_command uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare r public.comment_reports%rowtype; c public.comments%rowtype; cid uuid; sid uuid; actual_event uuid; next_status public.comment_report_status;
begin
 if p_report is null or p_revision is null or p_revision<1 or p_comment_revision is null or p_comment_revision<1
 or p_target is null or p_target not in ('reviewed','dismissed','actioned')
 or p_reason is null or char_length(btrim(p_reason)) not between 12 and 1000 or p_reason~'[[:cntrl:]]'
 or p_command is null or (p_target='actioned') is distinct from (p_event is not null) then
  raise exception 'Invalid report resolution' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select cr.comment_id,co.story_id into cid,sid from public.comment_reports cr join public.comments co on co.id=cr.comment_id where cr.id=p_report;
 if not found or not newsroom_private.comment_scope_allowed(sid,'reports') then raise exception 'Report unavailable' using errcode='42501';end if;
 perform 1 from public.stories where id=sid for share;
 select * into c from public.comments where id=cid and story_id=sid for update;
 if not found then raise exception 'Report unavailable' using errcode='42501';end if;
 select * into r from public.comment_reports where id=p_report and comment_id=cid for update;
 if not found or not newsroom_private.comment_scope_allowed(sid,'reports')
 or r.reporter_id=(select auth.uid()) or c.user_id=(select auth.uid()) then raise exception 'Independent report reviewer required' using errcode='42501';end if;
 if r.review_revision<>p_revision or c.moderation_revision<>p_comment_revision
 or r.status not in ('open','reviewed') or (p_target='reviewed' and r.status<>'open')
 or exists(select 1 from newsroom_private.comment_report_events where command_id=p_command) then raise exception 'Report or comment changed; reload' using errcode='40001';end if;
 if p_target='actioned' then
  actual_event:=newsroom_private.report_action_event(r.id);
  if actual_event is null or actual_event is distinct from p_event then
   raise exception 'Matching current audited moderation action required' using errcode='40001';end if;
 end if;
 next_status:=p_target::public.comment_report_status;
 update public.comment_reports set status=next_status,review_revision=review_revision+1,reviewed_by=(select auth.uid()),reviewed_at=clock_timestamp()
 where id=r.id and review_revision=p_revision;
 if not found then raise exception 'Report changed; reload' using errcode='40001';end if;
 insert into newsroom_private.comment_report_events(command_id,report_id,comment_id,story_id,actor_id,from_status,to_status,from_revision,to_revision,comment_revision,reason,moderation_event_id)
 values(p_command,r.id,c.id,sid,(select auth.uid()),r.status,next_status,p_revision,p_revision+1,c.moderation_revision,btrim(p_reason),actual_event);
 return newsroom_private.read_report_detail(r.id);
end;
$fn$;
revoke all on function newsroom_private.read_report_queue(text,uuid,integer),newsroom_private.read_report_detail(uuid),newsroom_private.resolve_comment_report(uuid,integer,integer,text,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_report_queue(text,uuid,integer),newsroom_private.read_report_detail(uuid),newsroom_private.resolve_comment_report(uuid,integer,integer,text,text,uuid,uuid) to authenticated;
create function public.staff_read_report_queue(p_status text,p_story uuid,p_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_report_queue(p_status,p_story,p_page) $fn$;
create function public.staff_read_report_detail(p_report uuid)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_report_detail(p_report) $fn$;
create function public.staff_resolve_comment_report(p_report uuid,p_revision integer,p_comment_revision integer,p_target text,p_reason text,p_event uuid,p_command uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.resolve_comment_report(p_report,p_revision,p_comment_revision,p_target,p_reason,p_event,p_command) $fn$;
revoke all on function public.staff_read_report_queue(text,uuid,integer),public.staff_read_report_detail(uuid),public.staff_resolve_comment_report(uuid,integer,integer,text,text,uuid,uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_report_queue(text,uuid,integer),public.staff_read_report_detail(uuid),public.staff_resolve_comment_report(uuid,integer,integer,text,text,uuid,uuid) to authenticated;
commit;
