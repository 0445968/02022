import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');
const baseline = read('tests/fixtures/ct02f-original-publisher.sql');
const migration = read('supabase/migrations/20261124001339_ct02f_publisher_versions.sql');
const executable = migration.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');

test('publisher original transactional body is byte-for-byte preserved after authorization block',()=>{
  const marker = '  /*\n   * Lock the live story so two publication operations cannot';
  const old = baseline.indexOf(marker), now = migration.indexOf(marker);
  assert.ok(old>0&&now>0,'lock and publish body exists');
  assert.equal(
    migration.slice(now,migration.indexOf('$function$',now)),
    baseline.slice(old,baseline.indexOf('$function$',old)),
    'every version insert, relation update, publication timestamp and revision deletion step is preserved'
  );
});

test('privileged RPC verifies actual Supabase caller and current edit and dual publishing permissions',()=>{
  assert.match(executable,/SELECT auth\.uid\(\) INTO v_authenticated_user_id/);
  assert.match(executable,/v_authenticated_user_id IS DISTINCT FROM p_user_id/);
  assert.match(executable,/newsroom_private\.has_staff_permission\(\s*'story\.edit_all'/);
  assert.match(executable,/newsroom_private\.has_staff_permission\(\s*'story\.publish'/);
  assert.match(executable,/newsroom_private\.has_staff_permission\(\s*'revision\.publish'/);
  assert.doesNotMatch(executable,/v_is_editor|from public\.profiles/i);
  assert.match(executable,/revoke all on function public\.publish_story_revision\(uuid,uuid\)/);
  assert.match(executable,/grant execute on function public\.publish_story_revision\(uuid,uuid\)/);
  assert.match(executable,/to authenticated/);
  assert.doesNotMatch(executable,/grant execute on function public\.publish_story_revision\(uuid,uuid\)[\s\S]*to anon/);
});

test('historical-version RLS removes restored direct editor/author flag escape hatches',()=>{
  for(const s of ['versions_insert_staff','versions_select_editor','versions_select_own_author']){
    assert.ok(migration.includes('drop policy if exists '+s),s);
  }
  assert.match(migration,/create policy ct02f_versions_read_staff/);
  assert.match(migration,/create policy ct02f_versions_insert_staff/);
  assert.match(migration,/created_by = \(select auth\.uid\(\)\)/);
  assert.match(migration,/create trigger ct02f_story_version_snapshot_guard/);
});

test('version snapshot guard verifies actual current story fields, not a forgable arbitrary copy',()=>{
  for(const field of ['headline','short_title','subheadline','summary','body',
    'author_id','editor_id','language','primary_category_id']){
    assert.ok(executable.includes('s.'+field+' is not distinct from new.'+field),field);
  }
});

test('restore flow snapshots actual confirmed row including original author/editor/byline links',()=>{
  const stories=read('lib/services/stories.ts');
  const restoration=stories.slice(stories.indexOf('export async function restoreStoryVersion('));
  assert.match(restoration,/\.update\(restoredContent\)[\s\S]*?\.select(?:<[^]*?>)?\(\s*'headline, short_title/);
  for(const field of ['short_title','author_id','editor_id','language','primary_category_id']){
    assert.ok(restoration.includes(field+': restoredRow.'+field),field);
  }
  assert.match(restoration,/if \(restoreError \|\| !restoredRow\)/);
});

test('CT-02f does not silently claim media storage or public article cutover',()=>{
  assert.doesNotMatch(executable,/drop policy if exists media_|drop policy if exists media_bucket_|alter table storage\.objects/i);
  assert.doesNotMatch(executable,/drop policy if exists stories_select_public/i);
});
