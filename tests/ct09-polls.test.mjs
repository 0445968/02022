import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const base=url(compile(file('lib/permissions/assigned-draft-contract.ts')));
const {parsePollCommand,parsePublicPollPage,parseVoteCommand,parseVoteReceipt}=await import(url(compile(file('lib/permissions/polls-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'")));
const id='20000000-0000-0000-0000-000000000001',copy={language:'en',question:'Question?',options:['Yes','No'],opensAt:'2026-11-24T00:00:00Z',closesAt:'2026-11-25T00:00:00Z',cap:5};
test('poll command validates exact fields, unique options, cap and UTC',()=>{
 const c={action:'create',id:null,version:null,copy};assert.deepEqual(parsePollCommand(c),c);
 for(const bad of [{...copy,options:['yes','YES']},{...copy,cap:4},{...copy,opensAt:'2026-11-24T00:00:00-05:00'},{...copy,actor:id}])assert.throws(()=>parsePollCommand({...c,copy:bad}));
 assert.throws(()=>parsePollCommand({...c,action:'publish'}));
 assert.throws(()=>parseVoteCommand({choice:0,voterId:id}));assert.throws(()=>parseVoteCommand({choice:8}));
 assert.deepEqual(parseVoteReceipt({pollId:id,choice:0,alreadyVoted:true},id,0),{pollId:id,choice:0,alreadyVoted:true});
});
test('public projection cannot include voter IDs, hidden counts or another account choice',()=>{
 const p={id,question:'Question?',options:['Yes','No'],closesAt:copy.closesAt,open:true,ownChoice:null,counts:null};
 const page={enabled:true,verified:false,hasMore:false,items:[p]};assert.deepEqual(parsePublicPollPage(page),page);
 for(const bad of [{...p,voterId:id},{...p,ownChoice:0},{...p,counts:[1,2]}])assert.throws(()=>parsePublicPollPage({...page,items:[bad]}));
});
test('database enforces verified voter, independent review, locking, private results and default off',()=>{
 const sql=file('supabase/migrations/20261124231848_ct09_polls.sql');
 for(const s of ["values(true,false)","primary key(poll_id,voter_id)","public.staff_invite_verified_identity(actor)","p.creator=actor or p.last_editor=actor","publication_actor_permission(p.reviewer,'poll.publish')","for update","p.closed_at is not null","p.response_cap","pg_advisory_xact_lock(hashtextextended","created_at>clock_timestamp()-interval '1 minute'","on delete cascade","enable row level security"])assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/grant .* on table newsroom_private\.poll_votes/i);
 assert.match(file('.env.example'),/CT_PUBLIC_POLLS_ENABLED=false/);
});
