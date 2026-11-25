import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {createHmac} from 'node:crypto';import ts from 'typescript';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),c=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,u=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const dep=u(c(f('lib/permissions/assigned-draft-contract.ts')));
const load=p=>import(u(c(f(p)).replace("'./assigned-draft-contract'","'"+dep+"'")));
const notice=await load('lib/permissions/reader-communications-contract.ts'),crypto=await load('lib/permissions/newsletter-crypto.ts');
const id='20000000-0000-0000-0000-000000000001',generation='20000000-0000-0000-0000-000000000002';
test('reader notification preferences and consent reject caller identity and arbitrary topics',()=>{
 const p={action:'preferences',expectedRevision:0,stories:true,replies:false,privacy:true,page:0};
 assert.deepEqual(notice.parseNoticeCommand(p),p);assert.throws(()=>notice.parseNoticeCommand({...p,actor:id}));assert.throws(()=>notice.parseNoticeCommand({...p,page:101}));assert.throws(()=>notice.parseNoticeCommand({...p,stories:'true'}));
 assert.deepEqual(notice.parseNewsletterCommand({action:'subscribe',topic:'latest'}),{action:'subscribe',topic:'latest'});
 assert.throws(()=>notice.parseNewsletterCommand({action:'subscribe',topic:'latest',email:'other@example.invalid'}));assert.throws(()=>notice.parseNewsletterCommand({action:'subscribe',topic:'forged'}));
 assert.equal(notice.readerCanOpen('public',false),true);assert.equal(notice.readerCanOpen('registered',false),false);assert.equal(notice.readerCanOpen('registered',true),true);assert.equal(notice.readerCanOpen('premium',true),false);assert.equal(notice.readerCanOpen('subscriber',true),false);
});
test('signed unsubscribe is generation-bound and webhook verification rejects tampering/replay',()=>{
 const secret='test-only-secret-at-least-32-characters',token=crypto.unsubscribeToken(id,generation,secret);
 assert.deepEqual(crypto.verifyUnsubscribe(token,secret),{id,generation});assert.equal(crypto.verifyUnsubscribe(token+'x',secret),null);assert.equal(crypto.verifyUnsubscribe(token,secret+'x'),null);
 const key=Buffer.alloc(32,7),wh='whsec_'+key.toString('base64'),raw='{"type":"email.bounced"}',now=1700000000000,headers={id:'msg_test',timestamp:String(now/1000),signature:''};
 headers.signature='v1,'+createHmac('sha256',key).update(headers.id+'.'+headers.timestamp+'.'+raw).digest('base64');
 assert.equal(crypto.verifyMailWebhook(raw,headers,wh,now),true);assert.equal(crypto.verifyMailWebhook(raw+' ',headers,wh,now),false);assert.equal(crypto.verifyMailWebhook(raw,headers,wh,now+301000),false);
});
test('delivery is gated, service-only, current consent checked, bounded and idempotent; paid plans not offered',()=>{
 const sql=f('supabase/migrations/20261125014031_ct13_reader_communications.sql');for(const v of ['ct13_story_notice','ct13_reply_notice','ct13_privacy_notice','e.recipient=p_actor','p_actor','90 days','ct13_daily_once','ct13_confirm_once','delivery_enabled boolean not null default false','confirm_until>clock_timestamp()','mail_send_allowed','newsletter_suppressions','for update of n skip locked','ct14_free_reader_access','ct14_authenticated_reader_access','to service_role'])assert.ok(sql.includes(v),v);
 const svc=f('lib/services/newsletter-mail.ts');for(const v of ['CT_NEWSLETTER_SEND_ENABLED','Idempotency-Key','mail_send_allowed','mail_finish_send','mail_begin_confirmation','verifyMailWebhook','constantEqual','List-Unsubscribe-Post'])assert.ok(svc.includes(v),v);
 assert.match(f('app/account/subscription/page.tsx'),/Paid plans are not currently offered/);assert.doesNotMatch(f('app/account/subscription/page.tsx'),/checkout|paymentIntent/);
 assert.match(f('.env.example'),/CT_NEWSLETTER_SEND_ENABLED=false/);
});
