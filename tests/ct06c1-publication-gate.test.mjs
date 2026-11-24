import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CT06c1 publication requires private transaction permit, exact approval and media eligibility',()=>{
 const s=file('supabase/migrations/20261124190734_ct06c_publication_gate.sql');
 for(const token of ['transaction_id=pg_current_xact_id()','backend_pid=pg_backend_pid()','publication_permitted(old.id)','guard_live_story_relation','q.id is distinct from p_request',"d.decision is distinct from 'approved'",'publication_actor_permission(d.decided_by','check_publication_media(r.body','check_publication_media(s.body','insert into newsroom_private.publication_events','delete from newsroom_private.publication_permits'])assert.ok(s.includes(token),token);
 assert.match(s,/create function public\.staff_publish_reviewed_story[\s\S]*?security invoker/);
 assert.match(s,/revoke all on function newsroom_private\.apply_reviewed_revision/);
 assert.match(file('.env.example'),/CT_REVIEWED_PUBLICATION_ENABLED=false/);
});
test('CT06c1 explicit reviewed publication UI sends only request and fingerprint',()=>{
 const s=file('components/editorial/story-editor/StoryReviewPanel.tsx');
 assert.match(s,/kind:state.kind,requestId:state.requestId,fingerprint:state.fingerprint/);
 assert.match(s,/canPublish&&state.current&&state.decision==='approved'/);
 assert.match(file('lib/services/reviewed-publication.ts'),/auth\.getUser\(\)/);
 assert.match(file('app/api/stories/[id]/route.ts'),/reviewedPublicationEnabled\(\)&&/);
});

test('CT06c1 removes legacy direct publish controls when gate active',()=>{
 const s=file('components/editorial/story-editor/StoryEditorHeader.tsx');
 assert.equal((s.match(/!reviewedPublication && userIsEditor &&/g)||[]).length,2);
 assert.match(file('components/editorial/story-editor.tsx'),/reviewedPublication=\{reviewedPublication\}/);
 assert.match(file('app/newsroom/(shell)/stories/[id]/edit/page.tsx'),/reviewedPublication=\{reviewedPublicationEnabled\(\)\}/);
});
