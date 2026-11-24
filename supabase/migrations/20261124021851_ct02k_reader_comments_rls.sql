-- CT-02k: isolated reader/comment moderation and direct bookmark RLS.
-- STAGED ONLY. Supabase CLI v3.2.0 filename from Actions 45311410978.
-- No hosted changes; prior CT-02b/c/e/f/g/h/i/j must be reviewed and staged
-- with verified owner grants, restorable backup and migration reconciliation.
begin;

-- Preserve reader-bookmark ownership. Direct PostgREST creation must also
-- verify the story is actually published, not merely accept a known UUID.
drop policy if exists "Readers can create their own bookmarks" on public.bookmarks;
create policy ct02k_bookmarks_insert_published
on public.bookmarks for insert to authenticated with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.stories story
    where story.id = story_id
      and story.status = 'published'
      and story.published_at is not null
      and story.published_at <= now()
  )
);
-- Existing SELECT and DELETE owner policies remain in force. Reader access
-- to existing saved/unpublished bookmarks is NOT revoked by this insertion
-- policy; this preserves account cleanup and reader-facing history.

-- Remove old editor booleans from every direct comments/reports operation.
drop policy if exists "Editors can read all comments" on public.comments;
drop policy if exists "Readers and editors can update comments" on public.comments;
drop policy if exists "Editors can permanently delete comments" on public.comments;
drop policy if exists "Editors can view all comment reports" on public.comment_reports;
drop policy if exists "Editors can update comment reports" on public.comment_reports;

-- Public published-comment and individual reader-owned comment SELECT rules
-- from the restored database remain unchanged.
create policy ct02k_comments_staff_read
on public.comments for select to authenticated using (
  newsroom_private.has_staff_permission('comment.view_queue')
  or newsroom_private.has_staff_permission('comment.moderate')
);
create policy ct02k_comments_reader_update
on public.comments for update to authenticated using (
  user_id = (select auth.uid())
  and status <> 'deleted'::public.comment_status
) with check (
  user_id = (select auth.uid())
  and status in ('pending','deleted')
);
create policy ct02k_comments_moderator_update
on public.comments for update to authenticated using (
  newsroom_private.has_staff_permission('comment.moderate')
) with check (
  newsroom_private.has_staff_permission('comment.moderate')
);
create policy ct02k_comments_moderator_delete
on public.comments for delete to authenticated using (
  newsroom_private.has_staff_permission('comment.moderate')
);

-- Reports are independent personal reader records. A reader can view their
-- own report, but only a CURRENT comment report manager may view the whole
-- queue or update its disposition.
create policy ct02k_reports_staff_read
on public.comment_reports for select to authenticated using (
  newsroom_private.has_staff_permission('comment.manage_reports')
);
create policy ct02k_reports_staff_update
on public.comment_reports for update to authenticated using (
  newsroom_private.has_staff_permission('comment.manage_reports')
) with check (
  newsroom_private.has_staff_permission('comment.manage_reports')
  and reviewed_by = (select auth.uid())
);

-- Existing reader reports INSERT requires status=open, own reporter ID and
-- a published third-party comment. Add the published-story visibility check
-- so an unpublished old story cannot accept a new report through Data API.
drop policy if exists "Readers can create comment reports" on public.comment_reports;
create policy ct02k_reports_reader_create
on public.comment_reports for insert to authenticated with check (
  reporter_id = (select auth.uid())
  and status = 'open'::public.comment_report_status
  and reviewed_by is null
  and reviewed_at is null
  and exists (
    select 1
    from public.comments c
    join public.stories s on s.id=c.story_id
    where c.id=comment_id
      and c.status='published'::public.comment_status
      and c.user_id is distinct from (select auth.uid())
      and s.status='published'
      and s.published_at is not null
      and s.published_at<=now()
  )
);

-- Defense in depth: a direct UPDATE with a reader's JWT must never be able
-- to publish a comment, revive a deleted one, change its story/account ID,
-- or retain the original body when erasing the comment. Supabase column-level
-- privileges remain narrow; this protects future privilege drift too.
create function newsroom_private.guard_comment_writes()
returns trigger language plpgsql security invoker set search_path=''
as $ct02k$
declare
  v_moderator boolean;
begin
  if current_user <> 'authenticated' then return new; end if;

  if tg_op='INSERT' then
    if new.user_id is distinct from (select auth.uid())
      or new.status is distinct from 'pending'::public.comment_status
      or new.created_at is distinct from new.updated_at then
      raise exception 'Comment must be a new pending reader submission'
        using errcode='42501';
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.story_id is distinct from old.story_id
    or new.user_id is distinct from old.user_id
    or new.parent_id is distinct from old.parent_id
    or new.created_at is distinct from old.created_at then
    raise exception 'Comment identity and thread are immutable'
      using errcode='42501';
  end if;

  v_moderator := newsroom_private.has_staff_permission('comment.moderate');
  if v_moderator then
    -- Moderators can review content, but never change ownership/thread ID.
    -- The existing updated_at trigger records the actual update time.
    return new;
  end if;

  if new.user_id is distinct from (select auth.uid())
     or old.status='deleted'::public.comment_status then
    raise exception 'Only the owner may edit a nondeleted comment'
      using errcode='42501';
  end if;

  if new.status='deleted'::public.comment_status
    and new.body='[deleted]' then
    return new;
  end if;

  if new.status='pending'::public.comment_status
    and char_length(btrim(new.body)) between 1 and 5000 then
    return new;
  end if;
  raise exception 'Reader cannot publish, revive or hide a comment'
    using errcode='42501';
end;
$ct02k$;

create trigger ct02k_comment_write_guard
before insert or update on public.comments for each row
execute function newsroom_private.guard_comment_writes();

-- A report's target/reporter/reason cannot be changed by a moderator using
-- Data API. Resolution must record a current reviewer and timestamp.
create function newsroom_private.guard_comment_report_review()
returns trigger language plpgsql security invoker set search_path=''
as $ct02k$
begin
  if current_user <> 'authenticated' then return new; end if;
  if tg_op='INSERT' then
    if new.reporter_id is distinct from (select auth.uid())
      or new.status is distinct from 'open'::public.comment_report_status
      or new.reviewed_by is not null or new.reviewed_at is not null then
      raise exception 'Reports start as unreviewed self-owned submissions'
        using errcode='42501';
    end if;
    return new;
  end if;

  if not newsroom_private.has_staff_permission('comment.manage_reports')
    or new.id is distinct from old.id
    or new.comment_id is distinct from old.comment_id
    or new.reporter_id is distinct from old.reporter_id
    or new.reason is distinct from old.reason
    or new.created_at is distinct from old.created_at
    or new.reviewed_by is distinct from (select auth.uid())
    or new.reviewed_at is null
    or new.status not in ('reviewed','dismissed','actioned')
    or old.status in ('dismissed','actioned')
    or (old.reviewed_by is not null
      and old.reviewed_by is distinct from (select auth.uid())) then
    raise exception 'Comment report disposition requires current authorized review'
      using errcode='42501';
  end if;
  return new;
end;
$ct02k$;

create trigger ct02k_comment_report_guard
before insert or update on public.comment_reports for each row
execute function newsroom_private.guard_comment_report_review();

revoke all on function newsroom_private.guard_comment_writes()
from public,anon,authenticated;
revoke all on function newsroom_private.guard_comment_report_review()
from public,anon,authenticated;

commit;
