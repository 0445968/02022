import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CT06b2a atomic request registers final persisted fingerprint and validates media',()=>{
 const s=read('supabase/migrations/20261124182734_ct06b_atomic_review_request.sql');
 for(const token of ["snap->>'status' in ('draft','in_review')","assigned_inline_media_allowed(p_story,copy_body,copy_body)","set status='in_review',updated_by=actor","p_fingerprint:=snap->>'fingerprint'","insert into newsroom_private.story_review_requests"])assert.ok(s.includes(token),token);
 assert.ok(s.indexOf("p_fingerprint:=snap->>'fingerprint'")<s.indexOf("insert into newsroom_private.story_review_requests"));
});
test('CT06b2a review controls save first and pinned preview checks current fingerprint',()=>{
 const a=read('components/editorial/story-editor/AssignedDraftEditor.tsx');
 assert.match(a,/editable&&state.canSubmit&&!reviewEnabled/);
 assert.match(a,/await save\('save'\)/);
 assert.match(read('components/editorial/story-editor.tsx'),/await autosave.flushSave\(\)\)router.push\(reviewHref\)/);
 const p=read('app/newsroom/(shell)/stories/[id]/preview/page.tsx');
 assert.equal((p.match(/review.fingerprint!==reviewFingerprint/g)||[]).length,2);
 const ui=read('components/editorial/story-editor/StoryReviewPanel.tsx');
 assert.match(ui,/fingerprint:state.fingerprint/);
 assert.match(ui,/!opened\|\|!confirmed/);
 assert.match(ui,/Review request registered/);
 assert.doesNotMatch(ui,/action:'publish'/);
});
