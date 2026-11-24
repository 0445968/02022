import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {assertDisposableTarget,PRODUCTION_SUPABASE_REF} from '../scripts/clear-talks-disposable-guard.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('real JWT/Storage probe rejects live production, URL mismatch and unacknowledged writes',()=>{
  const disposable='abcdefghijklmnopqrst';
  assert.throws(()=>assertDisposableTarget('https://'+PRODUCTION_SUPABASE_REF+'.supabase.co/',PRODUCTION_SUPABASE_REF,'YES_DISPOSABLE_WRITES'),/production/);
  assert.throws(()=>assertDisposableTarget('https://'+PRODUCTION_SUPABASE_REF+'.supabase.co/',disposable,'YES_DISPOSABLE_WRITES'),/URL/);
  assert.throws(()=>assertDisposableTarget('http://'+disposable+'.supabase.co/',disposable,'YES_DISPOSABLE_WRITES'),/URL/);
  assert.throws(()=>assertDisposableTarget('https://'+disposable+'.supabase.co/',disposable,''),/acknowledgment/);
  assert.equal(assertDisposableTarget('https://'+disposable+'.supabase.co/',disposable,'YES_DISPOSABLE_WRITES'),'https://'+disposable+'.supabase.co/');
});
test('real smoke uses Auth JWT, signed private previews, SHA match, and cross bucket copy',()=>{
  const s=read('scripts/ct02k-disposable-supabase-e2e.mjs');
  for(const token of ['signInWithPassword','createSignedUrl(sourcePath,60)',"destinationBucket:'media'","sha","media_private_drafts","media_public_assets"]) assert.ok(s.includes(token),token);
  assert.doesNotMatch(s,/SERVICE_ROLE|service_role.*key/);
});
test('real JWT/Storage workflow is manual only and requires external test credentials',()=>{
 const s=read('.github/workflows/ct02k-real-supabase-e2e.yml');
 assert.match(s,/workflow_dispatch:/);
 assert.doesNotMatch(s,/push:|pull_request:/);
 assert.match(s,/disposable_ref:/);
});
