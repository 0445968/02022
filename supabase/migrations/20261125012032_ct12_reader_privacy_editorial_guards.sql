-- CT11c/CT12 staged only; CLI filename generated in #45524957221.
-- Coordinated cutover with account/public media UI. No live deletion, mail or grants.
begin;
-- Legacy self-edit of name/locale remains for sign-up and compatibility. No client
-- can change mirrored email, verification, roles, arbitrary avatar URL or display name.
revoke insert,update,delete,truncate on public.profiles from public,anon,authenticated;
revoke update(id,email,email_verified,is_author,is_editor,editorial_title,image,display_name,created_at,updated_at) on public.profiles from public,anon,authenticated;
grant update(name,preferred_locale) on public.profiles to authenticated;
create policy ct12_profile_self_guard on public.profiles as restrictive for update to authenticated
using(id=(select auth.uid())) with check(id=(select auth.uid()));
create function newsroom_private.sync_reader_auth_email()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 update public.profiles set email=new.email,email_verified=new.email_confirmed_at where id=new.id;
 return new;
end;$fn$;
revoke all on function newsroom_private.sync_reader_auth_email() from public,anon,authenticated,service_role;
create trigger ct12_sync_auth_email after update of email,email_confirmed_at on auth.users
for each row when(old.email is distinct from new.email or old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function newsroom_private.sync_reader_auth_email();

create table newsroom_private.reader_privacy_requests(
 id uuid primary key default gen_random_uuid(),
 account_id uuid references auth.users(id) on delete set null,
 kind text not null check(kind in ('export','delete')),
 status text not null default 'pending' check(status in ('pending','reviewing','cancelled','fulfilled','declined')),
 created_at timestamptz not null default clock_timestamp(),
 updated_at timestamptz not null default clock_timestamp(),
 reviewed_by uuid,
 resolution text check(resolution in ('completed_externally','retention_required','identity_not_verified','withdrawn')),
 check(account_id is not null or status in ('reviewing','fulfilled','declined','cancelled'))
);
create unique index ct12_one_open_privacy_request on newsroom_private.reader_privacy_requests(account_id,kind) where status in ('pending','reviewing');
create index ct12_privacy_queue on newsroom_private.reader_privacy_requests(status,created_at,id);
create table newsroom_private.reader_privacy_events(
 id bigint generated always as identity primary key,
 request_id uuid not null references newsroom_private.reader_privacy_requests(id) on delete restrict,
 actor uuid not null,
 action text not null check(action in ('request','cancel','review','fulfill','decline')),
 occurred_at timestamptz not null default clock_timestamp()
);
alter table newsroom_private.reader_privacy_requests enable row level security;
alter table newsroom_private.reader_privacy_events enable row level security;
revoke all on newsroom_private.reader_privacy_requests,newsroom_private.reader_privacy_events from public,anon,authenticated,service_role;

create function newsroom_private.reader_account_allowed()
returns boolean language sql stable security invoker set search_path='' as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and exists(select 1 from public.profiles where id=(select auth.uid()))
$fn$;
create function newsroom_private.read_reader_account()
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare result jsonb;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Account unavailable' using errcode='42501';end if;
 select jsonb_build_object('displayName',coalesce(nullif(btrim(p.display_name),''),'Reader'),'locale',p.preferred_locale,'image',p.image,'email',u.email,'emailVerified',u.email_confirmed_at is not null,'updatedAt',p.updated_at,
 'requests',coalesce((select jsonb_agg(jsonb_build_object('id',q.id,'kind',q.kind,'status',q.status,'createdAt',q.created_at,'updatedAt',q.updated_at) order by q.created_at desc,q.id) from (select * from newsroom_private.reader_privacy_requests where account_id=p.id order by created_at desc,id limit 20) q),'[]'::jsonb))
 into result from public.profiles p join auth.users u on u.id=p.id where p.id=(select auth.uid());
 return result;
end;$fn$;
create function newsroom_private.save_reader_account(p_expected timestamptz,p_name text,p_locale text,p_avatar text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Account unavailable' using errcode='42501';end if;
 if p_expected is null or not isfinite(p_expected) or p_name is null or char_length(btrim(p_name)) not between 1 and 80 or p_name~'[[:cntrl:]]'
 or p_locale is null or p_locale not in ('en','es') or p_avatar is null or p_avatar not in ('keep','initials','ocean','sun','island') then raise exception 'Invalid profile' using errcode='22023';end if;
 update public.profiles set display_name=btrim(p_name),preferred_locale=p_locale,
 image=case when p_avatar='keep' then image when p_avatar='initials' then null else '/avatars/reader-'||p_avatar||'.svg' end,
 updated_at=clock_timestamp() where id=actor and updated_at=p_expected;
 if not found then raise exception 'Profile changed' using errcode='40001';end if;
 return newsroom_private.read_reader_account();
end;$fn$;
create function newsroom_private.change_reader_privacy(p_action text,p_kind text,p_id uuid,p_confirmation text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());v_id uuid;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Account unavailable' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,120026));
 if p_action='request' and p_kind in ('export','delete') and p_id is null
 and p_confirmation=case when p_kind='delete' then 'DELETE' else 'EXPORT' end then
  select id into v_id from newsroom_private.reader_privacy_requests where account_id=actor and kind=p_kind and status in ('pending','reviewing');
  if v_id is not null then return newsroom_private.read_reader_account();end if;
  if exists(select 1 from newsroom_private.reader_privacy_requests where account_id=actor and kind=p_kind and created_at>clock_timestamp()-interval '24 hours') then raise exception 'Request limit' using errcode='40001';end if;
  insert into newsroom_private.reader_privacy_requests(account_id,kind) values(actor,p_kind) returning id into v_id;
 elsif p_action='cancel' and p_kind is null and p_id is not null and p_confirmation='CANCEL' then
  update newsroom_private.reader_privacy_requests set status='cancelled',updated_at=clock_timestamp(),resolution='withdrawn'
  where id=p_id and account_id=actor and status='pending' returning id into v_id;
  if v_id is null then raise exception 'Request unavailable' using errcode='40001';end if;
 else raise exception 'Invalid request' using errcode='22023';end if;
 insert into newsroom_private.reader_privacy_events(request_id,actor,action) values(v_id,actor,p_action);
 return newsroom_private.read_reader_account();
end;$fn$;

-- Minimal data export: own fields only, bounded snapshot (200 per category).
-- Full/older data, staff records and provider billing require reviewed export request.
create function newsroom_private.export_reader_snapshot()
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());account jsonb;b jsonb;c jsonb;r jsonb;v jsonb;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Account unavailable' using errcode='42501';end if;
 account:=newsroom_private.read_reader_account();
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into b from
 (select id,story_id,created_at from public.bookmarks where user_id=actor order by created_at desc,id limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into c from
 (select id,story_id,body,status,created_at,updated_at from public.comments where user_id=actor order by created_at desc,id limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.id),'[]'::jsonb) into r from
 (select id,comment_id,reason,status,created_at,reviewed_at from public.comment_reports where reporter_id=actor order by created_at desc,id limit 200) x;
 select coalesce(jsonb_agg(to_jsonb(x) order by x.created_at desc,x.poll_id),'[]'::jsonb) into v from
 (select poll_id,choice,created_at from newsroom_private.poll_votes where voter_id=actor order by created_at desc,poll_id limit 200) x;
 return jsonb_build_object('generatedAt',statement_timestamp(),'scope','reader_snapshot_v1','account',account,'bookmarks',b,'comments',c,'reports',r,'pollVotes',v,
 'truncated',jsonb_build_object('bookmarks',exists(select 1 from public.bookmarks where user_id=actor offset 200 limit 1),'comments',exists(select 1 from public.comments where user_id=actor offset 200 limit 1),'reports',exists(select 1 from public.comment_reports where reporter_id=actor offset 200 limit 1),'pollVotes',exists(select 1 from newsroom_private.poll_votes where voter_id=actor offset 200 limit 1)));
end;$fn$;
create function newsroom_private.privacy_owner_allowed()
returns boolean language sql stable security invoker set search_path='' as $fn$
 select coalesce(public.staff_invite_verified_identity((select auth.uid())),false)
 and newsroom_private.has_staff_permission('newsroom.access')
 and newsroom_private.has_staff_permission('team.view_audit')
 and exists(select 1 from public.staff_memberships m join public.staff_member_roles mr on mr.membership_id=m.id
 join public.staff_role_presets p on p.id=mr.role_preset_id where m.auth_user_id=(select auth.uid()) and m.status='active'
 and m.member_type='employee' and m.expires_at is null and mr.expires_at is null and p.role_key='owner')
$fn$;
create function newsroom_private.read_privacy_queue(p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare result jsonb;
begin
 if not newsroom_private.privacy_owner_allowed() then raise exception 'Queue unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 with rows as (select q.id,q.account_id,q.kind,q.status,q.created_at,q.updated_at,u.email from newsroom_private.reader_privacy_requests q
 left join auth.users u on u.id=q.account_id where q.status in ('pending','reviewing') order by q.created_at,q.id limit 21 offset p_page*20),
 ordered as (select *,row_number() over(order by created_at,id) rn from rows)
 select jsonb_build_object('items',coalesce(jsonb_agg(jsonb_build_object('id',id,'accountId',account_id,'email',email,'kind',kind,'status',status,'createdAt',created_at,'updatedAt',updated_at,'canReview',account_id is distinct from (select auth.uid())) order by rn) filter(where rn<=20),'[]'::jsonb),'hasMore',count(*)>20 and p_page<100) into result from ordered;
 return result;
end;$fn$;
create function newsroom_private.review_privacy_request(p_id uuid,p_expected timestamptz,p_action text,p_resolution text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());q newsroom_private.reader_privacy_requests%rowtype;next_status text;
begin
 if not newsroom_private.privacy_owner_allowed() then raise exception 'Queue unavailable' using errcode='42501';end if;
 select * into q from newsroom_private.reader_privacy_requests where id=p_id for update;
 if not found or q.account_id is not distinct from actor then raise exception 'Independent reviewer required' using errcode='42501';end if;
 if q.updated_at is distinct from p_expected or q.status not in ('pending','reviewing') then raise exception 'Request changed' using errcode='40001';end if;
 if p_action='review' and q.status='pending' and p_resolution is null then next_status:='reviewing';
 elsif p_action='fulfill' and q.status='reviewing' and p_resolution='completed_externally' then next_status:='fulfilled';
 elsif p_action='decline' and q.status='reviewing' and p_resolution in ('retention_required','identity_not_verified') then next_status:='declined';
 else raise exception 'Invalid transition' using errcode='22023';end if;
 update newsroom_private.reader_privacy_requests set status=next_status,resolution=p_resolution,reviewed_by=actor,updated_at=clock_timestamp() where id=p_id;
 insert into newsroom_private.reader_privacy_events(request_id,actor,action) values(p_id,actor,p_action);
 return jsonb_build_object('id',p_id,'status',next_status);
end;$fn$;

-- Public media view remains an intentionally limited projection, now includes explicit rights checks.
create or replace view public.media_public_assets with (security_barrier=true) as
select m.id,m.url,m.alt_text,m.caption,m.credit,m.width,m.height,m.display_caption,m.display_credit,m.decorative
from public.media_assets m where m.status='approved' and m.rights_status::text not in ('unknown','restricted')
 and (m.embargo_until is null or m.embargo_until<=now()) and (m.license_expires_at is null or m.license_expires_at>now())
 and not m.is_superseded and m.trashed_at is null;
revoke all on public.media_public_assets from public,anon,authenticated;
grant select on public.media_public_assets to anon,authenticated;

-- Catalog/storage destruction must not bypass the HTTP safety hold. Never remove a
-- linked file through JWT storage operations; allow own unlinked failed-upload cleanup.
revoke delete,truncate on public.media_assets from public,anon,authenticated;
create function newsroom_private.catalogued_media_path(p_path text)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from public.media_assets where storage_path=p_path)
$fn$;
revoke all on function newsroom_private.catalogued_media_path(text) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.catalogued_media_path(text) to authenticated;
create policy ct12_catalogued_storage_delete_hold on storage.objects as restrictive for delete to authenticated
using(bucket_id<>'media' or (owner_id=(select auth.uid())::text and not newsroom_private.catalogued_media_path(name)));
create policy ct12_catalogued_storage_update_hold on storage.objects as restrictive for update to authenticated
using(bucket_id<>'media') with check(bucket_id<>'media');

create function newsroom_private.guard_media_rights_ct12()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'authenticated' then return new;end if;
 if old.status in ('archived','trashed') and new.status is distinct from old.status
 and not newsroom_private.has_staff_permission('media.delete',null,old.uploaded_by) then raise exception 'Restore requires media removal grant' using errcode='42501';end if;
 if new.status='approved' and (new.status is distinct from old.status or new.rights_status is distinct from old.rights_status or new.license_expires_at is distinct from old.license_expires_at)
 and (new.rights_status is null or new.rights_status::text in ('unknown','restricted') or (new.license_expires_at is not null and (not isfinite(new.license_expires_at) or new.license_expires_at<=statement_timestamp()))) then raise exception 'Media rights unavailable' using errcode='22023';end if;
 if new.status='approved' and old.status is distinct from new.status then
  if new.approved_by is distinct from (select auth.uid()) or new.approved_at is null then raise exception 'Approval actor must match' using errcode='42501';end if;
 end if;
 if old.status='approved' and new.status='draft' and not newsroom_private.has_staff_permission('media.approve',null,old.uploaded_by) then raise exception 'Approval withdrawal requires approval grant' using errcode='42501';end if;
 return new;
end;$fn$;
create trigger ct12_media_rights_guard before update on public.media_assets for each row execute function newsroom_private.guard_media_rights_ct12();
revoke all on function newsroom_private.guard_media_rights_ct12() from public,anon,authenticated,service_role;

-- All available reference surfaces scanned conservatively (exact ID or original
-- URL in row JSON). This is a report, never authorization to destroy a file.
create function newsroom_private.media_reference_review(p_id uuid)
returns jsonb language plpgsql stable security definer set search_path='' as $fn$
declare m public.media_assets%rowtype; result jsonb;
begin
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false) or not newsroom_private.has_staff_permission('newsroom.access')
 or not newsroom_private.has_staff_permission('media.delete') or not newsroom_private.has_staff_permission('media.view_all') or not newsroom_private.has_staff_permission('story.view_all') then raise exception 'Reference review unavailable' using errcode='42501';end if;
 select * into m from public.media_assets where id=p_id and status='trashed';
 if not found then raise exception 'Trashed media unavailable' using errcode='22023';end if;
 return jsonb_build_object('id',p_id,'checkedAt',statement_timestamp(),'deletionAllowed',false,
 'stories',exists(select 1 from public.stories s where strpos(to_jsonb(s)::text,p_id::text)>0 or (m.url<>'' and strpos(to_jsonb(s)::text,m.url)>0)),
 'revisions',exists(select 1 from public.story_revisions s where strpos(to_jsonb(s)::text,p_id::text)>0 or (m.url<>'' and strpos(to_jsonb(s)::text,m.url)>0)),
 'versions',exists(select 1 from public.story_versions s where strpos(to_jsonb(s)::text,p_id::text)>0 or (m.url<>'' and strpos(to_jsonb(s)::text,m.url)>0)),
 'bylines',exists(select 1 from public.editorial_profiles e where e.headshot_media_id=p_id),
 'usage',exists(select 1 from public.media_usage u where u.media_asset_id=p_id),
 'promotions',exists(select 1 from public.media_private_drafts d where d.published_media_id=p_id),
 'replacement',exists(select 1 from public.media_assets a where a.superseded_by=p_id));
end;$fn$;
-- Limit direct byline mutations to presentation fields; never silently reassign an account or delete attribution.
revoke insert,delete,truncate on public.editorial_profiles from public,anon,authenticated;
create function newsroom_private.guard_byline_ct12()
returns trigger language plpgsql security definer set search_path='' as $fn$
begin
 if (select auth.uid()) is null then return new;end if;
 if not coalesce(public.staff_invite_verified_identity((select auth.uid())),false) or not newsroom_private.has_staff_permission('newsroom.access') or not newsroom_private.has_staff_permission('byline.manage') then raise exception 'Byline update denied' using errcode='42501';end if;
 if new.id is distinct from old.id or new.account_id is distinct from old.account_id or new.slug is distinct from old.slug or new.created_at is distinct from old.created_at then raise exception 'Byline identity immutable' using errcode='42501';end if;
 if char_length(btrim(new.byline_name)) not between 1 and 160 or coalesce(char_length(new.editorial_title),0)>160 or coalesce(char_length(new.bio),0)>10000 or new.byline_status not in ('active','former','hidden') then raise exception 'Invalid byline' using errcode='22023';end if;
 if new.headshot_media_id is distinct from old.headshot_media_id and new.headshot_media_id is not null then
  perform 1 from public.media_assets m where m.id=new.headshot_media_id and m.mime_type like 'image/%' and exists(select 1 from public.media_public_assets v where v.id=m.id) for share;
  if not found then raise exception 'Headshot unavailable' using errcode='22023';end if;
 end if;
 return new;
end;$fn$;
create trigger ct12_byline_identity_guard before update on public.editorial_profiles for each row execute function newsroom_private.guard_byline_ct12();
revoke all on function newsroom_private.guard_byline_ct12() from public,anon,authenticated,service_role;
-- Public alert rows cannot reveal a linked unpublished story even via direct API.
drop policy if exists breaking_news_select_public on public.breaking_news;
create policy breaking_news_select_public on public.breaking_news for select to anon,authenticated using(
 active and (starts_at is null or starts_at<=now()) and (ends_at is null or ends_at>now())
 and (story_id is null or exists(select 1 from public.stories s where s.id=story_id and s.status='published' and s.published_at<=now()))
 and (external_url is null or (external_url ~* '^https?://[^/@[:space:]]+(/|$|[?])' and external_url !~ '[[:cntrl:]]'))
);
create function newsroom_private.guard_alert_ct12()
returns trigger language plpgsql security invoker set search_path='' as $fn$
begin
 if current_user<>'authenticated' then return new;end if;
 if not newsroom_private.has_staff_permission('newsroom.access') or not newsroom_private.has_staff_permission('homepage.edit') or not newsroom_private.has_staff_permission('homepage.publish') then raise exception 'Alert write denied' using errcode='42501';end if;
 if new.headline is null or char_length(btrim(new.headline)) not between 1 and 240 or new.position<0
 or (new.starts_at is not null and not isfinite(new.starts_at)) or (new.ends_at is not null and not isfinite(new.ends_at))
 or (new.starts_at is not null and new.ends_at is not null and new.ends_at<=new.starts_at)
 or (new.external_url is not null and (new.external_url !~* '^https?://[^/@[:space:]]+(/|$|[?])' or new.external_url~'[[:cntrl:]]')) then raise exception 'Invalid alert' using errcode='22023';end if;
 if new.active and new.story_id is not null then
 perform 1 from public.stories s where s.id=new.story_id and s.status='published' and s.published_at<=statement_timestamp() for share;
 if not found then raise exception 'Alert story unavailable' using errcode='22023';end if;
 end if;
 return new;
end;$fn$;
create trigger ct12_alert_guard before insert or update on public.breaking_news for each row execute function newsroom_private.guard_alert_ct12();
revoke all on function newsroom_private.guard_alert_ct12() from public,anon,authenticated,service_role;

create function public.reader_read_account() returns jsonb language sql stable security invoker set search_path='' return newsroom_private.read_reader_account();
create function public.reader_save_account(p_expected timestamptz,p_name text,p_locale text,p_avatar text) returns jsonb language sql security invoker set search_path='' return newsroom_private.save_reader_account(p_expected,p_name,p_locale,p_avatar);
create function public.reader_change_privacy(p_action text,p_kind text,p_id uuid,p_confirmation text) returns jsonb language sql security invoker set search_path='' return newsroom_private.change_reader_privacy(p_action,p_kind,p_id,p_confirmation);
create function public.reader_export_snapshot() returns jsonb language sql stable security invoker set search_path='' return newsroom_private.export_reader_snapshot();
create function public.staff_read_privacy_queue(p_page integer) returns jsonb language sql stable security invoker set search_path='' return newsroom_private.read_privacy_queue(p_page);
create function public.staff_review_privacy_request(p_id uuid,p_expected timestamptz,p_action text,p_resolution text) returns jsonb language sql security invoker set search_path='' return newsroom_private.review_privacy_request(p_id,p_expected,p_action,p_resolution);
create function public.staff_media_reference_review(p_id uuid) returns jsonb language sql stable security invoker set search_path='' return newsroom_private.media_reference_review(p_id);
revoke all on function newsroom_private.reader_account_allowed(),newsroom_private.read_reader_account(),newsroom_private.save_reader_account(timestamptz,text,text,text),newsroom_private.change_reader_privacy(text,text,uuid,text),newsroom_private.export_reader_snapshot(),newsroom_private.privacy_owner_allowed(),newsroom_private.read_privacy_queue(integer),newsroom_private.review_privacy_request(uuid,timestamptz,text,text),newsroom_private.media_reference_review(uuid),
public.reader_read_account(),public.reader_save_account(timestamptz,text,text,text),public.reader_change_privacy(text,text,uuid,text),public.reader_export_snapshot(),public.staff_read_privacy_queue(integer),public.staff_review_privacy_request(uuid,timestamptz,text,text),public.staff_media_reference_review(uuid) from public,anon,authenticated,service_role;
grant execute on function newsroom_private.read_reader_account(),newsroom_private.save_reader_account(timestamptz,text,text,text),newsroom_private.change_reader_privacy(text,text,uuid,text),newsroom_private.export_reader_snapshot(),newsroom_private.read_privacy_queue(integer),newsroom_private.review_privacy_request(uuid,timestamptz,text,text),newsroom_private.media_reference_review(uuid),
public.reader_read_account(),public.reader_save_account(timestamptz,text,text,text),public.reader_change_privacy(text,text,uuid,text),public.reader_export_snapshot(),public.staff_read_privacy_queue(integer),public.staff_review_privacy_request(uuid,timestamptz,text,text),public.staff_media_reference_review(uuid) to authenticated;
commit;
