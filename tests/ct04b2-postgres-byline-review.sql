\set ON_ERROR_STOP on
\i tests/ct04b-postgres-onboarding.sql
-- The invitation fixture's reviewed owner grant is set before CT-03c locks it.
-- Minimal isolated legacy byline/account/story model, never hosted data.
create table public.editorial_profiles(
 id uuid primary key, account_id uuid unique references auth.users(id),
 byline_name text not null,slug text not null unique,byline_status text not null);
alter table public.stories add column author_id uuid references auth.users(id);
insert into public.editorial_profiles values
 ('50000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000001','Historical Author','historic','active'),
 ('50000000-0000-4000-8000-000000000002',null,'Unlinked Test Author','unlinked','hidden');
insert into public.stories(id,author_id) values
 ('50000000-0000-4000-8000-000000000010','00000000-0000-0000-0000-000000000001');
\i supabase/migrations/20261124154819_ct04b_staff_byline_review.sql

do $$ begin
 if has_table_privilege('authenticated','public.staff_byline_reviews','SELECT')
 or has_function_privilege('authenticated','public.staff_review_byline(uuid,uuid,integer,integer,text,uuid,text,uuid)','EXECUTE')
 or has_function_privilege('anon','public.staff_list_byline_requests(uuid,integer)','EXECUTE')
 or has_table_privilege('service_role','public.editorial_profiles','SELECT')
 or has_table_privilege('service_role','public.editorial_profiles','UPDATE')
 or not has_column_privilege('service_role','public.editorial_profiles','account_id','SELECT')
 or (select count(*) from public.staff_byline_reviews)<>0 then
 raise exception 'Unsafe privilege or seed'; end if;
end $$;

begin;
set local role service_role;
select public.staff_save_onboarding('40000000-0000-4000-8000-000000000001',2,'Private Name','en',true,1,gen_random_uuid());
do $$
declare v_member uuid; v_owner uuid:='00000000-0000-0000-0000-000000000001';
begin
 select id into v_member from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001';
 if not exists(select 1 from public.staff_list_byline_requests(v_owner,0)
   where membership_id=v_member and review_status='pending' and eligible) then
   raise exception 'Pending request missing'; end if;
 if (select count(*) from public.staff_list_byline_candidates(v_owner,v_member,0))<>1 then
   raise exception 'Candidate list included another account byline'; end if;
 begin
   perform public.staff_review_byline('40000000-0000-4000-8000-000000000001',v_member,3,0,'approve',
     '50000000-0000-4000-8000-000000000002','Unauthorized self approval test',gen_random_uuid());
   raise exception 'Freelancer approved own request';
 exception when insufficient_privilege then null; end;
 begin
   perform public.staff_review_byline(v_owner,v_member,3,0,'approve','50000000-0000-4000-8000-000000000001',
     'Attempt to claim historical author',gen_random_uuid());
   raise exception 'Historical author stolen';
 exception when serialization_failure then null; end;
 begin
   perform public.staff_review_byline(v_owner,v_member,2,0,'reject',null,'Stale request rejection test',gen_random_uuid());
   raise exception 'Stale request accepted';
 exception when serialization_failure then null; end;
 perform public.staff_review_byline(v_owner,v_member,3,0,'reject',null,'Reviewed request needs correction',gen_random_uuid());
 begin
   perform public.staff_review_byline(v_owner,v_member,3,1,'approve','50000000-0000-4000-8000-000000000002',
     'Attempt approval without renewed request',gen_random_uuid());
   raise exception 'Rejected request reused';
 exception when serialization_failure then null; end;
end $$;
commit;

begin;
set local role service_role;
select public.staff_save_onboarding('40000000-0000-4000-8000-000000000001',3,'Private Name','en',true,1,gen_random_uuid());
do $$
declare v_member uuid; v_owner uuid:='00000000-0000-0000-0000-000000000001';
begin
 select id into v_member from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001';
 perform public.staff_review_byline(v_owner,v_member,4,1,'approve','50000000-0000-4000-8000-000000000002',
   'Verified correct editorial identity',gen_random_uuid());
 if not exists(select 1 from public.staff_list_byline_requests(v_owner,0) where membership_id=v_member and review_status='approved') then
   raise exception 'Approved association absent'; end if;
 begin
   perform public.staff_review_byline(v_owner,v_member,4,1,'unlink',null,'Stale administrative unlink test',gen_random_uuid());
   raise exception 'Stale review accepted';
 exception when serialization_failure then null; end;
end $$;
commit;

begin;
update public.staff_memberships set status='suspended',suspended_at=now()
where auth_user_id='40000000-0000-4000-8000-000000000001';
set local role service_role;
do $$
declare v_member uuid; v_owner uuid:='00000000-0000-0000-0000-000000000001';
begin
 select id into v_member from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000001';
 perform public.staff_review_byline(v_owner,v_member,4,2,'unlink',null,'Remove private association after suspension',gen_random_uuid());
end $$;
commit;
do $$ begin
 if not exists(select 1 from public.staff_byline_reviews where status='unlinked' and editorial_profile_id is null and revision=3)
 or (select count(*) from public.staff_access_audit where action_key like 'staff_byline.%')<>3
 or not exists(select 1 from public.stories s join public.editorial_profiles e on e.account_id=s.author_id
   where s.id='50000000-0000-4000-8000-000000000010' and e.byline_name='Historical Author')
 or not exists(select 1 from public.editorial_profiles where id='50000000-0000-4000-8000-000000000002' and account_id is null and byline_status='hidden')
 or (select count(*) from public.staff_member_roles r join public.staff_memberships m on m.id=r.membership_id
    where m.auth_user_id='40000000-0000-4000-8000-000000000001')<>1 then
   raise exception 'Attribution, role or review audit changed unexpectedly';
 end if;
end $$;
select 'CT-04b.2 private byline review and attribution preservation passed' as result;
