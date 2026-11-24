import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('conflict projection checks exact same story, current pending snapshot and both independently authorized rows',()=>{
 const sql=file('supabase/migrations/20261124230401_ct08b2c_calendar_conflicts.sql');
 for(const s of ["q.story_id=p_story","q.state='pending'","a.story_id=s.id","a.due_at>=q.due_at","calendar_story_scope(p_story)","calendar.view_assigned","m.auth_user_id=(select auth.uid())","revision.view","snap->>'fingerprint'=target.fingerprint","calendar_potential_conflict(s.id,a.id,null)","calendar_potential_conflict(s.id,null,q.id)"])assert.ok(sql.includes(s),s);
 assert.doesNotMatch(sql,/grant execute on function newsroom_private\.calendar_potential_conflict|update public\.stories|cron\.schedule/i);
 assert.match(file('components/editorial/calendar/CalendarAlerts.tsx'),/conflict:es\?/);
});
