import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/assigned-draft-contract.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateDraftCommand,existingImagesOnly}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const body={type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Copy'}]}]};
const valid={action:'save',expectedUpdatedAt:'2026-11-24T16:00:00.123456+00:00',copy:{headline:'Title',subheadline:null,summary:null,body}};
test('CT05b1 strict copy command rejects metadata, actor, version or status injection',()=>{
 assert.deepEqual(validateDraftCommand(valid),valid);
 for(const p of [{actorId:'forged'},{status:'published'},{expectedUpdatedAt:'now'},{action:'publish'},{copy:{...valid.copy,authorId:'forged'}},{copy:{...valid.copy,headline:''}}])assert.throws(()=>validateDraftCommand({...valid,...p}));
 assert.equal(validateDraftCommand({...valid,action:'submit'}).action,'submit');
});
test('CT05b1 rich text rejects unsupported nodes and javascript links',()=>{
 for(const node of [{type:'iframe',attrs:{src:'https://example.com'}},{type:'text',text:'a',marks:[{type:'link',attrs:{href:'javascript:alert(1)'}}]}]){
 assert.throws(()=>validateDraftCommand({...valid,copy:{...valid.copy,body:{type:'doc',content:[node]}}}));
 }
});
test('CT05b1 existing image references retained but new or modified ones denied',()=>{
 const old={type:'doc',content:[{type:'image',attrs:{src:'https://example.com/old.jpg'}}]};
 assert.equal(existingImagesOnly(old,{type:'doc',content:[{type:'image',attrs:{src:'https://example.com/old.jpg',alt:null}}]}),true);
 assert.equal(existingImagesOnly(old,{type:'doc',content:[{type:'image',attrs:{src:'https://example.com/new.jpg'}}]}),false);
 assert.equal(existingImagesOnly(old,body),true);
});
test('CT05b1 uses current exact assignment grants and single conditional RLS write',()=>{
 const s=file('lib/services/assigned-drafts.ts');
 for(const x of ['auth.getUser()','story.view_assigned','story.edit_assigned','story.submit_review',"eq('status','draft')","eq('updated_at',command.expectedUpdatedAt)","updated_by:userId","existingImagesOnly(old.body,command.copy.body)"])assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|story_revisions|story_versions/);
 assert.match(file('.env.example'),/CT_ASSIGNED_DRAFT_EDITOR_ENABLED=false/);
 const sql=file('supabase/migrations/20261124164358_ct05b_assigned_draft_guard.sql');
 assert.match(sql,/old\.status<>'draft'/);assert.match(sql,/story\.submit_review/);
 assert.match(sql,/new\.updated_by is distinct from/);
 assert.match(sql,/jsonb_path_query/);
});
