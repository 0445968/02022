-- CT13/14: verified reader inbox, explicit newsletter consent, bounded mail delivery, free-only access.
begin;
create table newsroom_private.reader_notice_preferences(
 account_id uuid primary key references auth.users(id) on delete cascade,
 story_since timestamptz,reply_since timestamptz,privacy_since timestamptz,
 revision integer not null default 0 check(revision>=0)
);
create table newsroom_private.reader_notice_events(
 id uuid primary key default gen_random_uuid(),kind text not null check(kind in ('story','reply','privacy')),
 recipient uuid references auth.users(id) on delete cascade,
 story_id uuid references public.stories(id) on delete cascade,
 comment_id uuid references public.comments(id) on delete cascade,
 request_id uuid references newsroom_private.reader_privacy_requests(id) on delete cascade,
 request_status text,
 created_at timestamptz not null default clock_timestamp(),
 check((kind='story' and recipient is null and story_id is not null and comment_id is null and request_id is null) or
 (kind='reply' and recipient is not null and story_id is not null and comment_id is not null and request_id is null) or
 (kind='privacy' and recipient is not null and story_id is null and comment_id is null and request_id is not null and request_status is not null))
);
create unique index ct13_story_once on newsroom_private.reader_notice_events(story_id) where kind='story';
create unique index ct13_reply_once on newsroom_private.reader_notice_events(comment_id) where kind='reply';
create unique index ct13_privacy_once on newsroom_private.reader_notice_events(request_id,request_status) where kind='privacy';
create index ct13_notice_time on newsroom_private.reader_notice_events(created_at desc,id desc);
create index ct13_notice_recipient on newsroom_private.reader_notice_events(recipient,created_at desc);
create table newsroom_private.reader_notice_reads(
 account_id uuid not null references auth.users(id) on delete cascade,event_id uuid not null references newsroom_private.reader_notice_events(id) on delete cascade,
 read_at timestamptz not null default clock_timestamp(),primary key(account_id,event_id)
);
create function newsroom_private.capture_reader_notice() returns trigger language plpgsql security definer set search_path='' as $fn$
declare parent_user uuid;
begin
 if tg_table_name='stories' then
  if new.status='published' and new.published_at is not null and new.published_at<=statement_timestamp() and new.access_level::text='public' then
   if tg_op='INSERT' then
    insert into newsroom_private.reader_notice_events(kind,story_id) values('story',new.id) on conflict do nothing;
   elsif old.status is distinct from new.status or old.access_level is distinct from new.access_level then
    insert into newsroom_private.reader_notice_events(kind,story_id) values('story',new.id) on conflict do nothing;
   end if;
  end if;
 elsif tg_table_name='comments' then
  if new.status='published' and new.parent_id is not null and new.user_id is not null then
   select user_id into parent_user from public.comments where id=new.parent_id and story_id=new.story_id and status='published';
   if parent_user is not null and parent_user<>new.user_id and exists(select 1 from public.stories where id=new.story_id and status='published' and published_at<=statement_timestamp() and access_level::text='public') then
    insert into newsroom_private.reader_notice_events(kind,recipient,story_id,comment_id) values('reply',parent_user,new.story_id,new.id) on conflict do nothing;
   end if;
  end if;
 elsif tg_table_name='reader_privacy_requests' then
  if new.account_id is not null and old.status is distinct from new.status then
   insert into newsroom_private.reader_notice_events(kind,recipient,request_id,request_status) values('privacy',new.account_id,new.id,new.status) on conflict do nothing;
  end if;
 end if;
 return new;
end;$fn$;
create trigger ct13_story_notice after insert or update of status,access_level on public.stories for each row execute function newsroom_private.capture_reader_notice();
create trigger ct13_reply_notice after insert or update of status on public.comments for each row execute function newsroom_private.capture_reader_notice();
create trigger ct13_privacy_notice after update of status on newsroom_private.reader_privacy_requests for each row execute function newsroom_private.capture_reader_notice();
create function newsroom_private.visible_reader_notices(p_actor uuid)
returns table(id uuid,kind text,story_id uuid,slug text,headline text,request_status text,created_at timestamptz,is_read boolean)
language sql stable security invoker set search_path='' as $fn$
 select e.id,e.kind,e.story_id,s.slug,s.headline,e.request_status,e.created_at,r.event_id is not null
 from newsroom_private.reader_notice_events e
 join newsroom_private.reader_notice_preferences p on p.account_id=p_actor
 left join public.stories s on s.id=e.story_id
 left join newsroom_private.reader_notice_reads r on r.event_id=e.id and r.account_id=p_actor
 where e.created_at>=statement_timestamp()-interval '90 days'
 and ((e.kind='story' and e.created_at>=p.story_since) or
 (e.kind='reply' and e.recipient=p_actor and e.created_at>=p.reply_since and exists(select 1 from public.comments c join public.comments parent on parent.id=c.parent_id where c.id=e.comment_id and c.status='published' and parent.status='published' and parent.user_id=p_actor)) or
 (e.kind='privacy' and e.recipient=p_actor and e.created_at>=p.privacy_since))
 and (e.kind='privacy' or (s.status='published' and s.published_at<=statement_timestamp() and s.access_level::text='public'))
$fn$;
create function newsroom_private.read_reader_notices(p_page integer)
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());pref newsroom_private.reader_notice_preferences%rowtype;items jsonb;more boolean;unread int;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 select * into pref from newsroom_private.reader_notice_preferences where account_id=actor;
 with page as(select *,row_number() over(order by created_at desc,id desc) rn from newsroom_private.visible_reader_notices(actor) order by created_at desc,id desc limit 21 offset p_page*20)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'slug',slug,'headline',headline,'requestStatus',request_status,'createdAt',created_at,'read',is_read) order by rn) filter(where rn<=p_page*20+20),'[]'),count(*)>20 into items,more from page;
 select count(*) into unread from newsroom_private.visible_reader_notices(actor) where not is_read;
 return jsonb_build_object('preferences',jsonb_build_object('stories',pref.story_since is not null,'replies',pref.reply_since is not null,'privacy',pref.privacy_since is not null,'revision',coalesce(pref.revision,0)),'items',items,'hasMore',more and p_page<100,'unread',unread);
end;$fn$;
create function newsroom_private.change_reader_notices(p_action text,p_expected integer,p_stories boolean,p_replies boolean,p_privacy boolean,p_event uuid,p_page integer)
returns jsonb language plpgsql security definer set search_path='' as $fn$
declare actor uuid:=(select auth.uid());pref newsroom_private.reader_notice_preferences%rowtype;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Unavailable' using errcode='42501';end if;
 if p_page is null or p_page not between 0 and 100 then raise exception 'Invalid page' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,130026));
 if p_action='preferences' and p_expected is not null and p_stories is not null and p_replies is not null and p_privacy is not null and p_event is null then
  insert into newsroom_private.reader_notice_preferences(account_id) values(actor) on conflict do nothing;
  select * into pref from newsroom_private.reader_notice_preferences where account_id=actor for update;
  if pref.revision<>p_expected then raise exception 'Preferences changed' using errcode='40001';end if;
  update newsroom_private.reader_notice_preferences set story_since=case when p_stories then coalesce(story_since,clock_timestamp()) end,
   reply_since=case when p_replies then coalesce(reply_since,clock_timestamp()) end,privacy_since=case when p_privacy then coalesce(privacy_since,clock_timestamp()) end,revision=revision+1 where account_id=actor;
 elsif p_action in ('read','unread') and p_event is not null and p_expected is null and p_stories is null and p_replies is null and p_privacy is null then
  if not exists(select 1 from newsroom_private.visible_reader_notices(actor) where id=p_event) then raise exception 'Notice unavailable' using errcode='42501';end if;
  if p_action='read' then insert into newsroom_private.reader_notice_reads(account_id,event_id) values(actor,p_event) on conflict do nothing;
  else delete from newsroom_private.reader_notice_reads where account_id=actor and event_id=p_event;end if;
 elsif p_action='read_all' and p_event is null and p_expected is null and p_stories is null and p_replies is null and p_privacy is null then
  insert into newsroom_private.reader_notice_reads(account_id,event_id) select actor,id from newsroom_private.visible_reader_notices(actor) where not is_read on conflict do nothing;
 else raise exception 'Invalid notice command' using errcode='22023';end if;
 return newsroom_private.read_reader_notices(p_page);
end;$fn$;
-- Retention is explicit and operator-only; no scheduled execution in this migration.
create function newsroom_private.prune_reader_notices() returns integer language plpgsql security invoker set search_path='' as $fn$
declare n integer;begin delete from newsroom_private.reader_notice_events where id in(select id from newsroom_private.reader_notice_events where created_at<clock_timestamp()-interval '90 days' order by created_at limit 1000);get diagnostics n=row_count;return n;end;$fn$;
-- Newsletter preferences do not become active until the address owner confirms.
create table newsroom_private.newsletter_settings(singleton boolean primary key default true check(singleton),delivery_enabled boolean not null default false);
insert into newsroom_private.newsletter_settings(singleton) values(true);
create table newsroom_private.newsletter_subscriptions(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references auth.users(id) on delete cascade,
 topic text not null check(topic in ('latest','san_andres','old_providence')),
 email text not null,locale text not null check(locale in ('en','es')),
 status text not null check(status in ('pending','active','unsubscribed','suppressed')),
 generation uuid not null default gen_random_uuid(),confirm_hash text,confirm_until timestamptz,
 requested_at timestamptz not null default clock_timestamp(),confirmed_at timestamptz,updated_at timestamptz not null default clock_timestamp(),
 unique(account_id,topic),check((status='pending')=(confirm_hash is not null and confirm_until is not null))
);
create unique index ct13_confirm_hash on newsroom_private.newsletter_subscriptions(confirm_hash) where confirm_hash is not null;
create table newsroom_private.newsletter_suppressions(email_hash text primary key,reason text not null check(reason in ('bounced','complained')),created_at timestamptz not null default clock_timestamp());
create table newsroom_private.newsletter_deliveries(
 id uuid primary key default gen_random_uuid(),subscription_id uuid not null references newsroom_private.newsletter_subscriptions(id) on delete cascade,
 generation uuid not null,kind text not null check(kind in ('confirmation','digest')),delivery_day date,story_id uuid references public.stories(id) on delete set null,
 email text not null,provider_id text unique,state text not null default 'claimed' check(state in ('claimed','accepted','uncertain','cancelled','bounced','complained')),
 created_at timestamptz not null default clock_timestamp(),updated_at timestamptz not null default clock_timestamp()
);
create unique index ct13_daily_once on newsroom_private.newsletter_deliveries(subscription_id,delivery_day) where kind='digest';
create unique index ct13_confirm_once on newsroom_private.newsletter_deliveries(subscription_id,generation) where kind='confirmation';
create table newsroom_private.newsletter_webhook_receipts(event_id text primary key,created_at timestamptz not null default clock_timestamp());
create function newsroom_private.newsletter_email_hash(p_email text) returns text language sql immutable set search_path='' as $fn$
 select encode(sha256(convert_to(lower(btrim(p_email)),'UTF8')),'hex')
$fn$;
create function newsroom_private.read_reader_newsletters()
returns jsonb language plpgsql stable security definer set search_path='' set timezone='UTC' as $fn$
declare actor uuid:=(select auth.uid());v_email text;v_items jsonb;
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Unavailable' using errcode='42501';end if;
 select email into v_email from auth.users where id=actor;
 select coalesce(jsonb_agg(jsonb_build_object('topic',t.topic,'status',case when s.id is null then 'unsubscribed' when lower(s.email)<>lower(v_email) then 'address_changed' when s.status='pending' and s.confirm_until<=statement_timestamp() then 'expired' else s.status end,'updatedAt',s.updated_at) order by t.n),'[]') into v_items
 from (values('latest',1),('san_andres',2),('old_providence',3)) t(topic,n)
 left join newsroom_private.newsletter_subscriptions s on s.account_id=actor and s.topic=t.topic;
 return jsonb_build_object('email',v_email,'topics',v_items,'deliveryEnabled',(select delivery_enabled from newsroom_private.newsletter_settings where singleton));
end;$fn$;
create function newsroom_private.unsubscribe_reader_topic(p_topic text)
returns jsonb language plpgsql security definer set search_path='' as $fn$
begin
 if not newsroom_private.reader_account_allowed() then raise exception 'Unavailable' using errcode='42501';end if;
 if p_topic is null or p_topic not in ('latest','san_andres','old_providence') then raise exception 'Invalid topic' using errcode='22023';end if;
 update newsroom_private.newsletter_subscriptions set status='unsubscribed',confirm_hash=null,confirm_until=null,updated_at=clock_timestamp() where account_id=(select auth.uid()) and topic=p_topic;
 return newsroom_private.read_reader_newsletters();
end;$fn$;
-- Service-only call: server independently verifies the cookie identity; DB checks it again.
create function newsroom_private.begin_newsletter_confirmation(p_actor uuid,p_topic text,p_hash text)
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare s newsroom_private.newsletter_subscriptions%rowtype;v_email text;v_locale text;delivery uuid;
begin
 if not coalesce(public.staff_invite_verified_identity(p_actor),false) then raise exception 'Unavailable' using errcode='42501';end if;
 if p_topic is null or p_topic not in ('latest','san_andres','old_providence') or p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then raise exception 'Invalid confirmation' using errcode='22023';end if;
 if not (select delivery_enabled from newsroom_private.newsletter_settings where singleton) then raise exception 'Delivery disabled' using errcode='42501';end if;
 select u.email,p.preferred_locale into v_email,v_locale from auth.users u join public.profiles p on p.id=u.id where u.id=p_actor;
 if v_email is null or v_locale is null or exists(select 1 from newsroom_private.newsletter_suppressions where email_hash=newsroom_private.newsletter_email_hash(v_email)) then raise exception 'Delivery unavailable' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,130027));
 select * into s from newsroom_private.newsletter_subscriptions where account_id=p_actor and topic=p_topic for update;
 if found and ((s.status='active' and lower(s.email)=lower(v_email)) or s.requested_at>clock_timestamp()-interval '10 minutes') then raise exception 'Already active or recent request' using errcode='40001';end if;
 insert into newsroom_private.newsletter_subscriptions(account_id,topic,email,locale,status,confirm_hash,confirm_until)
 values(p_actor,p_topic,v_email,v_locale,'pending',p_hash,clock_timestamp()+interval '24 hours')
 on conflict(account_id,topic) do update set email=excluded.email,locale=excluded.locale,status='pending',generation=gen_random_uuid(),confirm_hash=excluded.confirm_hash,confirm_until=excluded.confirm_until,requested_at=clock_timestamp(),confirmed_at=null,updated_at=clock_timestamp() returning * into s;
 insert into newsroom_private.newsletter_deliveries(subscription_id,generation,kind,email) values(s.id,s.generation,'confirmation',v_email) returning id into delivery;
 return jsonb_build_object('id',delivery,'subscriptionId',s.id,'generation',s.generation,'email',s.email,'locale',s.locale,'topic',s.topic);
end;$fn$;
create function newsroom_private.confirm_newsletter(p_hash text)
returns boolean language plpgsql security definer set search_path='' as $fn$
begin
 if p_hash is null or p_hash !~ '^[0-9a-f]{64}$' then return false;end if;
 update newsroom_private.newsletter_subscriptions s set status='active',confirm_hash=null,confirm_until=null,confirmed_at=clock_timestamp(),updated_at=clock_timestamp()
 where s.status='pending' and s.confirm_hash=p_hash and s.confirm_until>clock_timestamp()
 and exists(select 1 from auth.users u where u.id=s.account_id and lower(u.email)=lower(s.email) and public.staff_invite_verified_identity(u.id))
 and not exists(select 1 from newsroom_private.newsletter_suppressions x where x.email_hash=newsroom_private.newsletter_email_hash(s.email));
 return found;
end;$fn$;
create function newsroom_private.unsubscribe_newsletter_link(p_id uuid,p_generation uuid)
returns boolean language plpgsql security definer set search_path='' as $fn$
begin
 update newsroom_private.newsletter_subscriptions set status=case when status='suppressed' then 'suppressed' else 'unsubscribed' end,confirm_hash=null,confirm_until=null,updated_at=clock_timestamp() where id=p_id and generation=p_generation;
 return found;
end;$fn$;
-- One daily latest-public-story digest per topic, only since confirmation, no backfill.
-- Claim at most one per call, never reclaim a claimed/uncertain send automatically.
create function newsroom_private.claim_newsletter_digest()
returns jsonb language plpgsql security definer set search_path='' set timezone='UTC' as $fn$
declare s newsroom_private.newsletter_subscriptions%rowtype;story record;delivery uuid;day date:=(clock_timestamp() at time zone 'America/Bogota')::date;
begin
 if not (select delivery_enabled from newsroom_private.newsletter_settings where singleton) then return null;end if;
 select n.* into s from newsroom_private.newsletter_subscriptions n join auth.users u on u.id=n.account_id
 where n.status='active' and lower(n.email)=lower(u.email) and public.staff_invite_verified_identity(u.id)
 and not exists(select 1 from newsroom_private.newsletter_suppressions x where x.email_hash=newsroom_private.newsletter_email_hash(n.email))
 and not exists(select 1 from newsroom_private.newsletter_deliveries d where d.subscription_id=n.id and d.kind='digest' and d.delivery_day=day)
 and exists(select 1 from newsroom_private.reader_notice_events e join public.stories st on st.id=e.story_id where e.kind='story' and e.created_at>=n.confirmed_at and e.created_at>=clock_timestamp()-interval '24 hours' and st.status='published' and st.published_at<=statement_timestamp() and st.access_level::text='public' and (n.topic='latest' or to_jsonb(st)->>'island'=n.topic))
 order by n.updated_at,n.id limit 1 for update of n skip locked;
 if not found then return null;end if;
 select st.id,st.slug,st.headline into story from newsroom_private.reader_notice_events e join public.stories st on st.id=e.story_id where e.kind='story' and e.created_at>=s.confirmed_at and e.created_at>=clock_timestamp()-interval '24 hours' and st.status='published' and st.published_at<=statement_timestamp() and st.access_level::text='public' and (s.topic='latest' or to_jsonb(st)->>'island'=s.topic) order by e.created_at desc,e.id desc limit 1;
 if not found then return null;end if;
 insert into newsroom_private.newsletter_deliveries(subscription_id,generation,kind,delivery_day,story_id,email) values(s.id,s.generation,'digest',day,story.id,s.email) returning id into delivery;
 return jsonb_build_object('id',delivery,'subscriptionId',s.id,'generation',s.generation,'email',s.email,'locale',s.locale,'topic',s.topic,'slug',story.slug,'headline',story.headline);
end;$fn$;
create function newsroom_private.newsletter_send_allowed(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $fn$
 select exists(select 1 from newsroom_private.newsletter_deliveries d join newsroom_private.newsletter_subscriptions s on s.id=d.subscription_id join auth.users u on u.id=s.account_id
 where d.id=p_id and d.state='claimed' and d.generation=s.generation and lower(d.email)=lower(u.email) and lower(d.email)=lower(s.email)
 and public.staff_invite_verified_identity(u.id) and (select delivery_enabled from newsroom_private.newsletter_settings where singleton)
 and not exists(select 1 from newsroom_private.newsletter_suppressions x where x.email_hash=newsroom_private.newsletter_email_hash(d.email))
 and ((d.kind='confirmation' and s.status='pending' and s.confirm_until>statement_timestamp()) or (d.kind='digest' and s.status='active' and exists(select 1 from public.stories st where st.id=d.story_id and st.status='published' and st.published_at<=statement_timestamp() and st.access_level::text='public'))))
$fn$;
create function newsroom_private.finish_newsletter_send(p_id uuid,p_state text,p_provider text)
returns boolean language plpgsql security definer set search_path='' as $fn$
begin
 if p_state is null or p_state not in ('accepted','uncertain','cancelled') or (p_state='accepted' and (p_provider is null or char_length(p_provider) not between 1 and 128)) or (p_state<>'accepted' and p_provider is not null) then raise exception 'Invalid delivery result' using errcode='22023';end if;
 update newsroom_private.newsletter_deliveries set state=p_state,provider_id=p_provider,updated_at=clock_timestamp() where id=p_id and state='claimed';
 return found;
end;$fn$;
create function newsroom_private.apply_newsletter_bounce(p_event text,p_provider text,p_reason text)
returns boolean language plpgsql security definer set search_path='' as $fn$
declare d newsroom_private.newsletter_deliveries%rowtype;
begin
 if p_event is null or char_length(p_event) not between 1 and 200 or p_provider is null or p_reason is null or p_reason not in ('bounced','complained') then raise exception 'Invalid event' using errcode='22023';end if;
 if exists(select 1 from newsroom_private.newsletter_webhook_receipts where event_id=p_event) then return true;end if;
 select * into d from newsroom_private.newsletter_deliveries where provider_id=p_provider for update;
 if not found then return false;end if;
 insert into newsroom_private.newsletter_webhook_receipts(event_id) values(p_event) on conflict do nothing;
 if not found then return true;end if;
 insert into newsroom_private.newsletter_suppressions(email_hash,reason) values(newsroom_private.newsletter_email_hash(d.email),p_reason) on conflict do nothing;
 update newsroom_private.newsletter_subscriptions set status='suppressed',confirm_hash=null,confirm_until=null,updated_at=clock_timestamp() where lower(email)=lower(d.email);
 update newsroom_private.newsletter_deliveries set state=p_reason,updated_at=clock_timestamp() where id=d.id;
 return true;
end;$fn$;
-- All communication tables private, RLS enabled; no direct JWT grants.
do $fn$ declare t text;begin foreach t in array array['reader_notice_preferences','reader_notice_events','reader_notice_reads','newsletter_settings','newsletter_subscriptions','newsletter_suppressions','newsletter_deliveries','newsletter_webhook_receipts'] loop
 execute format('alter table newsroom_private.%I enable row level security',t);
 execute format('revoke all on newsroom_private.%I from public,anon,authenticated,service_role',t);
end loop;end;$fn$;
-- Reader content is free-only until product approval. Preserve scoped staff access.
create policy ct14_free_reader_access on public.stories as restrictive for select to anon using(access_level::text='public');
create function newsroom_private.reader_registered_access()
returns boolean language sql stable security definer set search_path='' return coalesce(public.staff_invite_verified_identity((select auth.uid())),false);
revoke all on function newsroom_private.reader_registered_access() from public,anon,authenticated,service_role;
grant execute on function newsroom_private.reader_registered_access() to authenticated;
create policy ct14_authenticated_reader_access on public.stories as restrictive for select to authenticated using(
 access_level::text='public' or
 (access_level::text='registered' and newsroom_private.reader_registered_access())
 or newsroom_private.has_staff_permission('story.view_all',id)
 or newsroom_private.has_staff_permission('story.view_assigned',id)
 or newsroom_private.has_staff_permission('story.edit_all',id)
 or newsroom_private.has_staff_permission('story.edit_assigned',id)
);
-- Public wrappers are invokers; private definer operations are narrowly granted below.
create function public.reader_read_notices(p_page integer) returns jsonb language sql stable security invoker set search_path='' return newsroom_private.read_reader_notices(p_page);
create function public.reader_change_notices(p_action text,p_expected integer,p_stories boolean,p_replies boolean,p_privacy boolean,p_event uuid,p_page integer) returns jsonb language sql security invoker set search_path='' return newsroom_private.change_reader_notices(p_action,p_expected,p_stories,p_replies,p_privacy,p_event,p_page);
create function public.reader_read_newsletters() returns jsonb language sql stable security invoker set search_path='' return newsroom_private.read_reader_newsletters();
create function public.reader_unsubscribe_topic(p_topic text) returns jsonb language sql security invoker set search_path='' return newsroom_private.unsubscribe_reader_topic(p_topic);
create function public.mail_begin_confirmation(p_actor uuid,p_topic text,p_hash text) returns jsonb language sql security invoker set search_path='' return newsroom_private.begin_newsletter_confirmation(p_actor,p_topic,p_hash);
create function public.mail_confirm(p_hash text) returns boolean language sql security invoker set search_path='' return newsroom_private.confirm_newsletter(p_hash);
create function public.mail_unsubscribe(p_id uuid,p_generation uuid) returns boolean language sql security invoker set search_path='' return newsroom_private.unsubscribe_newsletter_link(p_id,p_generation);
create function public.mail_claim_digest() returns jsonb language sql security invoker set search_path='' return newsroom_private.claim_newsletter_digest();
create function public.mail_send_allowed(p_id uuid) returns boolean language sql stable security invoker set search_path='' return newsroom_private.newsletter_send_allowed(p_id);
create function public.mail_finish_send(p_id uuid,p_state text,p_provider text) returns boolean language sql security invoker set search_path='' return newsroom_private.finish_newsletter_send(p_id,p_state,p_provider);
create function public.mail_bounce(p_event text,p_provider text,p_reason text) returns boolean language sql security invoker set search_path='' return newsroom_private.apply_newsletter_bounce(p_event,p_provider,p_reason);
do $fn$ declare fn regprocedure;begin
 foreach fn in array array[
 'newsroom_private.capture_reader_notice()'::regprocedure,'newsroom_private.visible_reader_notices(uuid)'::regprocedure,'newsroom_private.prune_reader_notices()'::regprocedure,'newsroom_private.newsletter_email_hash(text)'::regprocedure
 ] loop execute format('revoke all on function %s from public,anon,authenticated,service_role',fn);end loop;
 foreach fn in array array[
 'newsroom_private.read_reader_notices(integer)'::regprocedure,'newsroom_private.change_reader_notices(text,integer,boolean,boolean,boolean,uuid,integer)'::regprocedure,'newsroom_private.read_reader_newsletters()'::regprocedure,'newsroom_private.unsubscribe_reader_topic(text)'::regprocedure,
 'public.reader_read_notices(integer)'::regprocedure,'public.reader_change_notices(text,integer,boolean,boolean,boolean,uuid,integer)'::regprocedure,'public.reader_read_newsletters()'::regprocedure,'public.reader_unsubscribe_topic(text)'::regprocedure
 ] loop execute format('revoke all on function %s from public,anon,authenticated,service_role',fn);execute format('grant execute on function %s to authenticated',fn);end loop;
 foreach fn in array array[
 'newsroom_private.begin_newsletter_confirmation(uuid,text,text)'::regprocedure,'newsroom_private.confirm_newsletter(text)'::regprocedure,'newsroom_private.unsubscribe_newsletter_link(uuid,uuid)'::regprocedure,'newsroom_private.claim_newsletter_digest()'::regprocedure,'newsroom_private.newsletter_send_allowed(uuid)'::regprocedure,'newsroom_private.finish_newsletter_send(uuid,text,text)'::regprocedure,'newsroom_private.apply_newsletter_bounce(text,text,text)'::regprocedure,
 'public.mail_begin_confirmation(uuid,text,text)'::regprocedure,'public.mail_confirm(text)'::regprocedure,'public.mail_unsubscribe(uuid,uuid)'::regprocedure,'public.mail_claim_digest()'::regprocedure,'public.mail_send_allowed(uuid)'::regprocedure,'public.mail_finish_send(uuid,text,text)'::regprocedure,'public.mail_bounce(text,text,text)'::regprocedure
 ] loop execute format('revoke all on function %s from public,anon,authenticated,service_role',fn);execute format('grant execute on function %s to service_role',fn);end loop;
end;$fn$;
commit;
