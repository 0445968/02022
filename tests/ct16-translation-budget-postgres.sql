-- Rollback-only accounting and ACL verification. No provider calls.
\set ON_ERROR_STOP on
begin;
insert into public.staff_memberships(id,auth_user_id,status,member_type,activated_at) values
 ('c1600000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001','active','employee',now()),
 ('c1600000-0000-4000-8000-000000000002','a1500000-0000-4000-8000-000000000002','active','employee',now());
insert into public.staff_member_roles(membership_id,role_preset_id)
 select 'c1600000-0000-4000-8000-000000000001'::uuid,id from public.staff_role_presets where role_key='owner'
 union all select 'c1600000-0000-4000-8000-000000000002'::uuid,id from public.staff_role_presets where role_key='editor';
-- Only synthetic bootstrap fixture, rolled back.
alter table public.staff_role_capabilities disable trigger ct03c_preset_grant_guard;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
do $fn$
declare a uuid:='a1500000-0000-4000-8000-000000000001';s uuid:='b1500000-0000-4000-8000-000000000001';fp text;rid uuid:=gen_random_uuid();r jsonb;role_name text;
begin
 fp:=newsroom_private.translation_source_fingerprint(s);
 foreach role_name in array array['anon','authenticated','service_role'] loop
  if has_table_privilege(role_name,'newsroom_private.translation_budget_settings','SELECT,INSERT,UPDATE,DELETE') or has_table_privilege(role_name,'newsroom_private.translation_budget_reservations','SELECT,INSERT,UPDATE,DELETE') or has_function_privilege(role_name,'newsroom_private.reserve_translation_budget(uuid,uuid,text,uuid,text,integer)','EXECUTE') then raise exception 'Translation accounting ACL violation';end if;
 end loop;
 if not exists(select 1 from newsroom_private.translation_budget_settings where singleton and not enabled and monthly_limit=1900000) then raise exception 'Unsafe defaults';end if;
 begin perform newsroom_private.reserve_translation_budget(rid,a,'story',s,fp,500);raise exception 'Disabled budget allowed';exception when insufficient_privilege then null;end;
 update newsroom_private.translation_budget_settings set enabled=true,monthly_limit=1200,daily_actor_limit=1000,request_limit=600 where singleton;
 r:=newsroom_private.reserve_translation_budget(rid,a,'story',s,fp,500);
 if r->>'reserved' is distinct from 'true' or r->>'monthlyUsed' is distinct from '500' then raise exception 'Reservation not recorded';end if;
 if newsroom_private.reserve_translation_budget(rid,a,'story',s,fp,500) is distinct from jsonb_build_object('reserved',false,'alreadyReserved',true) then raise exception 'Duplicate authorized';end if;
 begin perform newsroom_private.reserve_translation_budget(rid,a,'story',s,fp,501);raise exception 'Conflicting replay accepted';exception when serialization_failure then null;end;
 begin perform newsroom_private.reserve_translation_budget(gen_random_uuid(),a,'story',s,repeat('0',64),500);raise exception 'Stale source accepted';exception when serialization_failure then null;end;
 begin perform newsroom_private.reserve_translation_budget(gen_random_uuid(),a,'story',s,fp,601);raise exception 'Oversize request accepted';exception when invalid_parameter_value then null;end;
 begin perform newsroom_private.reserve_translation_budget(gen_random_uuid(),a,'story',s,fp,501);raise exception 'Daily budget exceeded';exception when raise_exception then if sqlerrm<>'Translation budget exhausted' then raise;end if;end;
 perform newsroom_private.reserve_translation_budget(gen_random_uuid(),a,'story',s,fp,500);
 update newsroom_private.translation_budget_settings set daily_actor_limit=1900000 where singleton;
 begin perform newsroom_private.reserve_translation_budget(gen_random_uuid(),a,'story',s,fp,201);raise exception 'Monthly budget exceeded';exception when raise_exception then if sqlerrm<>'Translation budget exhausted' then raise;end if;end;
 if (select count(*) from newsroom_private.translation_budget_reservations)<>2 then raise exception 'Unexpected reservation count';end if;
end;$fn$;
rollback;
select 'CT16 translation budget default-off, ACL, idempotency, source and limits passed' as result;
