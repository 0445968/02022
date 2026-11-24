import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/calendar-alerts.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {visibleCalendarConflicts,calendarItemReasons,calendarAlertPreview}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const t='2026-11-24T12:00:00Z',future='2026-11-25T12:00:00Z';
const assignment={id:'a',storyId:'s',kind:'assignment',state:'active',dueAt:future};
const queue={id:'q',storyId:'s',kind:'publication',state:'pending',snapshotCurrent:true,dueAt:future};
test('server conflict flags work even with no visible counterpart on the page',()=>{
 assert.deepEqual([...visibleCalendarConflicts([{...assignment,potentialConflict:true}])],['assignment:a']);
 assert.deepEqual([...visibleCalendarConflicts([{...queue,potentialConflict:true}])],['publication:q']);
 assert.equal(visibleCalendarConflicts([assignment,queue]).size,0);
 assert.deepEqual(calendarItemReasons({...assignment,potentialConflict:true},t),['conflict','soon']);
});
test('alerts distinguish stale, blocked, legacy, overdue and 48-hour upcoming',()=>{
 assert.deepEqual(calendarItemReasons(assignment,t),['soon']);
 assert.deepEqual(calendarItemReasons({...queue,dueAt:t,state:'blocked',snapshotCurrent:false},t),['blocked','stale','overdue']);
 assert.deepEqual(calendarItemReasons({...queue,kind:'legacy',dueAt:null},t),['legacy']);
 assert.deepEqual(calendarItemReasons({...assignment,dueAt:'2026-11-26T12:00:00.001Z'},t),[]);
 assert.equal(calendarAlertPreview({items:Array(6).fill(queue),hasMore:false,asOf:t}).more,true);
 assert.equal(calendarAlertPreview({items:[queue],hasMore:true,asOf:t}).more,true);
});
test('dashboard alerts gate on current calendar discovery and never render a global total',()=>{
 const ui=file('components/editorial/calendar/CalendarAlerts.tsx');
 assert.ok(ui.indexOf('await canEnterEditorialCalendar()')<ui.indexOf('readEditorialCalendar({start'));
 assert.match(ui,/Promise\.allSettled/);assert.match(ui,/calendarAlertPreview/);assert.match(ui,/mode:'attention'/);
 assert.match(file('app/newsroom/(shell)/page.tsx'),/<CalendarAlerts locale=\{locale\}/);
 assert.match(file('app/newsroom/(shell)/contributor/page.tsx'),/<CalendarAlerts locale=\{locale\}/);
 assert.match(file('app/newsroom/(shell)/schedule/page.tsx'),/visibleCalendarConflicts\(data\.items\)/);
});
