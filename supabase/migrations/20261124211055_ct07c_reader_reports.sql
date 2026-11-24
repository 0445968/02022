-- CT-07c.2b STAGED ONLY. CLI #45488346277.
begin;
-- Replace raw reader report access with narrowly projected own-report RPCs.
-- Underlying ownership RLS remains defense in depth.
revoke all on public.comment_reports from public,anon,authenticated;
revoke select(id,comment_id,reporter_id,reason,status,reviewed_by,reviewed_at,created_at,review_revision,reported_comment_revision),
 insert(id,comment_id,reporter_id,reason,status,reviewed_by,reviewed_at,created_at,review_revision,reported_comment_revision),
 update(id,comment_id,reporter_id,reason,status,reviewed_by,reviewed_at,created_at,review_revision,reported_comment_revision)
 on public.comment_reports from public,anon,authenticated;
create index ct07c_reader_report_history on public.comment_reports(reporter_id,created_at desc,id desc);
create function newsroom_private.reader_report_projection(p_report uuid)
returns jsonb language sql stable security invoker set search_path=''
as $fn$
 select jsonb_build_object('id',r.id,'commentId',r.comment_id,'reason',r.reason,'status',r.status,'createdAt',r.created_at,'reviewedAt',r.reviewed_at)
 from public.comment_reports r where r.id=p_report and r.reporter_id=(select auth.uid())
$fn$;
revoke all on function newsroom_private.reader_report_projection(uuid) from public,anon,authenticated,service_role;
create function newsroom_private.reader_submit_report(p_story uuid,p_comment uuid,p_updated_at timestamptz,p_reason text)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare actor uuid:=(select auth.uid()); c public.comments%rowtype; rid uuid; duplicate boolean;
begin
 if not coalesce(public.staff_invite_verified_identity(actor),false) then raise exception 'Verified reader required' using errcode='42501';end if;
 if p_story is null or p_comment is null or p_updated_at is null or not isfinite(p_updated_at)
 or p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 or p_reason~'[[:cntrl:]]' then
  raise exception 'Invalid report' using errcode='22023';end if;
 -- Recover a previously submitted report, even if its target has since
 -- been hidden or unpublished. Only the same reader and exact story/comment.
 select r.id into rid from public.comment_reports r join public.comments co on co.id=r.comment_id
 where r.reporter_id=actor and r.comment_id=p_comment and co.story_id=p_story;
 if found then return jsonb_build_object('report',newsroom_private.reader_report_projection(rid),'alreadyReported',true);end if;
 perform 1 from public.stories where id=p_story and status='published' and published_at<=now() for share;
 if not found then raise exception 'Report target unavailable' using errcode='42501';end if;
 select * into c from public.comments where id=p_comment and story_id=p_story for update;
 if not found or c.status<>'published' or c.user_id is not distinct from actor then
  raise exception 'Report target unavailable' using errcode='42501';end if;
 -- Repeat duplicate lookup after serializing concurrent submissions.
 select id into rid from public.comment_reports where comment_id=p_comment and reporter_id=actor;
 if found then return jsonb_build_object('report',newsroom_private.reader_report_projection(rid),'alreadyReported',true);end if;
 if c.updated_at is distinct from p_updated_at then
  raise exception 'Comment changed; refresh article' using errcode='40001';end if;
 insert into public.comment_reports(comment_id,reporter_id,reason) values(p_comment,actor,btrim(p_reason))
 on conflict(comment_id,reporter_id) do nothing returning id into rid;
 duplicate:=not found;
 if duplicate then select id into rid from public.comment_reports where comment_id=p_comment and reporter_id=actor;end if;
 if rid is null then raise exception 'Report changed; check history' using errcode='40001';end if;
 return jsonb_build_object('report',newsroom_private.reader_report_projection(rid),'alreadyReported',duplicate);
end;
$fn$;
create function newsroom_private.reader_own_reports(p_page integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false) then raise exception 'Verified reader required' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 with page as(select id,created_at from public.comment_reports where reporter_id=(select auth.uid())
  order by created_at desc,id desc limit 21 offset p_page*20),
 numbered as(select *,row_number() over(order by created_at desc,id desc) rn from page)
 select jsonb_build_object('items',coalesce(jsonb_agg(newsroom_private.reader_report_projection(id) order by created_at desc,id desc) filter(where rn<=20),'[]'::jsonb),
 'hasMore',count(*)>20 and p_page<100) into result from numbered;
 return result;
end;
$fn$;
revoke all on function newsroom_private.reader_submit_report(uuid,uuid,timestamptz,text),newsroom_private.reader_own_reports(integer) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.reader_submit_report(uuid,uuid,timestamptz,text),newsroom_private.reader_own_reports(integer) to authenticated;
create function public.reader_submit_comment_report(p_story uuid,p_comment uuid,p_updated_at timestamptz,p_reason text)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.reader_submit_report(p_story,p_comment,p_updated_at,p_reason) $fn$;
create function public.reader_list_own_reports(p_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.reader_own_reports(p_page) $fn$;
revoke all on function public.reader_submit_comment_report(uuid,uuid,timestamptz,text),public.reader_list_own_reports(integer) from public,anon,authenticated,service_role;
grant execute on function public.reader_submit_comment_report(uuid,uuid,timestamptz,text),public.reader_list_own_reports(integer) to authenticated;
commit;
