/**
 * CT-02k manual REAL Auth/JWT/PostgREST/Storage probe. DISPOSABLE ONLY.
 * Requires a freshly created separate project, reviewed staged migrations
 * and four distinct fixture accounts with test-only capability grants.
 * TEST FILES ARE RETAINED for audit; delete the entire disposable project.
 * No service-role clients or production account credentials are used.
 */
import { createHash,randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import {assertDisposableTarget} from './clear-talks-disposable-guard.mjs';

const env=process.env;
const url=assertDisposableTarget(env.CT_E2E_SUPABASE_URL,
  env.CT_E2E_DISPOSABLE_REF,env.CT_E2E_ACK_DISPOSABLE_WRITES);
assert.ok(env.CT_E2E_ANON_KEY,'Disposable public API key required');
const makeClient=()=>createClient(url,env.CT_E2E_ANON_KEY,{
  auth:{autoRefreshToken:false,persistSession:false,detectSessionInUrl:false}
});
const pass=(name)=>console.log('PASS: '+name);
const hash=(buffer)=>createHash('sha256').update(buffer).digest('hex');
const sample=Buffer.from(
 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO//W9sAAAAASUVORK5CYII=','base64');
const requireError=(error,label)=>assert.ok(error,label+' should have been denied');
async function login(role){
  const email=env['CT_E2E_'+role+'_EMAIL'];
  const password=env['CT_E2E_'+role+'_PASSWORD'];
  assert.ok(email&&password,role+' disposable test account credentials missing');
  const db=makeClient();
  const {data,error}=await db.auth.signInWithPassword({email,password});
  if(error||!data.user||!data.session)throw new Error(role+' Auth JWT login failed');
  return {db,id:data.user.id};
}
const anon=makeClient();
const [reader,revoked,writer,reviewer]=await Promise.all([
  login('READER'),login('REVOKED'),login('WRITER'),login('REVIEWER')
]);
assert.equal(new Set([reader.id,revoked.id,writer.id,reviewer.id]).size,4);
const sourcePath='drafts/'+writer.id+'/'+randomUUID()+'.png';
const draftId=randomUUID();
const destPath='approved/'+draftId+'.png';

const anonList=await anon.from('media_private_drafts').select('id').limit(1);
assert.ok(anonList.error||!anonList.data||anonList.data.length===0);
pass('anonymous staging metadata denied');
for(const [label,db] of [['anon',anon],['reader',reader.db]]){
 const {error}=await db.storage.from('media-drafts').upload(
   'drafts/'+reader.id+'/'+randomUUID()+'.png',sample,
   {contentType:'image/png',upsert:false});
 requireError(error,label+' private upload');
}
pass('anonymous/reader private uploads denied');

const uploaded=await writer.db.storage.from('media-drafts').upload(
 sourcePath,sample,{contentType:'image/png',cacheControl:'0',upsert:false});
if(uploaded.error)throw new Error('Real writer Storage upload: '+uploaded.error.message);
pass('writer JWT private upload');
for(const [label,db] of [['anonymous',anon],['reader',reader.db],['revoked',revoked.db]]){
 const {error}=await db.storage.from('media-drafts').download(sourcePath);
 requireError(error,label+' private download');
}
pass('anonymous/reader/revoked private downloads denied');
const signed=await writer.db.storage.from('media-drafts').createSignedUrl(sourcePath,60);
if(signed.error||!signed.data?.signedUrl)throw new Error('Private signed preview not available');
const signedResponse=await fetch(signed.data.signedUrl,{cache:'no-store',redirect:'error'});
assert.equal(signedResponse.status,200);
pass('signed private preview works for TTL bearer link (never logged)');
for(const [label,db] of [['reader',reader.db],['revoked',revoked.db]]){
 const {data,error}=await db.storage.from('media-drafts').createSignedUrl(sourcePath,60);
 assert.ok(error||!data?.signedUrl,label+' signed a forbidden private asset');
}
pass('reader and revoked editor cannot sign private source URLs');

const record=await writer.db.from('media_private_drafts').insert({
 id:draftId,uploaded_by:writer.id,bucket_id:'media-drafts',
 storage_path:sourcePath,file_name:'ct02k-sample.png',
 mime_type:'image/png',file_size_bytes:sample.length,source_sha256:hash(sample)
});
if(record.error)throw new Error('Writer private catalog insert: '+record.error.message);
const readerRows=await reader.db.from('media_private_drafts').select('id').eq('id',draftId);
assert.ok(readerRows.error||!readerRows.data||readerRows.data.length===0);
pass('writer private metadata stored; reader cannot access');

const earlyWriter=await writer.db.storage.from('media-drafts').copy(
  sourcePath,destPath,{destinationBucket:'media'});
requireError(earlyWriter.error,'writer public copy');
const earlyReviewer=await reviewer.db.storage.from('media-drafts').copy(
  sourcePath,destPath,{destinationBucket:'media'});
requireError(earlyReviewer.error,'reviewer public copy before rights claim');
pass('unreviewed public-copy attempts denied');

const claim=await reviewer.db.from('media_private_drafts').update({
 state:'publishing',reviewed_by:reviewer.id,reviewed_at:new Date().toISOString(),
 rights_status:'owned',rights_notes:'Source ownership and public distribution approved',
 publication_path:destPath,publication_started_at:new Date().toISOString(),
 attempt_count:1
}).eq('id',draftId).eq('state','pending').select('id').maybeSingle();
if(claim.error||!claim.data)throw new Error('Current reviewer claim denied: '+claim.error?.message);
const copied=await reviewer.db.storage.from('media-drafts').copy(
 sourcePath,destPath,{destinationBucket:'media'});
if(copied.error)throw new Error('REAL cross-bucket Storage copy: '+copied.error.message);
const publicDownload=await reviewer.db.storage.from('media').download(destPath);
if(publicDownload.error||!publicDownload.data)throw new Error('Copied object not readable');
assert.equal(hash(Buffer.from(await publicDownload.data.arrayBuffer())),hash(sample));
pass('actual JWT cross-bucket copy with SHA-256 match');

const publicUrl=reviewer.db.storage.from('media').getPublicUrl(destPath).data.publicUrl;
const created=await reviewer.db.from('media_assets').insert({
 url:publicUrl,storage_path:destPath,file_name:'ct02k-sample.png',
 original_file_name:'ct02k-sample.png',mime_type:'image/png',
 file_size:sample.length,asset_type:'image',status:'draft',
 uploaded_by:reviewer.id,last_edited_by:reviewer.id,
 rights_status:'owned',alt_text:'Disposable test image'
}).select('id').single();
if(created.error||!created.data)throw new Error('Approved catalog draft: '+created.error?.message);
const mediaId=created.data.id;
const approved=await reviewer.db.from('media_assets').update({
 status:'approved',approved_by:reviewer.id,approved_at:new Date().toISOString(),
 last_edited_by:reviewer.id
}).eq('id',mediaId).select('id').single();
if(approved.error||!approved.data)throw new Error('Media approval: '+approved.error?.message);
const finalized=await reviewer.db.from('media_private_drafts')
 .update({state:'published',published_media_id:mediaId})
 .eq('id',draftId).eq('state','publishing').select('id').single();
if(finalized.error||!finalized.data)throw new Error('Final metadata link: '+finalized.error?.message);
const publicView=await anon.from('media_public_assets').select('id,url').eq('id',mediaId);
assert.ok(!publicView.error&&publicView.data?.length===1,'Approved view must expose published media');
pass('approved catalog and public-safe view visible; private source retained');
console.log('CT-02k genuine disposable JWT and Storage probe SUCCESS; inspect/retire disposable project');
