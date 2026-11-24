import {NextResponse} from 'next/server';
import {readCommentQueue,readCommentDetail,changeCommentModeration,commentModerationEnabled} from '@/lib/services/comment-moderation';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {moderationFilter,parseModerationCommand} from '@/lib/permissions/comment-moderation-contract';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store, max-age=0','Referrer-Policy':'no-referrer'}});
const failure=(e:unknown)=>reply({error:'Moderation unavailable'},e instanceof DraftHttpError?e.status:503);
export async function GET(request:Request){
 if(!commentModerationEnabled())return reply({error:'Not found'},404);
 const q=new URL(request.url).searchParams,id=q.get('commentId'),status=q.get('status')??'pending',page=q.get('page')??'0';
 try{
  if(id!==null)return reply(await readCommentDetail(id));
  if(!moderationFilter(status)||!/^\d{1,3}$/.test(page))return reply({error:'Invalid queue filter'},422);
  return reply(await readCommentQueue(status,q.get('storyId'),q.get('q')??'',Number(page)));
 }catch(e){return failure(e);}
}
export async function POST(request:Request){
 if(!commentModerationEnabled())return reply({error:'Not found'},404);
 try{const raw=await readDraftRequest(request);let c;
  try{c=parseModerationCommand(raw);}catch{return reply({error:'Invalid command'},422);}
  return reply(await changeCommentModeration(c));
 }catch(e){return failure(e);}
}
