import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const js=ts.transpileModule(file('lib/permissions/calendar-view.ts'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {monthRange,monthCells,localDay,shiftMonth,calendarMonth,calendarZone}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
test('civil months use explicit zones and DST-aware boundaries',()=>{
 assert.deepEqual(monthRange('2026-03','America/Chicago'),{start:'2026-03-01T06:00:00.000Z',end:'2026-04-01T05:00:00.000Z'});
 assert.deepEqual(monthRange('2026-11','America/Chicago'),{start:'2026-11-01T05:00:00.000Z',end:'2026-12-01T06:00:00.000Z'});
 assert.deepEqual(monthRange('2026-12','America/Bogota'),{start:'2026-12-01T05:00:00.000Z',end:'2027-01-01T05:00:00.000Z'});
 assert.equal(localDay('2026-11-01T04:59:59Z','America/Bogota'),'2026-10-31');
 assert.equal(shiftMonth('2026-12',1),'2027-01');
 assert.equal(monthCells('2028-02').filter(Boolean).length,29);
 assert.equal(monthCells('2026-11').length%7,0);
 assert.equal(calendarMonth('2026-13'),false);assert.equal(calendarZone('invalid'),false);
});
test('calendar page gates before scoped read and cancellation uses exact authorized row',()=>{
 const p=file('app/newsroom/(shell)/schedule/page.tsx'),c=file('components/editorial/calendar/CancelCalendarSchedule.tsx');
 assert.ok(p.indexOf('await canEnterEditorialCalendar()')<p.indexOf('await readEditorialCalendar('));
 assert.match(p,/i\.canCancel&&scheduling/);assert.match(c,/scheduleId:item\.id/);assert.match(c,/kind:item\.source/);assert.match(c,/!confirm/);
 assert.match(file('lib/services/newsroom-workspace.ts'),/access\.allowed&&await canEnterEditorialCalendar\(\)/);
 assert.match(file('components/editorial/newsroom-sidebar.tsx'),/item\.key!=='schedule'/);
});
