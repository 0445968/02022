import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import ts from 'typescript';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),c=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText,u=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const {parseSelections,parseLayoutCommand,parseVersionedLayout}=await import(u(c(f('lib/permissions/homepage-history-contract.ts')).replace("'./assigned-draft-contract'","'"+u(c(f('lib/permissions/assigned-draft-contract.ts')))+"'")));
const selection={slot:'lead',position:0,storyId:'20000000-0000-0000-0000-000000000001',categoryId:null};
test('versioned layout contracts reject stale shapes, malformed IDs and duplicates',()=>{
 assert.deepEqual(parseSelections([selection]),[selection]);assert.throws(()=>parseSelections([selection,selection]));assert.throws(()=>parseSelections([{...selection,position:200}]));assert.throws(()=>parseSelections([{...selection,storyId:'wrong'}]));
 const cmd={action:'restore',expectedRevision:2,selections:null,restoreRevision:0};assert.deepEqual(parseLayoutCommand(cmd),cmd);assert.throws(()=>parseLayoutCommand({...cmd,selections:[selection]}));assert.throws(()=>parseLayoutCommand({...cmd,actor:'forged'}));
 const state={revision:2,published:[selection],selections:[],updatedAt:'2026-11-24T12:00:00Z',history:[{revision:0,publishedAt:'2026-11-24T12:00:00Z',baseline:true,slotCount:1}],legacyBlocked:false};assert.deepEqual(parseVersionedLayout(state),state);assert.throws(()=>parseVersionedLayout({...state,history:[{...state.history[0],actor:'hidden'}]}));
});
test('layout only changes through current capability checked versioned RPC and restore is not publish',()=>{
 const sql=f('supabase/migrations/20261125004543_ct11b_homepage_history.sql');for(const x of ['revoke insert,update,delete,truncate','revoke execute on function public.publish_homepage_layout','homepage_editor_allowed(p_action=\'publish\')','for update','v_revision is distinct from p_expected','for share','homepage_legacy_blocked()','if p_action=\'publish\' then','insert into newsroom_private.homepage_versions','enable row level security'])assert.ok(sql.includes(x),x);
 assert.match(f('.env.example'),/CT_HOMEPAGE_HISTORY_ENABLED=false/);assert.match(f('components/editorial/page-editor/LayoutHistoryPanel.tsx'),/Restore changes only the draft/);
});
