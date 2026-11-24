import type {CalendarItem,CalendarPage} from './editorial-calendar-contract';

export const CALENDAR_SOON_MS=48*60*60*1000;
/** Only infer a potential conflict from two independently visible entries on
 * the same returned page. Never infer absence, hidden assignment counts,
 * or a relationship between a particular revision and a task. */
export function visibleCalendarConflicts(items:readonly CalendarItem[]):Set<string>{
 const publications=new Map<string,CalendarItem>();
 for(const item of items){
  if(item.kind==='publication'&&item.state==='pending'&&item.snapshotCurrent===true&&item.dueAt!==null)
   publications.set(item.storyId,item);
 }
 const conflicts=new Set<string>();
 for(const item of items){
  if(item.kind!=='assignment'||item.state!=='active'||item.dueAt===null)continue;
  const queued=publications.get(item.storyId);
  if(queued?.dueAt&&Date.parse(item.dueAt)>=Date.parse(queued.dueAt)){
   conflicts.add(item.id);conflicts.add(queued.id);
  }
 }
 return conflicts;
}
export function calendarItemReasons(item:CalendarItem,asOf:string):('overdue'|'soon'|'blocked'|'stale'|'legacy')[]{
 const reasons:('overdue'|'soon'|'blocked'|'stale'|'legacy')[]=[];
 const time=Date.parse(asOf),due=item.dueAt===null?NaN:Date.parse(item.dueAt);
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
