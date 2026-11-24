import {parseModerationCommand,type ModerationAction,type ModerationCommand,type ModerationItem} from './comment-moderation-contract';
import {availableCommentActions} from './comment-moderation-ui';
export type BulkModerationCommand={action:ModerationAction;reason:string;items:{commentId:string;revision:number;commandId:string}[]};
export const BULK_MODERATION_LIMIT=20;
export function parseBulkModerationCommand(raw:unknown):BulkModerationCommand{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid batch');
 const v=raw as Record<string,unknown>;
 if(Object.keys(v).length!==3||!Array.isArray(v.items)||v.items.length<1||v.items.length>BULK_MODERATION_LIMIT)throw Error('Invalid batch');
 const seen=new Set<string>(),commands=new Set<string>();
 const parsed:ModerationCommand[]=v.items.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).length!==3)throw Error('Invalid item');
  const item=parseModerationCommand({...x,action:v.action,reason:v.reason});
  if(seen.has(item.commentId.toLowerCase())||commands.has(item.commandId.toLowerCase()))throw Error('Duplicate batch entry');
  seen.add(item.commentId.toLowerCase());commands.add(item.commandId.toLowerCase());return item;
 });
 return {action:parsed[0].action,reason:parsed[0].reason,items:parsed.map(({commentId,revision,commandId})=>({commentId,revision,commandId}))};
}
export function bulkActions(items:ModerationItem[]):ModerationAction[]{
 return items.length?availableCommentActions(items[0]).filter(a=>items.every(i=>availableCommentActions(i).includes(a))):[];
}
export function parseBulkResult(raw:unknown,expected:number):{changed:number}{
 if(!raw||typeof raw!=='object'||Array.isArray(raw)||Object.keys(raw).length!==1||(raw as {changed?:unknown}).changed!==expected)throw Error('Invalid result');
 return {changed:expected};
}
