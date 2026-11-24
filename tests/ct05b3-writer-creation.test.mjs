import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/writer-draft-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {validateWriterDraft}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const valid={requestId:'60000000-0000-0000-0000-000000000001',headline:'New draft',language:'en'};
test('CT05b3 writer creation strict input excludes story IDs, assignment, actor, publication fields',()=>{
 assert.deepEqual(validateWriterDraft(valid),valid);
 for(const p of [{authorId:'forged'},{status:'published'},{membershipId:'other'},{slug:'forged'},{requestId:'invalid'},{language:'fr'},{headline:''}])assert.throws(()=>validateWriterDraft({...valid,...p}));
});
test('CT05b3 private definer checks identity and exact assignment, public wrappers invoker',()=>{
 const s=file('supabase/migrations/20261124165545_ct05b_writer_draft_creation.sql');
 for(const x of ['staff_invite_verified_identity','pg_advisory_xact_lock(202611,2302)','writer_draft_requests','story.create','story.view_assigned','story.edit_assigned','null,null,v_actor,v_actor','search_vector','guard_restricted_story_insert'])assert.ok(s.includes(x),x);
 assert.match(s,/create function public\.staff_start_writer_draft[\s\S]*?security invoker/);
 assert.doesNotMatch(s,/grant insert on public\.staff_story_assignments/i);
 const api=file('lib/services/writer-drafts.ts');
 assert.match(api,/auth\.getUser\(\)/);assert.doesNotMatch(api,/SUPABASE_SERVICE_ROLE_KEY|user_metadata/);
 assert.match(file('.env.example'),/CT_WRITER_DRAFT_CREATION_ENABLED=false/);
});
