import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const revision=compile(file('lib/permissions/assigned-revision-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {validateRevisionCommand}=await import('data:text/javascript;base64,'+Buffer.from(revision).toString('base64'));
const stamp='2026-11-24T16:00:00.123456+00:00';
const valid={action:'save',expectedUpdatedAt:stamp,liveUpdatedAt:stamp,revisionId:null,copy:{headline:'Title',summary:null,subheadline:null,body:{type:'doc',content:[{type:'paragraph'}]}}};
test('CT05b2 strict live and revision tokens, no publication or actor metadata',()=>{
 assert.deepEqual(validateRevisionCommand(valid),valid);
 for(const p of [{revisionId:'bad'},{liveUpdatedAt:'now'},{expectedUpdatedAt:'2026-11-24T17:00:00Z'},{action:'publish'},{authorId:'forged'}])assert.throws(()=>validateRevisionCommand({...valid,...p}));
 assert.equal(validateRevisionCommand({...valid,action:'submit',revisionId:'30000000-0000-4000-8000-000000000001'}).action,'submit');
});
test('CT05b2 assigned revisions use session RPC and never update live stories',()=>{
 const s=file('lib/services/assigned-revisions.ts');
 for(const x of ["auth.getUser()","'revision.view'","'revision.edit_assigned'","'staff_save_assigned_revision'","CT_ASSIGNED_REVISION_EDITOR_ENABLED"])assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/SUPABASE_SERVICE_ROLE_KEY|publish_story_revision/);
 const sql=file('supabase/migrations/20261124165002_ct05b_assigned_revision_guard.sql');
 assert.doesNotMatch(sql,/update public\.stories|security definer/i);
 assert.match(sql,/from public\.stories where id=p_story and status='published' for update/);
 assert.match(sql,/r\.id is distinct from p_revision/);
 assert.match(sql,/old\.status<>'draft'/);
 assert.match(file('.env.example'),/CT_ASSIGNED_REVISION_EDITOR_ENABLED=false/);
});
