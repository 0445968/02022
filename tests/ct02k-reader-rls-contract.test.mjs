import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const sql=read('supabase/migrations/20261124021851_ct02k_reader_comments_rls.sql');
test('old is_editor comment and report policies removed by staged cutover',()=>{
  for(const name of ['Editors can read all comments','Readers and editors can update comments',
   'Editors can permanently delete comments','Editors can view all comment reports',
   'Editors can update comment reports']){
    assert.ok(sql.includes('drop policy if exists "'+name+'"'),name);
  }
  assert.doesNotMatch(sql,/profile\.is_editor\s*=\s*true/);
});
test('reader bookmark INSERT independently verifies live published story',()=>{
  assert.match(sql,/ct02k_bookmarks_insert_published/);
  assert.match(sql,/story\.published_at <= now\(\)/);
  assert.match(sql,/user_id = \(select auth\.uid\(\)\)/);
  assert.ok(!sql.includes('drop policy if exists "Readers can view their own bookmarks"'));
  assert.ok(!sql.includes('drop policy if exists "Readers can delete their own bookmarks"'));
});
test('readers retain own comments while moderators require current capabilities',()=>{
  assert.match(sql,/ct02k_comments_reader_update/);
  assert.match(sql,/ct02k_comments_moderator_update/);
  assert.match(sql,/comment\.view_queue/);
  assert.match(sql,/comment\.moderate/);
  assert.match(sql,/old\.status='deleted'/);
  assert.match(sql,/new\.body='\[deleted\]'/);
  assert.match(sql,/newsroom_private\.guard_comment_writes/);
  assert.ok(!sql.includes('drop policy if exists "Anyone can read published comments"'));
});
test('reports require independent current manager grant and audited actor',()=>{
  assert.match(sql,/comment\.manage_reports/);
  assert.match(sql,/new\.reviewed_by is distinct from \(select auth\.uid\(\)\)/);
  assert.match(sql,/ct02k_reports_reader_create/);
  assert.match(sql,/s\.status='published'/);
  assert.match(sql,/old\.status in \('dismissed','actioned'\)/);
});
