\set ON_ERROR_STOP on
\i tests/ct12-postgres-reader-account.sql
\i supabase/migrations/20261125014031_ct13_reader_communications.sql
do $fn$begin
 if has_table_privilege('authenticated','newsroom_private.reader_notice_events','SELECT') or has_table_privilege('authenticated','newsroom_private.newsletter_subscriptions','SELECT') or has_function_privilege('authenticated','public.mail_begin_confirmation(uuid,text,text)','EXECUTE') or has_function_privilege('anon','public.reader_read_notices(integer)','EXECUTE') then raise exception 'Communications privilege leak';end if;
end;$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$declare p jsonb;begin
 p:=public.reader_read_notices(0);if (p->>'unread')::int<>0 or (p->'preferences'->>'stories')::boolean then raise exception 'Not opted out by default';end if;
 p:=public.reader_change_notices('preferences',0,true,true,true,null,0);
 if not (p->'preferences'->>'stories')::boolean or (p->'preferences'->>'revision')::int<>1 then raise exception 'Preference save failed';end if;
 begin perform public.reader_change_notices('preferences',0,false,false,false,null,0);raise exception 'Stale preference accepted';exception when serialization_failure then null;end;
 if (public.reader_read_newsletters()->>'deliveryEnabled')::boolean then raise exception 'Mail enabled by default';end if;
 if jsonb_array_length(public.reader_read_newsletters()->'topics')<>3 then raise exception 'Topic projection';end if;
end;$fn$;
reset role;
-- Deterministic captured events, including a second user's private event.
insert into newsroom_private.reader_notice_events(kind,story_id) values('story','20000000-0000-0000-0000-000000000001') on conflict do nothing;
insert into newsroom_private.reader_privacy_requests(account_id,kind) values('00000000-0000-0000-0000-000000000002','export');
update newsroom_private.reader_privacy_requests set status='reviewing' where account_id='00000000-0000-0000-0000-000000000002' and kind='export';
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$declare p jsonb;eid uuid;begin
 p:=public.reader_read_notices(0);
 if exists(select 1 from jsonb_array_elements(p->'items') x where x->>'kind'='privacy') then raise exception 'Other reader notice leaked';end if;
 if (p->>'unread')::int<>1 then raise exception 'Public notice not visible';end if;
 eid:=(p->'items'->0->>'id')::uuid;
 p:=public.reader_change_notices('read',null,null,null,null,eid,0);if (p->>'unread')::int<>0 then raise exception 'Read state failed';end if;
 p:=public.reader_change_notices('unread',null,null,null,null,eid,0);if (p->>'unread')::int<>1 then raise exception 'Unread state failed';end if;
 p:=public.reader_change_notices('read_all',null,null,null,null,null,0);if (p->>'unread')::int<>0 then raise exception 'Mark all failed';end if;
end;$fn$;
reset role;
do $fn$begin
 begin perform newsroom_private.begin_newsletter_confirmation('00000000-0000-0000-0000-000000000005','latest',repeat('a',64));raise exception 'Disabled delivery allowed';exception when insufficient_privilege then null;end;
end;$fn$;
update newsroom_private.newsletter_settings set delivery_enabled=true where singleton;
do $fn$declare d jsonb;sid uuid;gen uuid;did uuid;begin
 d:=newsroom_private.begin_newsletter_confirmation('00000000-0000-0000-0000-000000000005','latest',repeat('a',64));sid:=(d->>'subscriptionId')::uuid;gen:=(d->>'generation')::uuid;did:=(d->>'id')::uuid;
 if sid is null or not newsroom_private.newsletter_send_allowed(did) then raise exception 'Confirmation claim unavailable';end if;
 if newsroom_private.claim_newsletter_digest() is not null then raise exception 'Unconfirmed digest eligible';end if;
 if not newsroom_private.finish_newsletter_send(did,'accepted','provider-test-id') then raise exception 'Provider receipt failed';end if;
 if newsroom_private.confirm_newsletter(repeat('b',64)) then raise exception 'Forged token accepted';end if;
 if not newsroom_private.confirm_newsletter(repeat('a',64)) or newsroom_private.confirm_newsletter(repeat('a',64)) then raise exception 'Confirmation must be one-use';end if;
 if not newsroom_private.apply_newsletter_bounce('event-test','provider-test-id','bounced') or not newsroom_private.apply_newsletter_bounce('event-test','provider-test-id','bounced') then raise exception 'Bounce receipt failed';end if;
 if not exists(select 1 from newsroom_private.newsletter_subscriptions where id=sid and status='suppressed') then raise exception 'Suppression missing';end if;
 if newsroom_private.claim_newsletter_digest() is not null then raise exception 'Suppressed digest eligible';end if;
 if not newsroom_private.unsubscribe_newsletter_link(sid,gen) then raise exception 'Unsubscribe failed';end if;
end;$fn$;
rollback;
select 'CT13 isolated consent, inbox ownership, read-state and suppression checks passed' as result;
