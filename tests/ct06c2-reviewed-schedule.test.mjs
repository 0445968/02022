import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('CT06c2 exact approved queue, no caller clock or service-role executor',()=>{
 const s=file('supabase/migrations/20261124193511_ct06c_reviewed_schedule.sql');
 for(const token of ['ct06c_one_active_schedule','schedule.due_at>clock_timestamp()',"publication_actor_permission(actor,'story.schedule',p_story)",'validate_reviewed_publication(p_story,p_kind,p_request,p_fingerprint,actor)',"state='pending' and due_at<=clock_timestamp()", "state='blocked',ended_at=clock_timestamp()", "state='published',ended_at=clock_timestamp()", "session_user<>'postgres'",'for update skip locked'])assert.ok(s.includes(token),token);
 assert.match(s,/revoke all on function newsroom_private\.run_due_reviewed_publications\(integer\) from public,anon,authenticated,service_role/);
 assert.doesNotMatch(s,/grant execute on function newsroom_private\.run_due_reviewed_publications|cron\.schedule\(/i);
});
test('CT06c2 UI queues only current approved fingerprint, confirms UTC and blocks legacy direct publish',()=>{
 const s=file('components/editorial/story-editor/ReviewedSchedulePanel.tsx');
 assert.match(s,/fingerprint:state.fingerprint,dueAt:time.toISOString\(\)/);
 assert.match(s,/schedulingInstants\(due,zone\)/);
 assert.match(s,/instants.length>1/);
 assert.match(s,/!selected\|\|busy\|\|blocked/);
 assert.match(s,/Confirm UTC publication time/);
 assert.match(file('components/editorial/story-editor/StoryReviewPanel.tsx'),/state.decision==='approved'&&!schedule/);
 assert.match(file('.env.example'),/CT_REVIEWED_SCHEDULING_ENABLED=false/);
});

test('CT06c2 legacy date controls do not imply active scheduling',()=>{
 assert.match(file('components/editorial/story-editor/StorySettingsPanel.tsx'),/reviewedPublication\?<Field label=\{dict.story.scheduledDate\}/);
 assert.match(file('components/editorial/story-editor.tsx'),/const settingsProps = \{\s*reviewedPublication,/);
 assert.match(file('components/editorial/story-editor/StoryReviewPanel.tsx'),/if\(scheduling\)\{window.location.reload\(\);return;\}/);
});