import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
import type {HomepageLayoutSelection} from '@/lib/services/front-page';
const slots=new Set(['lead','top_left','top_right','secondary','lead_support','more_coverage','highlight','world','latest_news','editors_pick','latest_feature','section_feature','video_feature','island_feature','headline_bar']);
const obj=(v:unknown):Record<string,unknown>=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid layout');return v as Record<string,unknown>;};
const exact=(v:Record<string,unknown>,keys:string[])=>Object.keys(v).length===keys.length&&keys.every(k=>Object.prototype.hasOwnProperty.call(v,k));
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<2147483647;
const uuid=(v:unknown):v is string=>typeof v==='string'&&DRAFT_UUID.test(v);
export function parseSelections(v:unknown):HomepageLayoutSelection[]{
 if(!Array.isArray(v)||v.length>100)throw Error('Invalid selections');
 const positions=new Set<string>(),stories=new Set<string>();
 for(const item of v){const x=obj(item);
  if(!exact(x,['slot','position','storyId','categoryId'])||typeof x.slot!=='string'||!slots.has(x.slot)||!rev(x.position)||x.position>199||!uuid(x.storyId)||(x.categoryId!==null&&!uuid(x.categoryId)))throw Error('Invalid selection');
  const p=x.slot+':'+x.position,s=(x.slot==='headline_bar'?'headline:':'main:')+x.storyId.toLowerCase();
  if(positions.has(p)||stories.has(s))throw Error('Duplicate selection');positions.add(p);stories.add(s);
 }
 return v as HomepageLayoutSelection[];
}
export type LayoutHistoryItem={revision:number;publishedAt:string;baseline:boolean;slotCount:number};
export type VersionedLayout={revision:number;published:HomepageLayoutSelection[];selections:HomepageLayoutSelection[];updatedAt:string|null;history:LayoutHistoryItem[];legacyBlocked:boolean};
export type LayoutCommand={action:'save'|'publish'|'revert'|'restore';expectedRevision:number;selections:HomepageLayoutSelection[]|null;restoreRevision:number|null};
export function parseLayoutCommand(v:unknown):LayoutCommand{
 const x=obj(v);
 if(!exact(x,['action','expectedRevision','selections','restoreRevision'])||!rev(x.expectedRevision)||!['save','publish','revert','restore'].includes(String(x.action)))throw Error('Invalid command');
 if(x.action==='save'||x.action==='publish'){parseSelections(x.selections);if(x.restoreRevision!==null)throw Error('Unexpected version');}
 else if(x.selections!==null||(x.action==='restore'?!rev(x.restoreRevision):x.restoreRevision!==null))throw Error('Invalid recovery');
 return x as unknown as LayoutCommand;
}
export function parseVersionedLayout(v:unknown):VersionedLayout{
 const x=obj(v);
 if(!exact(x,['revision','published','selections','updatedAt','history','legacyBlocked'])||!rev(x.revision)||(x.updatedAt!==null&&!isDraftTimestamp(x.updatedAt))||typeof x.legacyBlocked!=='boolean'||!Array.isArray(x.history)||x.history.length>20)throw Error('Invalid layout state');
 // Legacy timed layouts are blocked for edits; malformed/oversized legacy snapshots also fail closed.
 parseSelections(x.published);parseSelections(x.selections);
 let previous=Number.MAX_SAFE_INTEGER;
 for(const item of x.history){const h=obj(item);if(!exact(h,['revision','publishedAt','baseline','slotCount'])||!rev(h.revision)||h.revision> x.revision||h.revision>=previous||!isDraftTimestamp(h.publishedAt)||h.baseline!==(h.revision===0)||!rev(h.slotCount)||h.slotCount>100)throw Error('Invalid history');previous=h.revision;}
 return x as unknown as VersionedLayout;
}
