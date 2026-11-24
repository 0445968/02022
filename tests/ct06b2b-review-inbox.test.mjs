import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/review-inbox-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {parseInboxPage,parseFeedbackAck,parseFeedbackReceipt}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='83000000-0000-0000-0000-000000000001',at='2026-11-24T18:00:00Z';
const item={id,storyId:id,kind:'draft',headline:'Example',at,note:'Please review this copy',decision:null,readAt:null};
test('CT06b2b inbox strict projection and self-only ack command',()=>{
 assert.deepEqual(parseInboxPage({items:[item],hasMore:false},'pending').items,[item]);
 assert.throws(()=>parseInboxPage({items:[{...item,actorId:id}],hasMore:false},'pending'));
 assert.throws(()=>parseInboxPage({items:[{...item,decision:'approved',readAt:at}],hasMore:false},'unread'));
 assert.throws(()=>parseInboxPage({items:Array(26).fill(item),hasMore:true},'pending'));
 assert.equal(parseFeedbackAck({requestId:id}),id);
 assert.throws(()=>parseFeedbackAck({requestId:id,readerId:id}));
 assert.deepEqual(parseFeedbackReceipt({id,readAt:at},id),{id,readAt:at});
});
test('CT06b2b exact scoped inbox and retained receipts',()=>{
 const s=file('supabase/migrations/20261124183816_ct06b_review_inbox.sql');
 for(const token of ["review_access(q.story_id,q.kind,'decide')","review_independent(q.story_id,q.snap,q.requested_by)","q.fingerprint=q.snap->>'fingerprint'","q.requested_by=(select auth.uid())","review_feedback_allowed(p_request)","on conflict(request_id) do nothing",'limit 26 offset p_page*25','enable row level security'])assert.ok(s.includes(token),token);
 assert.match(s,/create function public\.staff_read_review_inbox[\s\S]*?security invoker/);
 assert.match(file('lib/services/review-inbox.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_REVIEW_INBOX_ENABLED=false/);
});
