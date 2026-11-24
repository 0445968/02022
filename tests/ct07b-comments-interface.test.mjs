import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=ts.transpileModule(file('lib/permissions/comment-moderation-ui.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {availableCommentActions,commentQueueHref}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
test('CT07b moderation controls match authorized state transitions',()=>{
 assert.deepEqual(availableCommentActions({status:'pending',canModerate:true}),['approve','hide','remove']);
 assert.deepEqual(availableCommentActions({status:'published',canModerate:true}),['hide','remove']);
 assert.deepEqual(availableCommentActions({status:'hidden',canModerate:true}),['restore','remove']);
 assert.deepEqual(availableCommentActions({status:'deleted',canModerate:true}),[]);
 assert.deepEqual(availableCommentActions({status:'pending',canModerate:false}),[]);
});
test('CT07b filters preserve literal query without URL injection',()=>{
 const url=new URL(commentQueueHref('reported','story-id','a & b? #',2),'https://example.invalid');
 assert.equal(url.pathname,'/newsroom/comments');
 assert.equal(url.searchParams.get('q'),'a & b? #');
 assert.equal(url.searchParams.get('page'),'2');
 assert.equal(url.searchParams.get('storyId'),'story-id');
});
test('CT07b navigation and page recheck access; decisions use current revision and explicit reason',()=>{
 const s=file('lib/services/comment-moderation.ts');
 assert.match(s,/resolveGlobalStaffPermissionsOnServer\(\['newsroom.access',\.\.\.keys\]\)/);
 assert.match(s,/resolveStoryStaffPermissionsOnServer\(String\(story.id\),keys\)/);
 assert.match(file('lib/services/newsroom-workspace.ts'),/access.allowed&&await canEnterCommentModeration\(\)/);
 const p=file('app/newsroom/(shell)/comments/page.tsx');
 assert.ok(p.indexOf('if(!await canEnterCommentModeration())')<p.indexOf('await readCommentQueue('));
 const u=file('components/editorial/comments/CommentsWorkspace.tsx');
 assert.match(u,/revision:detail.comment.revision,action,reason/);
 assert.match(u,/!confirm\|\|!availableCommentActions/);
 assert.match(u,/response.status===409/);
 assert.match(u,/I understand the text cannot be recovered/);
 assert.doesNotMatch(u,/dangerouslySetInnerHTML|SUPABASE_SERVICE_ROLE_KEY/);
});

test('CT07b legacy sidebar does not expose disabled comments page and navigation guards pending mutation',()=>{
 assert.match(file('components/editorial/newsroom-sidebar.tsx'),/item.key!=='comments'/);
 const u=file('components/editorial/comments/CommentsWorkspace.tsx');
 assert.match(u,/if\(inFlight.current\)e.preventDefault\(\)/);
 assert.match(u,/disabled=\{busy\} className=\{btn\}/);
});
