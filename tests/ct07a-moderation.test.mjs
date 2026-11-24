import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/comment-moderation-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {parseModerationCommand,parseModerationPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='41000000-0000-0000-0000-000000000002';
test('CT07a moderation command excludes actor/body/ownership injection',()=>{
 const c={commentId:id,revision:2,action:'approve',reason:'Comment meets guidelines',commandId:id};
 assert.deepEqual(parseModerationCommand(c),c);
 for(const x of [{body:'injected'},{actorId:id},{action:'publish'},{revision:0},{reason:'short'},{reason:'bad\nreason longer'}])assert.throws(()=>parseModerationCommand({...c,...x}));
 assert.deepEqual(parseModerationPage({items:[],hasMore:false}),{items:[],hasMore:false});
});
test('CT07a scope and private audited moderation, no direct staff bypass',()=>{
 const s=file('supabase/migrations/20261124195029_ct07a_comment_moderation.sql');
 for(const x of ["comment_scope_allowed(sid,'moderate')","drop policy ct02k_comments_moderator_update","revoke delete on public.comments from authenticated","c.moderation_revision<>p_revision","old.moderation_revision+1","c.user_id=(select auth.uid())","insert into newsroom_private.comment_moderation_events","then '[deleted]' else c.body","limit 21 offset p_page*20"])assert.ok(s.includes(x),x);
 assert.match(s,/create function public\.staff_change_comment_moderation[\s\S]*?security invoker/);
 assert.match(file('lib/services/comment-moderation.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_COMMENT_MODERATION_ENABLED=false/);
});
