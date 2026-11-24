import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const base=url(compile(file('lib/permissions/assigned-draft-contract.ts')));
const {parseCalendarQuery,parseCalendarPage}=await import(url(compile(file('lib/permissions/editorial-calendar-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'")));
const id='20000000-0000-0000-0000-000000000002',start='2026-11-01T00:00:00Z',end='2026-12-01T00:00:00Z';
test('CT08a strict bounded calendar query and safe row discriminators',()=>{
 const q={start,end,mode:'range',filter:'all',page:0};assert.deepEqual(parseCalendarQuery(q),q);
 for(const x of [{end:start},{end:'2027-11-01T00:00:00Z'},{page:101},{mode:'unknown'},{actor:id}])assert.throws(()=>parseCalendarQuery({...q,...x}));
 const item={id,storyId:id,headline:'Story',dueAt:end,kind:'legacy',state:'unverified',assignmentType:null,mine:false,assignee:null,source:'draft',snapshotCurrent:null,canCancel:false};
 assert.deepEqual(parseCalendarPage({asOf:start,items:[item],hasMore:false}).items,[item]);
 assert.throws(()=>parseCalendarPage({asOf:start,items:[{...item,canCancel:true}],hasMore:false}));
 assert.throws(()=>parseCalendarPage({asOf:start,items:[{...item,authorizedBy:id}],hasMore:false}));
});
test('CT08a read-only calendar uses exact grants and private safe projection',()=>{
 const s=file('supabase/migrations/20261124221450_ct08a_editorial_calendar.sql');
 for(const x of ["calendar_story_scope(s.id)","calendar.view_team","calendar.view_assigned","m.auth_user_id=(select auth.uid())","revision.view","review_snapshot(n.story_id,n.source)","limit 51 offset p_page*50","'unverified'","'snapshotCurrent'"])assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/run_due_reviewed_publications|cron\.schedule|update public\.stories/);
 assert.match(file('lib/services/editorial-calendar.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_EDITORIAL_CALENDAR_ENABLED=false/);
});
