-- Only synthetic data. Run before forward migrations to test row preservation,
-- old profile flags and reader access; never bootstrap a staff member here.
-- Simulate legacy grants in the disposable baseline only; no blanket grants after migration.
grant usage on schema public to anon,authenticated,service_role;
grant select on all tables in schema public to anon;
grant select,insert,update,delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;
-- Remove all explicitly named historical development policies before seeding.
do $$declare p record;begin
 for p in select schemaname,tablename,policyname from pg_policies
  where policyname ilike 'DEV BYPASS%' or policyname ilike 'Dev bypass%'
 loop execute format('drop policy %I on %I.%I',p.policyname,p.schemaname,p.tablename);end loop;
end$$;
insert into auth.users(id,email,email_confirmed_at) values
 ('a1500000-0000-4000-8000-000000000001','legacy-editor@example.test',now()),
 ('a1500000-0000-4000-8000-000000000002','reader@example.test',now());
update public.profiles set is_editor=true,is_author=true where id='a1500000-0000-4000-8000-000000000001';
update public.profiles set display_name='Synthetic Reader' where id='a1500000-0000-4000-8000-000000000002';
insert into public.stories(id,slug,headline,status,access_level,published_at,author_id,created_by) values
 ('b1500000-0000-4000-8000-000000000001','ct15-public','Synthetic public story','published','public',now()-interval '1 day','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001'),
 ('b1500000-0000-4000-8000-000000000002','ct15-draft','Synthetic private draft','draft','public',null,'a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001'),
 ('b1500000-0000-4000-8000-000000000003','ct15-registered','Synthetic registered story','published','registered',now()-interval '1 day','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001'),
 ('b1500000-0000-4000-8000-000000000004','ct15-premium','Synthetic paid story','published','premium',now()-interval '1 day','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001');
insert into public.story_revisions(story_id,headline,slug,author_id,created_by) values
 ('b1500000-0000-4000-8000-000000000001','Synthetic unpublished revision','ct15-public','a1500000-0000-4000-8000-000000000001','a1500000-0000-4000-8000-000000000001');
