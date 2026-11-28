-- CT16 owner-only complete dashboard aggregates; read-only, no grants or production flags.
begin;
create function newsroom_private.read_owner_dashboard(p_mode text)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare v_actor uuid:=(select auth.uid()); v_member uuid; result jsonb;
begin
 if p_mode is null or p_mode not in ('team','personal') then raise exception 'Invalid dashboard mode' using errcode='22023';end if;
 if not coalesce(public.staff_invite_verified_identity(v_actor),false)
 or not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('story.view_all') then raise exception 'Dashboard unavailable' using errcode='42501';end if;
 select m.id into v_member from public.staff_memberships m
 join public.staff_member_roles r on r.membership_id=m.id
 join public.staff_role_presets p on p.id=r.role_preset_id
 where m.auth_user_id=v_actor and m.status='active' and m.member_type='employee'
 and m.expires_at is null and r.expires_at is null and p.role_key='owner';
 if v_member is null then raise exception 'Dashboard unavailable' using errcode='42501';end if;
 with visible as materialized (
   select s.id,s.headline,s.status,s.updated_at from public.stories s
   where newsroom_private.has_staff_permission('story.view_all',s.id)
   and (p_mode='team' or s.author_id=v_actor or s.created_by=v_actor or exists(
     select 1 from public.staff_story_assignments a where a.story_id=s.id and a.membership_id=v_member and a.status='active'))
 ), assignments as (
   select count(*) as total from public.staff_story_assignments a join visible s on s.id=a.story_id
   where a.status='active' and (p_mode='team' and newsroom_private.has_staff_permission('story.assign',s.id)
      or p_mode='personal' and a.membership_id=v_member)
 ), recent as (
   select * from visible order by updated_at desc,id limit 5
 )
 select jsonb_build_object('mode',p_mode,'summary',jsonb_build_object(
   'total',count(*),'drafts',count(*) filter(where status='draft'),
   'inReview',count(*) filter(where status='in_review'),'published',count(*) filter(where status='published'),
   'assignments',(select total from assignments)),
   'items',coalesce((select jsonb_agg(jsonb_build_object('id',id,'headline',headline,'status',status,'updatedAt',updated_at) order by updated_at desc,id) from recent),'[]'::jsonb))
 into result from visible;
 return result;
end;
$fn$;
revoke all on function newsroom_private.read_owner_dashboard(text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_owner_dashboard(text) to authenticated;
create function public.staff_read_owner_dashboard(p_mode text)
returns jsonb language sql stable security invoker set search_path='' as $fn$
 select newsroom_private.read_owner_dashboard(p_mode)
$fn$;
revoke all on function public.staff_read_owner_dashboard(text) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_owner_dashboard(text) to authenticated;
commit;
