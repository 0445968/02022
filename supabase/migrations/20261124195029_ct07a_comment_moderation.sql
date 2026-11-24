-- CT-07a STAGED ONLY. CLI-generated #45474370407.
-- Existing reader ownership/visibility preserved; staff changes require audited RPC.
begin;
alter table public.comments add column moderation_revision integer not null default 1 check(moderation_revision>0);
create table newsroom_private.comment_moderation_events(
 id uuid primary key default gen_random_uuid(),
 command_id uuid not null unique,
 comment_id uuid not null,
 story_id uuid not null,
 actor_id uuid not null,
 action text not null check(action in ('approve','hide','restore','remove')),
 from_status public.comment_status not null,
 to_status public.comment_status not null,
 from_revision integer not null,
 to_revision integer not null check(to_revision=from_revision+1),
 reason text not null check(char_length(btrim(reason)) between 12 and 1000),
 created_at timestamptz not null default clock_timestamp()
);
-- No copied body, email, reporter identity or foreign key that prevents
-- a future reviewed account/story retention cleanup.
create index ct07a_comment_event_history on newsroom_private.comment_moderation_events(comment_id,to_revision desc);
alter table newsroom_private.comment_moderation_events enable row level security;
revoke all on newsroom_private.comment_moderation_events from public,anon,authenticated,service_role;

-- Moderation is a published-story responsibility, not backstage story access.
-- Direct scoped read predicates use only a public-story eligibility boolean.
create function newsroom_private.comment_scope_allowed(p_story uuid,p_action text)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and newsroom_private.has_staff_permission('newsroom.access')
 and exists(select 1 from public.stories s where s.id=p_story and s.status='published' and s.published_at<=now())
 and case p_action
  when 'read' then newsroom_private.has_staff_permission('comment.view_queue',p_story) or newsroom_private.has_staff_permission('comment.moderate',p_story)
  when 'moderate' then newsroom_private.has_staff_permission('comment.moderate',p_story)
  when 'reports' then newsroom_private.has_staff_permission('comment.manage_reports',p_story)
  else false end
$fn$;
revoke all on function newsroom_private.comment_scope_allowed(uuid,text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.comment_scope_allowed(uuid,text) to authenticated;
create function newsroom_private.comment_report_scope_allowed(p_comment uuid)
returns boolean language sql stable security definer set search_path=''
as $fn$
 select exists(select 1 from public.comments c where c.id=p_comment and newsroom_private.comment_scope_allowed(c.story_id,'reports'))
$fn$;
revoke all on function newsroom_private.comment_report_scope_allowed(uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.comment_report_scope_allowed(uuid) to authenticated;

drop policy ct02k_comments_staff_read on public.comments;
create policy ct07a_comments_staff_read on public.comments for select to authenticated
 using(newsroom_private.comment_scope_allowed(story_id,'read'));
drop policy ct02k_comments_moderator_update on public.comments;
drop policy ct02k_comments_moderator_delete on public.comments;
revoke delete on public.comments from authenticated;
drop policy ct02k_reports_staff_read on public.comment_reports;
create policy ct07a_reports_staff_read on public.comment_reports for select to authenticated
 using(newsroom_private.comment_report_scope_allowed(comment_id));
-- No unaudited report disposition while CT07b report workflow is staged.
drop policy ct02k_reports_staff_update on public.comment_reports;
revoke update on public.comment_reports from authenticated;

-- Readers (including staff acting as readers) keep their existing edit and
-- self-erasure paths. The old moderator bypass is deliberately removed.
create or replace function newsroom_private.guard_comment_writes()
returns trigger language plpgsql security invoker set search_path=''
as $ct02k$
begin
 if current_user<>'authenticated' then return new;end if;
 if tg_op='INSERT' then
  if new.user_id is distinct from (select auth.uid()) or new.status<>'pending' or new.created_at is distinct from new.updated_at then
   raise exception 'Comment must be a new pending reader submission' using errcode='42501';end if;
  return new;
 end if;
 if new.id is distinct from old.id or new.story_id is distinct from old.story_id or new.user_id is distinct from old.user_id
 or new.parent_id is distinct from old.parent_id or new.created_at is distinct from old.created_at then
  raise exception 'Comment identity and thread are immutable' using errcode='42501';end if;
 if new.user_id is distinct from (select auth.uid()) or old.status='deleted' then
  raise exception 'Only the owner may edit a nondeleted comment' using errcode='42501';end if;
 if new.status='deleted' and new.body='[deleted]' then return new;end if;
 if new.status='pending' and char_length(btrim(new.body)) between 1 and 5000 then return new;end if;
 raise exception 'Reader cannot publish, revive or hide a comment' using errcode='42501';
end;
$ct02k$;
create function newsroom_private.bump_comment_moderation_revision()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
 new.moderation_revision:=case when tg_op='INSERT' then 1 else old.moderation_revision+1 end;
 if tg_op='UPDATE' then new.updated_at:=clock_timestamp();end if;
 return new;
end;
$fn$;
revoke all on function newsroom_private.bump_comment_moderation_revision() from public,anon,authenticated,service_role;
create trigger ct07a_comment_revision before insert or update on public.comments for each row execute function newsroom_private.bump_comment_moderation_revision();

create function newsroom_private.comment_moderation_projection(p_comment uuid)
returns jsonb language sql stable security invoker set search_path=''
as $fn$
 select jsonb_build_object('id',c.id,'storyId',c.story_id,'headline',s.headline,'parentId',c.parent_id,
  'author',coalesce(p.display_name,'Reader'),'body',c.body,'status',c.status,'revision',c.moderation_revision,
  'createdAt',c.created_at,'updatedAt',c.updated_at,'canModerate',c.user_id is distinct from (select auth.uid()) and newsroom_private.comment_scope_allowed(c.story_id,'moderate'),
  'openReports',case when newsroom_private.comment_scope_allowed(c.story_id,'reports') then
   (select count(*) from public.comment_reports r where r.comment_id=c.id and r.status='open') else null end)
 from public.comments c join public.stories s on s.id=c.story_id
 left join public.reader_public_profiles p on p.id=c.user_id
 where c.id=p_comment
$fn$;
revoke all on function newsroom_private.comment_moderation_projection(uuid) from public,anon,authenticated,service_role;

create function newsroom_private.read_comment_moderation_queue(p_status text,p_story uuid,p_search text,p_page integer)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false) or not newsroom_private.has_staff_permission('newsroom.access') then
  raise exception 'Moderation unavailable' using errcode='42501';end if;
 if p_status is null or p_status not in ('all','pending','published','hidden','deleted','reported')
 or p_page is null or p_page not between 0 and 100 or p_search is null or char_length(p_search)>120 then
  raise exception 'Invalid moderation filter' using errcode='22023';end if;
 with candidates as materialized(
  select c.id,c.created_at from public.comments c join public.stories s on s.id=c.story_id
  left join public.reader_public_profiles p on p.id=c.user_id
  where newsroom_private.comment_scope_allowed(c.story_id,'read')
   and (p_story is null or c.story_id=p_story)
   and (p_status='all' or c.status::text=p_status or (p_status='reported'
      and newsroom_private.comment_scope_allowed(c.story_id,'reports')
      and exists(select 1 from public.comment_reports r where r.comment_id=c.id and r.status='open')))
   and (p_search='' or strpos(lower(c.body),lower(p_search))>0 or strpos(lower(s.headline),lower(p_search))>0
    or strpos(lower(coalesce(p.display_name,'')),lower(p_search))>0)
  order by c.created_at desc,c.id desc limit 21 offset p_page*20
 ), numbered as(select *,row_number() over(order by created_at desc,id desc) rn from candidates)
 select jsonb_build_object('items',coalesce(jsonb_agg(newsroom_private.comment_moderation_projection(id) order by created_at desc,id desc) filter(where rn<=20),'[]'::jsonb),
  'hasMore',count(*)>20 and p_page<100) into result from numbered;
 return result;
end;
$fn$;
create function newsroom_private.read_comment_moderation_detail(p_comment uuid)
returns jsonb language plpgsql stable security definer set search_path=''
as $fn$
declare c public.comments%rowtype; history jsonb;
begin
 select * into c from public.comments where id=p_comment;
 if not found or not newsroom_private.comment_scope_allowed(c.story_id,'read') then
  raise exception 'Moderation unavailable' using errcode='42501';end if;
 select coalesce(jsonb_agg(entry order by to_revision desc),'[]'::jsonb) into history from(
  select e.to_revision,jsonb_build_object('id',e.id,'action',e.action,'fromStatus',e.from_status,'toStatus',e.to_status,
   'revision',e.to_revision,'reason',e.reason,'at',e.created_at,'byMe',e.actor_id=(select auth.uid())) entry
  from newsroom_private.comment_moderation_events e where e.comment_id=c.id and e.story_id=c.story_id
  order by e.to_revision desc limit 20
 ) h;
 return jsonb_build_object('comment',newsroom_private.comment_moderation_projection(c.id),'history',history);
end;
$fn$;

create function newsroom_private.change_comment_moderation(p_comment uuid,p_revision integer,p_action text,p_reason text,p_command uuid)
returns jsonb language plpgsql security definer set search_path=''
as $fn$
declare c public.comments%rowtype; changed public.comments%rowtype; target public.comment_status; sid uuid;
begin
 if p_comment is null or p_revision is null or p_revision<1 or p_command is null or p_action is null
 or p_action not in ('approve','hide','restore','remove') or p_reason is null
 or char_length(btrim(p_reason)) not between 12 and 1000 or p_reason~'[[:cntrl:]]' then
  raise exception 'Invalid moderation command' using errcode='22023';end if;
 perform pg_advisory_xact_lock(202611,2302);
 select story_id into sid from public.comments where id=p_comment;
 if not found or not newsroom_private.comment_scope_allowed(sid,'moderate') then
  raise exception 'Moderation unavailable' using errcode='42501';end if;
 -- Hold parent publication state while deciding; comment row CAS protects
 -- concurrent reader editing and erasure.
 perform 1 from public.stories where id=sid for share;
 select * into c from public.comments where id=p_comment and story_id=sid for update;
 if not found or not newsroom_private.comment_scope_allowed(sid,'moderate') or c.user_id=(select auth.uid()) then
  raise exception 'Moderation unavailable' using errcode='42501';end if;
 if c.moderation_revision<>p_revision or exists(select 1 from newsroom_private.comment_moderation_events where command_id=p_command) then
  raise exception 'Comment changed; reload' using errcode='40001';end if;
 target:=case
  when p_action='approve' and c.status='pending' then 'published'::public.comment_status
  when p_action='hide' and c.status in ('pending','published') then 'hidden'::public.comment_status
  when p_action='restore' and c.status='hidden' then 'pending'::public.comment_status
  when p_action='remove' and c.status in ('pending','published','hidden') then 'deleted'::public.comment_status
  else null end;
 if target is null then raise exception 'Invalid comment transition' using errcode='40001';end if;
 -- Removal redacts the stored text, as reader self-deletion does. Hide is
 -- the reversible option. Do not retain original text in audit.
 update public.comments set status=target,body=case when target='deleted' then '[deleted]' else c.body end
 where id=c.id and moderation_revision=p_revision returning * into changed;
 if not found then raise exception 'Comment changed; reload' using errcode='40001';end if;
 insert into newsroom_private.comment_moderation_events(command_id,comment_id,story_id,actor_id,action,from_status,to_status,from_revision,to_revision,reason)
 values(p_command,c.id,c.story_id,(select auth.uid()),p_action,c.status,changed.status,c.moderation_revision,changed.moderation_revision,btrim(p_reason));
 return newsroom_private.read_comment_moderation_detail(c.id);
end;
$fn$;
revoke all on function newsroom_private.read_comment_moderation_queue(text,uuid,text,integer),newsroom_private.read_comment_moderation_detail(uuid),newsroom_private.change_comment_moderation(uuid,integer,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_comment_moderation_queue(text,uuid,text,integer),newsroom_private.read_comment_moderation_detail(uuid),newsroom_private.change_comment_moderation(uuid,integer,text,text,uuid) to authenticated;
create function public.staff_read_comment_queue(p_status text,p_story uuid,p_search text,p_page integer)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_comment_moderation_queue(p_status,p_story,p_search,p_page) $fn$;
create function public.staff_read_comment_detail(p_comment uuid)
returns jsonb language sql stable security invoker set search_path=''
as $fn$ select newsroom_private.read_comment_moderation_detail(p_comment) $fn$;
create function public.staff_change_comment_moderation(p_comment uuid,p_revision integer,p_action text,p_reason text,p_command uuid)
returns jsonb language sql security invoker set search_path=''
as $fn$ select newsroom_private.change_comment_moderation(p_comment,p_revision,p_action,p_reason,p_command) $fn$;
revoke all on function public.staff_read_comment_queue(text,uuid,text,integer),public.staff_read_comment_detail(uuid),public.staff_change_comment_moderation(uuid,integer,text,text,uuid) from public,anon,authenticated,service_role;
grant execute on function public.staff_read_comment_queue(text,uuid,text,integer),public.staff_read_comment_detail(uuid),public.staff_change_comment_moderation(uuid,integer,text,text,uuid) to authenticated;
commit;
