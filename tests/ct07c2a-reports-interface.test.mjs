import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(file('lib/permissions/comment-report-ui.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {availableReportTargets,reportedVersionState,reportQueueHref}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('CT07c2a only current permitted report transitions and matching action',()=>{
 assert.deepEqual(availableReportTargets({status:'open',canResolve:true,actionEventId:null}),['reviewed','dismissed']);
 assert.deepEqual(availableReportTargets({status:'reviewed',canResolve:true,actionEventId:'linked'}),['dismissed','actioned']);
 for(const status of ['dismissed','actioned'])assert.deepEqual(availableReportTargets({status,canResolve:true,actionEventId:'linked'}),[]);
 assert.deepEqual(availableReportTargets({status:'open',canResolve:false,actionEventId:'linked'}),[]);
 assert.equal(reportedVersionState({reportedRevision:null,commentRevision:1}),'unknown');
 assert.equal(reportedVersionState({reportedRevision:1,commentRevision:2}),'changed');
 assert.equal(reportedVersionState({reportedRevision:2,commentRevision:2}),'same');
 const u=new URL(reportQueueHref('open','story&x',2,'report?x'),'https://example.invalid');
 assert.equal(u.searchParams.get('reportId'),'report?x');assert.equal(u.searchParams.get('storyId'),'story&x');
});
test('CT07c2a report-only permission discovery and independent comment access',()=>{
 const s=file('lib/services/comment-moderation.ts');
 assert.match(s,/mode==='reports'\?\['comment.manage_reports'\]/);
 assert.match(file('lib/services/newsroom-workspace.ts'),/access.allowed&&await canEnterReportManagement\(\)/);
 const p=file('app/newsroom/(shell)/reports/page.tsx');
 assert.ok(p.indexOf('if(!await canEnterReportManagement())')<p.indexOf('await readReportQueue('));
 assert.match(p,/resolveStoryStaffPermissionsOnServer\(detail.report.storyId,\['comment.view_queue','comment.moderate'\]\)/);
 assert.match(file('app/newsroom/(shell)/comments/page.tsx'),/if\(id\)detail=await readCommentDetail\(id\)/);
});
test('CT07c2a report actions carry dual revision, confirmation and exact event',()=>{
 const s=file('components/editorial/comments/ReportsWorkspace.tsx');
 assert.match(s,/revision:report.revision,commentRevision:report.commentRevision/);
 assert.match(s,/actionEventId:target==='actioned'\?report.actionEventId:null/);
 assert.match(s,/!confirmed\|\|!valid/);
 assert.match(s,/r.status===409/);
 assert.match(s,/The displayed text is not a historical copy|The comment changed/);
 assert.doesNotMatch(s,/dangerouslySetInnerHTML|reporterId|reviewedBy/);
});

test('CT07c2a return to report rechecks exact accessible comment and story',()=>{
 const p=file('app/newsroom/(shell)/comments/page.tsx');
 assert.match(p,/await readReportDetail\(reportId\).catch/);
 assert.match(p,/report\?\.report.commentId===detail.comment.id&&report.report.storyId===detail.comment.storyId/);
 assert.match(file('app/newsroom/(shell)/reports/page.tsx'),/commentId:detail.report.commentId,reportId:detail.report.id/);
 assert.match(file('components/editorial/comments/CommentsWorkspace.tsx'),/Back to report/);
});