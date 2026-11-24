\set ON_ERROR_STOP on
\i tests/ct04a-postgres-invitations.sql
\i supabase/migrations/20261124154346_ct04b_staff_onboarding.sql
-- CT-04a fixture has a legitimately redeemed freelancer and an uninvited reader.
do $$
begin
  if (select count(*) from public.staff_onboarding_profiles)<>0 then
    raise exception 'Unexpected onboarding profile seed';
  end if;
  if has_table_privilege('authenticated','public.staff_onboarding_profiles','SELECT')
    or has_table_privilege('anon','public.staff_onboarding_profiles','SELECT')
    or has_function_privilege('authenticated','public.staff_save_onboarding(uuid,integer,text,text,boolean,integer,uuid)','EXECUTE')
    or has_function_privilege('anon','public.staff_read_onboarding(uuid)','EXECUTE')
    or not has_function_privilege('service_role','public.staff_save_onboarding(uuid,integer,text,text,boolean,integer,uuid)','EXECUTE') then
    raise exception 'Unsafe onboarding privileges';
  end if;
end $$;

begin;
set local role authenticated;
do $$
begin
  begin
    perform public.staff_read_onboarding('40000000-0000-4000-8000-000000000001');
    raise exception 'Direct authenticated RPC succeeded';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

begin;
set local role service_role;
do $$
declare v jsonb; v_actor uuid:='40000000-0000-4000-8000-000000000001';
begin
  begin
    perform public.staff_save_onboarding('00000000-0000-0000-0000-000000000004',0,
      'Reader test','en',false,1,gen_random_uuid());
    raise exception 'Reader created staff profile';
  exception when insufficient_privilege then null; end;
  v:=public.staff_read_onboarding(v_actor);
  if v->'profile'<>'null'::jsonb or v->>'memberType'<>'freelancer'
    or v->'roles'->0->>'key'<>'freelancer' then raise exception 'First login state wrong'; end if;
  begin
    perform public.staff_save_onboarding(v_actor,0,'Bad version','en',false,0,gen_random_uuid());
    raise exception 'Old acknowledgement accepted';
  exception when invalid_parameter_value then null; end;
  begin
    insert into public.staff_onboarding_profiles
    select m.id,'Direct test','en',false,1,1,now(),now()
    from public.staff_memberships m where m.auth_user_id=v_actor;
    raise exception 'Direct service table write without context succeeded';
  exception when insufficient_privilege then null; end;
  v:=public.staff_save_onboarding(v_actor,0,'Private Test Name','es',true,1,gen_random_uuid());
  if v->'profile'->>'displayName'<>'Private Test Name'
    or v->'profile'->>'locale'<>'es' or v->'profile'->>'bylineRequested'<>'true'
    or v->'profile'->>'revision'<>'1' then raise exception 'Initial save incorrect'; end if;
  begin
    perform public.staff_save_onboarding(v_actor,0,'Stale test','en',false,1,gen_random_uuid());
    raise exception 'Stale onboarding overwrite accepted';
  exception when serialization_failure then null; end;
  v:=public.staff_save_onboarding(v_actor,1,'Changed Private Name','en',false,1,gen_random_uuid());
  if v->'profile'->>'revision'<>'2' or v->'profile'->>'bylineRequested'<>'false' then
    raise exception 'Private update did not save';
  end if;
end $$;
commit;

do $$
declare v_member uuid;
begin
  select id into v_member from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001';
  if (select count(*) from public.staff_onboarding_profiles)<>1 or
    (select count(*) from public.staff_member_roles where membership_id=v_member)<>1 or
    (select count(*) from public.staff_access_audit where subject_membership_id=v_member and
      action_key in ('staff_onboarding.completed','staff_onboarding.updated'))<>2 or
    exists(select 1 from public.staff_access_audit where action_key like 'staff_onboarding.%'
      and (after_state::text like '%Private%Name%' or after_state ? 'display_name')) then
    raise exception 'Profile save changed role assignment or leaked private text into audit';
  end if;
end $$;

-- A current newsroom deny must override the assigned freelancer grant.
begin;
insert into public.staff_capability_overrides(membership_id,capability_key,effect,scope,reason,granted_by)
select id,'newsroom.access','deny','all','Isolated deny fixture','00000000-0000-0000-0000-000000000001'
from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.staff_read_onboarding('40000000-0000-4000-8000-000000000001');
    raise exception 'Denied staff read profile';
  exception when insufficient_privilege then null; end;
end $$;
rollback;

-- Revoked/suspended/expired/ban state denies even a previously completed profile.
begin;
update public.staff_memberships set status='suspended',suspended_at=now()
where auth_user_id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.staff_save_onboarding('40000000-0000-4000-8000-000000000001',2,
      'Suspended test','en',false,1,gen_random_uuid());
    raise exception 'Suspended staff saved profile';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
begin;
update public.staff_memberships set expires_at=now()-interval '1 second'
where auth_user_id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.staff_read_onboarding('40000000-0000-4000-8000-000000000001');
    raise exception 'Expired staff read profile';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
begin;
update auth.users set banned_until=now()+interval '1 day'
where id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$ begin
  begin
    perform public.staff_read_onboarding('40000000-0000-4000-8000-000000000001');
    raise exception 'Banned Auth staff read profile';
  exception when insufficient_privilege then null; end;
end $$;
rollback;
select 'CT-04b isolated private first-login onboarding passed' as result;
