import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const migration = readFileSync(new URL('../supabase/migrations/20261123235430_ct02e_story_revision_rls.sql',import.meta.url),'utf8');

test('staff helper is invoker-scoped in an unexposed schema and never trusts legacy profile flags', () => {
  assert.match(migration, /create schema if not exists newsroom_private/);
  assert.match(migration, /security invoker/g);
  assert.doesNotMatch(migration, /security definer/i);
  assert.doesNotMatch(migration, /is_editor|is_author|user_metadata|DEV_AUTH_BYPASS/i);
  assert.match(migration, /where m\.auth_user_id = \(select auth\.uid\(\)\)/);
});

test('legacy story and revision role policies are removed and replaced', () => {
  for (const name of [
    'stories_select_editor','stories_select_own_author','stories_insert_staff',
    'stories_update_editor','stories_update_own_author','stories_delete_editor',
  ]) assert.ok(migration.includes('drop policy if exists '+name),name);
  for (const name of [
    'ct02e_stories_select_staff','ct02e_stories_insert_staff',
    'ct02e_stories_update_staff','ct02e_stories_delete_staff',
    'ct02e_revisions_select_staff','ct02e_revisions_insert_staff',
    'ct02e_revisions_update_staff','ct02e_revisions_delete_staff',
  ]) assert.ok(migration.includes('create policy '+name),name);
});

test('published story public visibility is deliberately preserved', () => {
  assert.doesNotMatch(migration,/drop policy if exists stories_select_public/i);
  assert.doesNotMatch(migration,/alter table public\.stories disable row level security/i);
  assert.match(migration,/created_by = \(select auth\.uid\(\)\)/);
});

test('new member revocation and explicit deny are checked from live RLS rows', () => {
  assert.match(migration,/m\.status = 'active'/);
  assert.match(migration,/m\.expires_at > now\(\)/);
  assert.match(migration,/o\.effect = 'deny'/);
  assert.match(migration,/o\.expires_at > now\(\)/);
  assert.match(migration,/a\.status = 'active'/);
  assert.match(migration,/p_capability <> 'media\.edit_own'/);
});

test('unassigned edits cannot publish or reassign an article at SQL layer', () => {
  assert.match(migration,/create trigger ct02e_guard_story_update/);
  assert.match(migration,/create trigger ct02e_guard_revision_write/);
  assert.match(migration,/new\.author_id is distinct from old\.author_id/);
  assert.match(migration,/new\.access_level is distinct from old\.access_level/);
  assert.match(migration,/story\.publish'/);
  assert.match(migration,/story\.schedule'/);
});

test('publisher and media/storage policies are NOT yet claimed as migrated', () => {
  assert.doesNotMatch(migration,/drop policy if exists media_|drop policy if exists versions_|create or replace function public\.publish_story_revision/i);
  assert.doesNotMatch(migration,/drop policy if exists media_bucket_/);
});
