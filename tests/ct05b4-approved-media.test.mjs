import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/assigned-media-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {parseApprovedMediaPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const node={type:'image',attrs:{mediaAssetId:'60000000-0000-0000-0000-000000000001',src:'https://test-project.supabase.co/storage/v1/object/public/media/approved/good.jpg',alt:'Image',approvedAttachment:true,credit:'Credit'}};
test('CT05b4 safe canonical picker projection',()=>{
 assert.deepEqual(parseApprovedMediaPage({items:[node],hasMore:false}),{items:[node],hasMore:false});
 for(const attrs of [{src:'https://example.invalid/private.jpg'},{src:'https://test-project.supabase.co/storage/v1/object/sign/media/file?token=secret'},{approvedAttachment:false},{internal_notes:'secret'},{mediaAssetId:'bad'}])assert.throws(()=>parseApprovedMediaPage({items:[{...node,attrs:{...node.attrs,...attrs}}],hasMore:false}));
 assert.throws(()=>parseApprovedMediaPage({items:Array(25).fill(node),hasMore:true}));
});
test('CT05b4 assigned picker and database canonical image guards',()=>{
 const s=file('supabase/migrations/20261124170144_ct05b_approved_media_attachments.sql');
 for(const x of ['rights_status','license_expires_at','storage.objects','approvedAttachment','n.n>coalesce(o.n,0)','m.node=n.node',"has_staff_permission('media.upload')",'assigned_inline_media_allowed(old.id,old.body,new.body)','assigned_inline_media_allowed(new.story_id,v_body,new.body)','assigned_inline_media_allowed(p_story,coalesce(r.body,s.body),p_body)'])assert.ok(s.includes(x),x);
 assert.doesNotMatch(s,/update public\.stories|security definer/i);
 assert.match(file('lib/services/assigned-media.ts'),/auth\.getUser\(\)/);
 assert.match(file('.env.example'),/CT_ASSIGNED_APPROVED_MEDIA_ENABLED=false/);
 assert.match(file('components/editorial/rich-text-editor.tsx'),/mediaPickerOpen&&!assignedMedia/);
});
