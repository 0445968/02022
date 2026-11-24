import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = p => readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('v2 media guards use current user/session permissions; legacy only if disabled',()=>{
 const s=read('lib/permissions/media-route-gates.ts');
 assert.match(s,/CT_STAFF_ACCESS_V2_ENABLED === 'true'/);
 assert.match(s,/resolveStaffPermissionOnServer/);
 for(const key of ['media.view_all','media.edit_all','media.edit_own','media.upload','media.approve','media.delete'])assert.ok(s.includes(key),key);
 assert.doesNotMatch(s,/user_metadata|DEV_AUTH_BYPASS/);
});
test('media ownership resolves from authenticated database records, never form ownership',()=>{
 const s=read('lib/permissions/server.ts');
 assert.match(s,/resourceRequest\?\.kind === 'media'/);
 assert.match(s,/\.from\('media_assets'\)/);
 assert.match(s,/\.select\('uploaded_by'\)/);
 assert.match(s,/ownerMembershipId: media.uploaded_by === user.id \? m.id : null/);
});
test('media list and upload routes use their own independent server grants',()=>{
 assert.match(read('app/api/media/route.ts'),/await mayListMedia\(user\)/);
 assert.match(read('app/api/media/upload/route.ts'),/await mayUploadMedia\(user\)/);
});
