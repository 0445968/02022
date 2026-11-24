import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type CalendarMode='range'|'attention';
export type CalendarFilter='all'|'assignments'|'publications';
export type CalendarQuery={start:string;end:string;mode:CalendarMode;filter:CalendarFilter;page:number};
export type CalendarItem={id:string;storyId:string;headline:string;dueAt:string|null;kind:'assignment'|'publication'|'legacy';state:'active'|'pending'|'blocked'|'unverified';assignmentType:'author'|'editor'|'reviewer'|'copy'|'visual'|null;mine:boolean;assignee:string|null;source:'draft'|'revision'|null;snapshotCurrent:boolean|null;canCancel:boolean};
export type CalendarPage={asOf:string;items:CalendarItem[];hasMore:boolean};
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid calendar');return v as Record<string,unknown>;};
export function parseCalendarQuery(raw:unknown):CalendarQuery{
 const q=obj(raw);
 if(Object.keys(q).length!==5||typeof q.start!=='string'||!isDraftTimestamp(q.start)||typeof q.end!=='string'||!isDraftTimestamp(q.end)||(q.mode!=='range'&&q.mode!=='attention')||!['all','assignments','publications'].includes(String(q.filter))||typeof q.page!=='number'||!Number.isInteger(q.page)||q.page<0||q.page>100)throw Error('Invalid calendar filter');
 const delta=Date.parse(q.end)-Date.parse(q.start);
 if(!Number.isFinite(delta)||delta<=0||delta>93*86400000)throw Error('Invalid date range');
 return q as CalendarQuery;
}
function item(raw:unknown):CalendarItem{
 const r=obj(raw);
 if(Object.keys(r).length!==12||!uuid(r.id)||!uuid(r.storyId)||typeof r.headline!=='string'||typeof r.mine!=='boolean'||typeof r.canCancel!=='boolean'||(r.assignee!==null&&typeof r.assignee!=='string')||(r.dueAt!==null&&!isDraftTimestamp(r.dueAt)))throw Error('Invalid calendar row');
 if(r.kind==='assignment'){
  if(r.state!=='active'||r.dueAt===null||!['author','editor','reviewer','copy','visual'].includes(String(r.assignmentType))||r.source!==null||r.snapshotCurrent!==null||r.canCancel)throw Error('Invalid assignment');
 }else if(r.kind==='publication'){
  if((r.state!=='pending'&&r.state!=='blocked')||r.dueAt===null||r.assignmentType!==null||r.mine||r.assignee!==null||(r.source!=='draft'&&r.source!=='revision')||typeof r.snapshotCurrent!=='boolean')throw Error('Invalid publication');
 }else if(r.kind==='legacy'){
  if(r.state!=='unverified'||r.assignmentType!==null||r.mine||r.assignee!==null||r.source!=='draft'||r.snapshotCurrent!==null||r.canCancel||r.id!==r.storyId)throw Error('Invalid legacy');
 }else throw Error('Invalid calendar kind');
 return r as CalendarItem;
}
export function parseCalendarPage(raw:unknown):CalendarPage{
 const r=obj(raw);
 if(Object.keys(r).length!==3||typeof r.asOf!=='string'||!isDraftTimestamp(r.asOf)||!Array.isArray(r.items)||r.items.length>50||typeof r.hasMore!=='boolean')throw Error('Invalid calendar page');
 return {asOf:r.asOf,items:r.items.map(item),hasMore:r.hasMore};
}
