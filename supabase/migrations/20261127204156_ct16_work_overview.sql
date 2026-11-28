-- CT16 R2b.4 staged read-only picker/overview projections. No new grants or writes.
begin;
create function newsroom_private.lookup_work_assignment_options(p_kind text,p_query text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare member uuid:=newsroom_private.work_actor(); q text; items jsonb; more boolean;
begin
 if member is null or not newsroom_private.work_permission(member,'assignment.view_team',false)
 or not newsroom_private.work_permission(member,'assignment.manage',false) then raise exception 'Assignment options unavailable' using errcode='42501';end if;
 if p_kind is null or p_kind not in ('article','member') or p_query is null or length(p_query)>160 or p_query~'[[:cntrl:]]'
 or p_page is null or p_page not between 0 and 100 then raise exception 'Invalid lookup' using errcode='22023';end if;
 q:=lower(btrim(p_query));
 if p_kind='article' then
  with visible as (
   select s.id,s.headline label from public.stories s
   where (q='' or strpos(lower(s.headline),q)>0 or strpos(lower(s.slug),q)>0)
   and newsroom_private.work_can_view_story(s.id)
   order by s.updated_at desc,s.id limit 26 offset p_page*25
  ), numbered as (select v.*,row_number() over() rn from visible v)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',label) order by rn) filter(where rn<=25),'[]'::jsonb),count(*)>25 and p_page<100 into items,more from numbered;
 else
  with visible as (
   select m.id,coalesce(nullif(left(btrim(p.name),120),''),'Staff '||left(m.id::text,8)) label
   from public.staff_memberships m left join public.profiles p on p.id=m.auth_user_id
   where newsroom_private.work_permission(m.id,'assignment.view_assigned',true)
   and (q='' or strpos(lower(coalesce(p.name,'')),q)>0)
   order by coalesce(p.name,''),m.id limit 26 offset p_page*25
  ), numbered as (select v.*,row_number() over() rn from visible v)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'name',label) order by rn) filter(where rn<=25),'[]'::jsonb),count(*)>25 and p_page<100 into items,more from numbered;
 end if;
 return jsonb_build_object('kind',p_kind,'items',items,'hasMore',more);
end;$fn$;
-- Exact totals across authorized assignments, independent of visible page.
-- Dates are real timestamptz bounds, not caller-supplied now.
create function newsroom_private.read_work_assignment_overview(p_mode text,p_start timestamptz,p_end timestamptz,p_attention boolean,p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare member uuid:=newsroom_private.work_actor(); as_of timestamptz:=statement_timestamp(); counts jsonb; items jsonb; more boolean;
begin
 if member is null then raise exception 'Assignments unavailable' using errcode='42501';end if;
 if p_mode is null or p_mode not in ('team','personal') or p_attention is null or p_page is null or p_page not between 0 and 100
 or (p_start is null)<>(p_end is null) or (p_start is not null and (not isfinite(p_start) or not isfinite(p_end) or p_end<=p_start or p_end-p_start>interval '93 days'))
 or (p_attention and p_start is not null) then raise exception 'Invalid overview range' using errcode='22023';end if;
 if (p_mode='team' and not newsroom_private.work_permission(member,'assignment.view_team',false))
 or (p_mode='personal' and not newsroom_private.work_permission(member,'assignment.view_assigned',true)) then raise exception 'Assignment scope unavailable' using errcode='42501';end if;
 with visible as materialized (
  select a.id,a.title,a.activity,a.priority,a.status,a.due_at from newsroom_private.work_assignments a
  where p_mode='team' or exists(select 1 from newsroom_private.work_assignment_members am where am.assignment_id=a.id and am.membership_id=member)
 ), active as (
  select * from visible where status in ('assigned','in_progress','blocked')
 ), matching as (
  select * from active where due_at is not null and
   (case when p_attention then due_at<=as_of+interval '48 hours'
     when p_start is not null then due_at>=p_start and due_at<p_end else true end)
  order by due_at,id limit 51 offset p_page*50
 ), numbered as (select m.*,row_number() over(order by due_at,id) rn from matching m)
 select
  (select jsonb_build_object('total',count(*),'active',count(*) filter(where status in ('assigned','in_progress','blocked')),
   'blocked',count(*) filter(where status='blocked'),'completed',count(*) filter(where status='completed'),
   'overdue',count(*) filter(where status in ('assigned','in_progress','blocked') and due_at<as_of),
   'dueSoon',count(*) filter(where status in ('assigned','in_progress','blocked') and due_at>=as_of and due_at<=as_of+interval '48 hours')) from visible),
  coalesce(jsonb_agg(jsonb_build_object('id',id,'title',title,'activity',activity,'priority',priority,'status',status,'dueAt',due_at) order by rn) filter(where rn<=50),'[]'::jsonb),
  count(*)>50 and p_page<100 into counts,items,more from numbered;
 return jsonb_build_object('mode',p_mode,'asOf',as_of,'counts',counts,'items',items,'hasMore',more);
end;$fn$;
revoke all on function newsroom_private.lookup_work_assignment_options(text,text,integer),newsroom_private.read_work_assignment_overview(text,timestamptz,timestamptz,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.lookup_work_assignment_options(text,text,integer),newsroom_private.read_work_assignment_overview(text,timestamptz,timestamptz,boolean,integer) to authenticated;
create function public.staff_lookup_work_assignment_options(p_kind text,p_query text,p_page integer)
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.lookup_work_assignment_options(p_kind,p_query,p_page) $fn$;
create function public.staff_read_work_assignment_overview(p_mode text,p_start timestamptz,p_end timestamptz,p_attention boolean,p_page integer)
returns jsonb language sql stable security invoker set search_path='' as $fn$ select newsroom_private.read_work_assignment_overview(p_mode,p_start,p_end,p_attention,p_page) $fn$;
revoke all on function public.staff_lookup_work_assignment_options(text,text,integer),public.staff_read_work_assignment_overview(text,timestamptz,timestamptz,boolean,integer) from public,anon,authenticated,service_role;
grant execute on function public.staff_lookup_work_assignment_options(text,text,integer),public.staff_read_work_assignment_overview(text,timestamptz,timestamptz,boolean,integer) to authenticated;
commit;
