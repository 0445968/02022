import type {CalendarItem,CalendarPage} from './editorial-calendar-contract';

export const CALENDAR_SOON_MS=48*60*60*1000;
/** Conflict flags are computed by the exact scoped calendar RPC, including off-page counterparts. */
export function visibleCalendarConflicts(items:readonly CalendarItem[]):Set<string>{
 return new Set(items.filter(item=>item.potentialConflict===true).map(item=>item.kind+':'+item.id));
}
export function calendarItemReasons(item:CalendarItem,asOf:string):('overdue'|'soon'|'blocked'|'stale'|'legacy'|'conflict')[]{
 const reasons:('overdue'|'soon'|'blocked'|'stale'|'legacy'|'conflict')[]=[];
 const time=Date.parse(asOf),due=item.dueAt===null?NaN:Date.parse(item.dueAt);
 if(item.potentialConflict===true)reasons.push('conflict');
 if(item.kind==='legacy')reasons.push('legacy');
 if(item.kind==='publication'&&item.state==='blocked')reasons.push('blocked');
 if(item.kind==='publication'&&item.snapshotCurrent===false)reasons.push('stale');
 if(Number.isFinite(due)&&due<=time)reasons.push('overdue');
 else if(Number.isFinite(due)&&due-time<=CALENDAR_SOON_MS)reasons.push('soon');
 return reasons;
}
/** A bounded preview, not a total or exhaustive conflict/deadline scan. */
export function calendarAlertPreview(page:CalendarPage,limit=5){
 return {items:page.items.slice(0,limit),more:page.hasMore||page.items.length>limit,asOf:page.asOf};
}
