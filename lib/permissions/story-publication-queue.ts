import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type StoryQueueItem={storyId:string;source:'draft'|'revision';state:'pending'|'blocked'|'unverified';dueAt:string|null;snapshotCurrent:boolean|null};
export type StoryQueuePage={asOf:string;items:StoryQueueItem[]};
export type StoryQueueDisplay=StoryQueuePage|'unavailable'|null;
export function validQueueIds(ids:unknown):ids is string[]{
 return Array.isArray(ids)&&ids.length>=1&&ids.length<=50&&ids.every(id=>typeof id==='string'&&DRAFT_UUID.test(id))&&new Set(ids.map(id=>id.toLowerCase())).size===ids.length;
}
function record(v:unknown,keys:string[]):Record<string,unknown>{
 if(!v||typeof v!=='object'||Array.isArray(v)||Object.keys(v).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(v,k)))throw Error('Invalid queue projection');
 return v as Record<string,unknown>;
}
export function parseStoryQueuePage(raw:unknown,ids:string[]):StoryQueuePage{
 if(!validQueueIds(ids))throw Error('Invalid story IDs');
 const p=record(raw,['asOf','items']);
 if(!isDraftTimestamp(p.asOf)||!Array.isArray(p.items)||p.items.length>ids.length)throw Error('Invalid queue page');
 const requested=new Set(ids.map(id=>id.toLowerCase())),seen=new Set<string>();
 const items=p.items.map(raw=>{
  const i=record(raw,['storyId','source','state','dueAt','snapshotCurrent']);
  if(typeof i.storyId!=='string'||!DRAFT_UUID.test(i.storyId)||!requested.has(i.storyId.toLowerCase())||seen.has(i.storyId.toLowerCase()))throw Error('Unexpected story ID');
  if(i.source!=='draft'&&i.source!=='revision')throw Error('Invalid source');
  if(i.state==='unverified'){
   if(i.source!=='draft'||i.snapshotCurrent!==null||(i.dueAt!==null&&!isDraftTimestamp(i.dueAt)))throw Error('Invalid legacy item');
  }else if((i.state!=='pending'&&i.state!=='blocked')||!isDraftTimestamp(i.dueAt)||typeof i.snapshotCurrent!=='boolean')throw Error('Invalid queue item');
  seen.add(i.storyId.toLowerCase());return i as StoryQueueItem;
 });
 return {asOf:p.asOf,items};
}
export function queuePresentation(i:StoryQueueItem,asOf:string):'legacy'|'blocked'|'stale'|'due'|'queued'{
 if(i.state==='unverified')return 'legacy';
 if(i.state==='blocked')return 'blocked';
 if(i.snapshotCurrent!==true)return 'stale';
 if(i.dueAt!==null&&Date.parse(i.dueAt)<=Date.parse(asOf))return 'due';
 return 'queued';
}
