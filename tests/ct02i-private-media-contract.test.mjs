import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261124013801_ct02i_private_media_drafts.sql');
test('private bucket does not replace the existing public bucket or expose catalog',()=>{
  assert.match(migration,/insert into storage\.buckets\(id,name,public,file_size_limit,allowed_mime_types\)/);
  assert.match(migration,/'media-drafts',\s*'media-drafts',\s*false/);
  assert.doesNotMatch(migration,/update storage\.buckets|delete from storage\.objects|update public\.media_assets/i);
  assert.match(migration,/revoke all on public\.media_private_drafts from public,anon,authenticated/);
  assert.match(migration,/grant select,insert on public\.media_private_drafts to authenticated/);
});
test('private storage requires live capability, path owner match, and disallows overwrite',()=>{
  for(const s of ['ct02i_storage_private_read','ct02i_storage_private_insert','ct02i_storage_private_orphan_cleanup']){
    assert.ok(migration.includes('create policy '+s),s);
  }
  assert.doesNotMatch(migration,/create policy ct02i_storage_private_update/i);
  assert.match(migration,/owner_id=\(select auth\.uid\(\)\)::text/);
  assert.match(migration,/newsroom_private\.has_staff_permission\('media\.upload'\)/);
  assert.match(migration,/not exists \(/);
});
test('private upload checks actual bytes, user and both flags and returns no public URL',()=>{
  const route=read('app/api/media/drafts/route.ts');
  const flags=read('lib/permissions/private-draft-media.ts');
  const helper=read('lib/services/private-media.ts');
  assert.match(flags,/CT_STAFF_ACCESS_V2_ENABLED === 'true'/);
  assert.match(flags,/CT_MEDIA_PRIVATE_DRAFTS_ENABLED === 'true'/);
  assert.match(route,/isDevAuthBypass\(\)/);
  assert.match(route,/await mayUploadMedia\(user\)/);
  assert.match(route,/hasExpectedImageSignature\(file\.type,prefix\)/);
  assert.match(helper,/case 'image\/jpeg'/);
  assert.match(helper,/case 'image\/avif'/);
  assert.match(route,/\.from\('media-drafts'\)\.upload/);
  assert.match(route,/\.from\('media_private_drafts'\)/);
  assert.doesNotMatch(route,/getPublicUrl|service_role|SERVICE_ROLE|NEXT_PUBLIC_.*KEY/);
  assert.match(read('app/api/media/upload/route.ts'),/if \(privateDraftMediaEnabled\(\)\)/);
});
test('private preview is RLS constrained and signed link expires after 60 seconds',()=>{
  const route=read('app/api/media/drafts/[id]/preview/route.ts');
  assert.match(route,/await mayListMedia\(user\)/);
  assert.match(route,/\.from\('media_private_drafts'\)/);
  assert.match(route,/PREVIEW_TTL_SECONDS=60/);
  assert.match(route,/createSignedUrl\(draft\.storage_path,PREVIEW_TTL_SECONDS\)/);
  assert.match(route,/private, no-store/);
  assert.doesNotMatch(route,/getPublicUrl|service_role|SERVICE_ROLE/);
});
