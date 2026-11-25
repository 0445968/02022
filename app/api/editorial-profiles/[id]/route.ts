import {NextResponse} from 'next/server';
import {getCurrentUser} from '@/lib/auth/session';
import {mayManageByline} from '@/lib/permissions/editorial-route-gates';
import {getDataClient} from '@/lib/db/supabase-data-access';
import {readDraftRequest,DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parseAuthorProfileUpdate} from '@/lib/permissions/author-profile-contract';
import {usableHeadshot} from '@/lib/permissions/public-editorial-contract';
import {getMediaAsset} from '@/lib/services/media';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function PATCH(request:Request,{params}:{params:{id:string}}){
 const user=await getCurrentUser();if(!user||!(await mayManageByline(user)))return reply({error:'Forbidden'},403);
 if(!DRAFT_UUID.test(params.id))return reply({error:'Invalid profile'},422);
 try{
  const raw=await readDraftRequest(request);let body;try{body=parseAuthorProfileUpdate(raw);}catch{return reply({error:'Invalid profile fields'},422);}
  const db=await getDataClient();
  const {data:existing,error:lookup}=await db.from('editorial_profiles').select('id,headshot_media_id,updated_at').eq('id',params.id).maybeSingle();
  if(lookup||!existing)return reply({error:'Profile unavailable'},404);
  if(existing.updated_at!==body.expectedUpdatedAt)return reply({error:'Profile changed; refresh before editing'},409);
  if(body.headshotMediaId&&body.headshotMediaId!==existing.headshot_media_id){
   const media=await getMediaAsset(body.headshotMediaId);
   if(!media||!usableHeadshot(media,Date.now()))return reply({error:'Choose an approved image with valid rights and no embargo'},422);
  }
  const {data,error}=await db.from('editorial_profiles').update({byline_name:body.bylineName,editorial_title:body.editorialTitle,bio:body.bio,byline_status:body.bylineStatus,headshot_media_id:body.headshotMediaId,updated_at:new Date().toISOString()}).eq('id',params.id).eq('updated_at',existing.updated_at).select('id,byline_name,editorial_title,bio,byline_status,headshot_media_id,updated_at').maybeSingle();
  if(error)return reply({error:'Unable to save profile'},503);
  if(!data)return reply({error:'Profile changed; refresh before editing'},409);
  return reply({ok:true,profile:data});
 }catch(e){return reply({error:'Profile unavailable'},e instanceof DraftHttpError?e.status:503);}
}
