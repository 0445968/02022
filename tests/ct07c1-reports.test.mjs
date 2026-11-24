import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/comment-report-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {parseReportCommand,parseReportPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='42000000-0000-0000-0000-000000000010';
test('CT07c1 strict report command requires exact action linkage and no identity injection',()=>{
 const c={reportId:id,revision:2,commentRevision:2,target:'actioned',reason:'Resolved by audited hide',actionEventId:id,commandId:id};
 assert.deepEqual(parseReportCommand(c),c);
 for(const patch of [{actionEventId:null},{reporterId:id},{target:'open'},{target:'dismissed'},{commentRevision:0}])assert.throws(()=>parseReportCommand({...c,...patch}));
 const item={id,commentId:id,storyId:id,headline:'Story',author:'Reader',body:'Text',commentStatus:'hidden',commentRevision:2,reportedRevision:1,reason:'Report reason',status:'actioned',revision:2,createdAt:'2026-11-24T00:00:00Z',reviewedAt:'2026-11-24T00:01:00Z',actionEventId:id,canResolve:false};
 assert.deepEqual(parseReportPage({items:[item],hasMore:false}).items,[item]);
 assert.throws(()=>parseReportPage({items:[{...item,reporterId:id}],hasMore:false}));
});
test('CT07c1 private audit and exact reported revision; no raw staff report policy',()=>{
 const s=file('supabase/migrations/20261124201656_ct07c_audited_reports.sql');
 for(const x of ['drop policy ct07a_reports_staff_read','new.reported_comment_revision:=c.moderation_revision','e.from_revision=r.reported_comment_revision','e.to_revision=c.moderation_revision',"comment_scope_allowed(sid,'reports')",'c.moderation_revision<>p_comment_revision','r.reporter_id=(select auth.uid())','insert into newsroom_private.comment_report_events','actual_event is distinct from p_event'])assert.ok(s.includes(x),x);
 assert.match(file('lib/services/comment-reports.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_COMMENT_REPORTS_ENABLED=false/);
});
