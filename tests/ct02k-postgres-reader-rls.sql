-- CT-02k PostgreSQL 17 disposable reader / comment / report RLS suite.
-- Never point this at restored production.
\set ON_ERROR_STOP on
\i tests/ct02e-postgres-rls.sql

create type public.comment_status as enum('pending','published','hidden','deleted');
create type public.comment_report_status as enum('open','reviewed','dismissed','actioned');

create table public.bookmarks(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  story_id uuid not null references public.stories(id),
  created_at timestamptz not null default now(),
  unique(user_id,story_id)
);
create table public.comments(
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id),
  user_id uuid references public.profiles(id),
  parent_id uuid references public.comments(id),
  body text not null check (char_length(btrim(body)) between 1 and 5000),
  status public.comment_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.comment_reports(
  id uuid primary key default gen_random_uuid(),
  comment_id uuid not null references public.comments(id),
  reporter_id uuid not null references public.profiles(id),
  reason text not null check(char_length(btrim(reason)) between 3 and 1000),
  status public.comment_report_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(comment_id,reporter_id)
);
alter table public.bookmarks enable row level security;
alter table public.comments enable row level security;
alter table public.comment_reports enable row level security;
grant select,insert,delete on public.bookmarks to authenticated;
grant select,insert,update,delete on public.comments to authenticated;
grant select on public.comments to anon;
grant select,insert,update on public.comment_reports to authenticated;

-- Rebuild restored legacy policy names to exercise their actual retirement.
create policy "Readers can view their own bookmarks" on public.bookmarks
  for select to authenticated using (auth.uid()=user_id);
create policy "Readers can create their own bookmarks" on public.bookmarks
  for insert to authenticated with check (auth.uid()=user_id);
create policy "Readers can delete their own bookmarks" on public.bookmarks
  for delete to authenticated using (auth.uid()=user_id);

create policy "Anyone can read published comments" on public.comments
  for select to anon,authenticated using (
    status='published' and exists(
      select 1 from public.stories s where s.id=story_id
        and s.status='published' and s.published_at<=now()
    )
  );
create policy "Readers can read their own comments" on public.comments
  for select to authenticated using (auth.uid()=user_id);
create policy "Readers can create comments" on public.comments
  for insert to authenticated with check (
    auth.uid()=user_id and status='pending'
    and exists(select 1 from public.stories s where s.id=story_id
      and s.status='published' and s.published_at<=now())
  );
create policy "Editors can read all comments" on public.comments
  for select to authenticated using (exists(
    select 1 from public.profiles p where p.id=auth.uid() and p.is_editor));
create policy "Readers and editors can update comments" on public.comments
  for update to authenticated using(
    auth.uid()=user_id or exists(select 1 from public.profiles p
      where p.id=auth.uid() and p.is_editor)
  ) with check(
    (auth.uid()=user_id and status in('pending','deleted'))
    or exists(select 1 from public.profiles p
      where p.id=auth.uid() and p.is_editor)
  );
create policy "Editors can permanently delete comments" on public.comments
  for delete to authenticated using (exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.is_editor));

create policy "Readers can view their own reports" on public.comment_reports
  for select to authenticated using(auth.uid()=reporter_id);
create policy "Editors can view all comment reports" on public.comment_reports
  for select to authenticated using(exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.is_editor));
create policy "Readers can create comment reports" on public.comment_reports
  for insert to authenticated with check(
    auth.uid()=reporter_id and status='open' and exists(
      select 1 from public.comments c where c.id=comment_id and
      c.status='published' and c.user_id is distinct from auth.uid()
    )
  );
create policy "Editors can update comment reports" on public.comment_reports
  for update to authenticated using(exists(select 1 from public.profiles p
    where p.id=auth.uid() and p.is_editor))
  with check(exists(select 1 from public.profiles p where
    p.id=auth.uid() and p.is_editor) and (reviewed_by is null or reviewed_by=auth.uid()));

\i supabase/migrations/20261124021851_ct02k_reader_comments_rls.sql

-- Isolated test-only grants. Absolutely none of these are seeded to hosted DB.
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select r.id,k::public.staff_capability_key,'all'
from public.staff_role_presets r
cross join (values('comment.view_queue'),('comment.moderate'),('comment.manage_reports')) keys(k)
where r.role_key='editor';

insert into public.comments(id,story_id,user_id,body,status)
values
('41000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Approved public comment','published'),
('41000000-0000-0000-0000-000000000002','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000005','My pending comment','pending'),
('41000000-0000-0000-0000-000000000003','20000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-000000000003','Another pending comment','pending'),
('41000000-0000-0000-0000-000000000004','20000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000003','Unpublished story comment','published');
insert into public.comment_reports(id,comment_id,reporter_id,reason)
values('42000000-0000-0000-0000-000000000001','41000000-0000-0000-0000-000000000001',
 '00000000-0000-0000-0000-000000000005','Visible misinformation');

-- No historical staff flag may retain additional privilege.
do $$
begin
if exists(select 1 from pg_policies
  where schemaname='public' and policyname in(
    'Editors can read all comments','Readers and editors can update comments',
    'Editors can permanently delete comments','Editors can view all comment reports',
    'Editors can update comment reports','Readers can create their own bookmarks'
  )) then raise exception 'A legacy policy survived CT-02k'; end if;
if not exists(select 1 from pg_policies
  where schemaname='public' and policyname='Anyone can read published comments')
  then raise exception 'Published-comment reader policy regressed'; end if;
end $$;

-- Public users can read published threads but not private account content.
begin;
set local role anon;
do $$
begin
 if (select count(*) from public.comments)<>1 then
   raise exception 'Public thread visibility changed'; end if;
 if has_table_privilege('anon','public.comment_reports','SELECT') then
   raise exception 'Anonymous acquired report access'; end if;
end $$;
rollback;

-- Reader sees their own pending and published comments, not unrelated drafts.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $$
declare n integer;
begin
 if (select count(*) from public.comments)<>2 then
   raise exception 'Reader did not see public and own pending comments'; end if;
 if (select count(*) from public.comment_reports)<>1 then
   raise exception 'Reader lost own report'; end if;
 begin
   insert into public.bookmarks(user_id,story_id) values
     (auth.uid(),'20000000-0000-0000-0000-000000000002');
   raise exception 'Reader saved unpublished draft via Data API';
 exception when insufficient_privilege then null;
 end;
 insert into public.bookmarks(user_id,story_id)
 values (auth.uid(),'20000000-0000-0000-0000-000000000001');
 if (select count(*) from public.bookmarks)<>1 then
   raise exception 'Reader could not save published article'; end if;
 begin
   insert into public.bookmarks(user_id,story_id)
   values ('00000000-0000-0000-0000-000000000003',
     '20000000-0000-0000-0000-000000000001');
   raise exception 'Reader forged another account bookmark';
 exception when insufficient_privilege then null;
 end;
 insert into public.comments(story_id,user_id,body)
 values('20000000-0000-0000-0000-000000000001',auth.uid(),'New unreviewed comment');
 begin
   insert into public.comments(story_id,user_id,body,status)
   values('20000000-0000-0000-0000-000000000001',auth.uid(),'Forged published comment','published');
   raise exception 'Reader self published comment';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.comments set status='published' where id='41000000-0000-0000-0000-000000000002';
   raise exception 'Reader published own pending comment';
 exception when insufficient_privilege then null;
 end;
 begin
   update public.comments set body='Still my comment',status='hidden'
   where id='41000000-0000-0000-0000-000000000002';
   raise exception 'Reader self-hid their comment';
 exception when insufficient_privilege then null;
 end;
 update public.comments set body='Edited for a new review',status='pending'
 where id='41000000-0000-0000-0000-000000000002';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Reader lost edit-returns-to-review'; end if;
 begin
   update public.comments set body='Keeping my old comment text',status='deleted'
     where id='41000000-0000-0000-0000-000000000002';
   raise exception 'Deleted comment retained original body';
 exception when insufficient_privilege then null;
 end;
 update public.comments set body='[deleted]',status='deleted'
 where id='41000000-0000-0000-0000-000000000002';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Reader could not soft delete own comment'; end if;
 update public.comments set body='Revived',status='pending'
 where id='41000000-0000-0000-0000-000000000002';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Reader revived deleted comment'; end if;
 begin
   insert into public.comment_reports(comment_id,reporter_id,reason)
   values('41000000-0000-0000-0000-000000000004',
    auth.uid(),'Report an unpublished story comment');
   raise exception 'Reader reported comment attached to unpublished story';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;

-- Revoked former editor with is_editor=true may only see published threads
-- (plus their own comments/reports) and cannot moderate existing private data.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000004';
do $$
declare n integer;
begin
 if (select count(*) from public.comments)<>1 then
   raise exception 'Revoked editor still sees private comments'; end if;
 if (select count(*) from public.comment_reports)<>0 then
   raise exception 'Revoked editor still sees private report queue'; end if;
 update public.comments set status='hidden'
 where id='41000000-0000-0000-0000-000000000001';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Revoked editor moderated public comment'; end if;
 delete from public.comments where id='41000000-0000-0000-0000-000000000001';
 get diagnostics n=row_count;
 if n<>0 then raise exception 'Revoked editor permanently deleted comment'; end if;
end $$;
rollback;

-- Current editor role can manage the queue; reviewer identity/status must
-- be verified by DB, not by a client-supplied 'editor' value.
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$
declare n integer;
begin
 if (select count(*) from public.comments)<>4 then
   raise exception 'Active moderator cannot read current pending queue'; end if;
 update public.comments set status='published'
 where id='41000000-0000-0000-0000-000000000002';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Active moderator cannot approve pending comment'; end if;
 begin
  update public.comment_reports
  set status='actioned',reviewed_by='00000000-0000-0000-0000-000000000005',
      reviewed_at=now()
  where id='42000000-0000-0000-0000-000000000001';
  raise exception 'Moderator forged report reviewer';
 exception when insufficient_privilege then null;
 end;
 update public.comment_reports
 set status='reviewed',reviewed_by=auth.uid(),reviewed_at=now()
 where id='42000000-0000-0000-0000-000000000001';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Reviewer cannot mark report reviewed'; end if;
 update public.comment_reports
 set status='actioned',reviewed_by=auth.uid(),reviewed_at=now()
 where id='42000000-0000-0000-0000-000000000001';
 get diagnostics n=row_count;
 if n<>1 then raise exception 'Reviewer cannot resolve report'; end if;
 begin
   update public.comment_reports
   set status='open',reviewed_by=auth.uid(),reviewed_at=now()
   where id='42000000-0000-0000-0000-000000000001';
   raise exception 'Moderator reopened terminal report';
 exception when insufficient_privilege then null;
 end;
end $$;
rollback;

select 'CT-02k reader/comments/bookmarks/report direct RLS passed' as result;
