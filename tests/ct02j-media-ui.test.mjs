import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('private media panel stays invisible until explicitly enabled with live staff permissions',()=>{
 const page=read('app/newsroom/(shell)/media/page.tsx');
 const library=read('components/editorial/media-library/MediaLibrary.tsx');
 assert.match(page,/privateDraftsEnabled=privateDraftMediaEnabled\(\)/);
 assert.match(page,/privateDraftsEnabled && <PrivateDraftMediaPanel/);
 assert.match(library,/privateDraftsEnabled = false/);
 assert.match(library,/uploadOpen && !privateDraftsEnabled/);
 assert.match(library,/document\.getElementById\('ct-private-draft-panel'\)/);
});
test('Newsroom can upload privately, preview, review, approve and reject with explicit rights',()=>{
 const panel=read('components/editorial/media-library/PrivateDraftMediaPanel.tsx');
 for(const s of ['/api/media/drafts','/preview','/approve','/reject','confirmRights','rightsNotes'])assert.ok(panel.includes(s),s);
 assert.match(panel,/role="alert"/);
 assert.doesNotMatch(panel,/getPublicUrl|SERVICE_ROLE|NEXT_PUBLIC_SUPABASE/);
});
