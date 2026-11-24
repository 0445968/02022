import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const sql=readFileSync(new URL('../supabase/migrations/20261124003447_ct02g_media_storage_security.sql',import.meta.url),'utf8');
const code=sql.split('\n').filter(s=>!s.trimStart().startsWith('--')).join('\n');

test('public view explicitly whitelists safe public media fields and checks approval/embargo',()=>{
  assert.match(code,/create view public\.media_public_assets with \(security_barrier = true\)/);
  const view=code.slice(code.indexOf('create view public.media_public_assets'),code.indexOf('revoke all on public.media_public_assets'));
  for(const field of ['m.id','m.url','m.alt_text','m.caption','m.credit','m.width','m.height'])assert.ok(view.includes(field));
  for(const field of ['internal_notes','rights_notes','restrictions','uploaded_by','latitude','longitude','checksum'])assert.ok(!view.includes('m.'+field),field);
  assert.match(view,/m.status = 'approved'/);
  assert.match(view,/m.embargo_until is null or m.embargo_until <= now\(\)/);
  assert.match(code,/grant select on public.media_public_assets to anon, authenticated/);
});

test('raw metadata is never direct-public and readers cannot use staff select',()=>{
  assert.match(code,/drop policy if exists media_select_public/);
  assert.match(code,/revoke select on public.media_assets from anon/);
  assert.match(code,/create policy ct02g_media_select_staff[\s\S]*to authenticated using/);
  assert.doesNotMatch(code,/\bprofiles\b|\bis_editor\b|\bis_author\b|user_metadata/);
});

test('media write and storage insert require current member plus authenticated upload identity',()=>{
  assert.match(code,/newsroom_private.has_staff_permission\('media.upload'\)/);
  assert.match(code,/uploaded_by = \(select auth.uid\(\)\)/);
  assert.match(code,/owner_id = \(select auth.uid\(\)\)::text/);
  assert.match(code,/create trigger ct02g_media_asset_write_guard/);
  assert.match(code,/new.status = 'approved'/);
  assert.match(code,/newsroom_private.has_staff_permission\('media.approve'/);
  assert.match(code,/newsroom_private.has_staff_permission\('media.delete'/);
});

test('storage policies retire legacy staff flags; upsert and deletion are separate decisions',()=>{
  for(const op of ['read','insert','update','delete'])assert.ok(code.includes('drop policy if exists media_bucket_'+op+'_staff'));
  for(const op of ['select','insert','update','delete'])assert.ok(code.includes('create policy ct02g_storage_'+op+'_staff'));
  assert.match(code,/create policy ct02g_storage_update_staff[\s\S]*with check/);
  assert.match(code,/not exists\([\s\S]*from public.media_assets m/);
  assert.doesNotMatch(code,/update storage.buckets set public = false|drop bucket/i);
});
