import {DRAFT_UUID,isDraftTimestamp} from './assigned-draft-contract';
export type CommentArticle={storyId:string;headline:string;language:'en'|'es';publishedAt:string;publicPath:string|null;total:number;pending:number;published:number;matched:number};
export type CommentArticlesPage={items:CommentArticle[];hasMore:boolean};
export function parseCommentArticles(raw:unknown):CommentArticlesPage{
 if(!raw||typeof raw!=='object')throw Error('Invalid articles');
 const v=raw as Record<string,unknown>;
 if(Object.keys(v).length!==2||!Array.isArray(v.items)||v.items.length>20||typeof v.hasMore!=='boolean')throw Error('Invalid articles');
 const seen=new Set<string>();
 const items=v.items.map((item:unknown)=>{
  if(!item||typeof item!=='object')throw Error('Invalid article');
  const r=item as Record<string,unknown>;
  if(Object.keys(r).length!==9||typeof r.storyId!=='string'||!DRAFT_UUID.test(r.storyId)||seen.has(r.storyId)||typeof r.headline!=='string'||!['en','es'].includes(String(r.language))||!isDraftTimestamp(r.publishedAt))throw Error('Invalid article');
  if(r.publicPath!==null&&(typeof r.publicPath!=='string'||!r.publicPath.startsWith('/'+r.language+'/article/')||!/^\/(en|es)\/article\/[a-zA-Z0-9_-]+$/.test(r.publicPath)))throw Error('Invalid path');
  for(const key of ['total','pending','published','matched'])if(typeof r[key]!=='number'||!Number.isSafeInteger(r[key])||(r[key] as number)<0)throw Error('Invalid count');
  if((r.pending as number)+(r.published as number)>(r.total as number)||(r.matched as number)<1||(r.matched as number)>(r.total as number))throw Error('Invalid count');
  seen.add(r.storyId);
  return r as unknown as CommentArticle;
 });
 return {items,hasMore:v.hasMore};
}
