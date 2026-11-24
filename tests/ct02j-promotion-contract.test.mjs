import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const sql=file('supabase/migrations/20261124020117_ct02j_media_promotion.sql');
const approve=file('app/api/media/drafts/[id]/approve/route.ts');
const list=file('app/api/media/drafts/route.ts');
const reject=file('app/api/media/drafts/[id]/reject/route.ts');
test('only valid review transitions can publish a matching approved public media asset',()=>{
  assert.match(sql,/create trigger ct02j_private_media_review_guard/);
  assert.match(sql,/returns trigger language plpgsql security invoker/);
  for(const state of ['pending','publishing','published','rejected','failed']) assert.ok(sql.includes("'"+state+"'"));
  assert.match(sql,/m\.storage_path=new\.publication_path/);
  assert.match(sql,/m\.status='approved'/);
  assert.match(sql,/m\.approved_by=\(select auth\.uid\(\)\)/);
  assert.match(sql,/new\.source_sha256 is null/);
  assert.match(sql,/new\.reviewed_by is distinct from \(select auth\.uid\(\)\)/);
});
test('approved Storage destinations must match a claimed private draft and reviewer',()=>{
  assert.match(sql,/create policy ct02j_storage_approved_copy_insert/);
  assert.match(sql,/d\.publication_path=name/);
  assert.match(sql,/d\.state='publishing'/);
  assert.match(sql,/d\.reviewed_by=\(select auth\.uid\(\)\)/);
  assert.match(sql,/media\.approve'/);
  assert.doesNotMatch(sql,/update storage\.buckets|drop bucket|delete from public\.media_assets/i);
});
test('promotion requires session and independent approval, edit, upload, view grants',()=>{
  assert.match(approve,/privateDraftMediaEnabled\(\)/);
  assert.match(approve,/isDevAuthBypass\(\)/);
  for(const permission of ['media.approve','media.edit_all','media.upload','media.view_all']) {
    assert.ok(approve.includes("resolveStaffPermissionOnServer('"+permission+"')"));
  }
  assert.doesNotMatch(approve,/SERVICE_ROLE|service_role|user_metadata/);
});
test('private and public file hashes are verified; cross-bucket copy never overwrites or moves original',()=>{
  assert.match(list,/source_sha256:sha256/);
  assert.match(approve,/digest\(sourceBlob\)!==draft\.source_sha256/);
  assert.match(approve,/\.copy\(draft\.storage_path,destPath,\{destinationBucket:'media'\}\)/);
  assert.match(approve,/digest\(publicBlob\)!==draft\.source_sha256/);
  assert.match(approve,/\.eq\('storage_path',destPath\)\.maybeSingle\(\)/);
  assert.doesNotMatch(approve,/\.move\(|upsert:\s*true|\.remove\(/);
});
test('retry is idempotent and never silently reapproves changed rights',()=>{
  assert.match(approve,/draft\.reviewed_by!==user\.id/);
  assert.match(approve,/draft\.publication_path!==destPath/);
  assert.match(approve,/Retry must retain original rights decision/);
  assert.match(approve,/REVIEW_LEASE_MS=15\*60\*1000/);
  assert.match(approve,/\.eq\('attempt_count',draft\.attempt_count\?\?0\)/);
  assert.match(approve,/state:'failed',last_error:'Promotion needs a verified retry'/);
});
test('rejection captures a real audit reason and cannot reject an active promotion',()=>{
  assert.match(reject,/media\.approve/);
  assert.match(reject,/media\.edit_all/);
  assert.match(reject,/\.eq\('id',params\.id\)\.eq\('state','pending'\)/);
  assert.doesNotMatch(reject,/\.remove\(/);
});
