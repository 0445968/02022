-- SYNTHETIC platform shapes for disposable PostgreSQL only. No hosted Auth or Storage service.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create schema auth;
create schema storage;
create table auth.users(
 id uuid primary key, email text, email_confirmed_at timestamptz,
 is_anonymous boolean not null default false, deleted_at timestamptz,banned_until timestamptz
);
create function auth.uid() returns uuid stable language sql as $$
 select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
grant usage on schema auth to anon,authenticated,service_role;
grant execute on function auth.uid() to anon,authenticated,service_role;
create table storage.buckets(id text primary key,name text not null,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text references storage.buckets(id),name text not null,owner_id text,unique(bucket_id,name));
alter table storage.objects enable row level security;
grant usage on schema storage to anon,authenticated,service_role;
grant select on storage.objects to anon;
grant select,insert,update,delete on storage.objects to authenticated;
grant all on storage.buckets,storage.objects to service_role;

-- Same test-only Storage operation contract used by CT05b4b quota tests.
-- This is not a real Storage API or a deployable implementation.
create function storage.allow_only_operation(expected_operation text)
returns boolean language sql stable as $fn$
 select coalesce(current_setting('test.storage_operation',true)=expected_operation,false)
$fn$;
