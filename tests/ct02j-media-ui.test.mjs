import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('private media panel stays invisible until explicitly enabled with live staff permissions',()=>{
 const page=read('app/newsroom/(shell)/media/page.tsx');
 const library=read('components/editorial/media-library/MediaLibrary.tsx');
 assert.match(page,/privateDraftsEnabled=privateDraftMediaEnabled\(\)/);
 assert.match(page,/privateDraftsEnabled&&access\.privateMedia\?<PrivateMediaWorkspace/);
 assert.match(page,/if\(access&&\(!access\.allowed\|\|\(!access\.fullMedia&&!access\.privateMedia\)\)\)redirect/);
 assert.match(page,/\(!access\|\|access\.fullMedia\)\?<MediaLibrary/);
 const policy=read('lib/permissions/workspace-policy.ts');
 assert.match(policy,/options\.privateMedia&&all\('media\.upload'\)/);
 assert.match(policy,/all\('media\.view_all','media\.upload','media\.edit_all','media\.approve','media\.delete'\)/);
 assert.match(library,/privateDraftsEnabled = false/);
 assert.match(library,/uploadOpen && !privateDraftsEnabled/);
 assert.match(library,/privateDraftsEnabled&&<PrivateDraftMediaDialog open=\{uploadOpen\}/);
 const dialog=read('components/editorial/media-library/PrivateDraftMediaDialog.tsx');
 assert.match(dialog,/<Dialog open=\{open\}/);
 assert.match(dialog,/if\(next\|\|!busy\)onOpenChange/);
 assert.match(dialog,/<PrivateDraftMediaPanel canReview=\{canReview\}/);
});
test('Newsroom can upload privately, preview, review, approve and reject with explicit rights',()=>{
 const panel=read('components/editorial/media-library/PrivateDraftMediaPanel.tsx');
 for(const s of ['/api/media/drafts','/preview','confirmRights','rightsNotes',"'approve'","'reject'"])assert.ok(panel.includes(s),s);
 assert.match(panel,/kind:'approve'\|'reject'/);
 assert.match(panel,/role="alert"/);
 assert.doesNotMatch(panel,/getPublicUrl|SERVICE_ROLE|NEXT_PUBLIC_SUPABASE/);
});
