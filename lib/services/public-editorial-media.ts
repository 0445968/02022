import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createDataClient} from '@/lib/db/supabase-data';
import {imageReferences,projectPublicBody,safeImageUrl} from '@/lib/permissions/public-content-contract';
export const securePublicMedia=()=>process.env.CT_STAFF_ACCESS_V2_ENABLED==='true';
export function publicImageSelection(select:string):string{
 return securePublicMedia()?select.replace(/featured_image:media_assets!stories_featured_image_id_fkey\s*\(\s*id,\s*url,\s*alt_text\s*\)/g,'featured_image_id'):select;
}
export async function publicImageMap(ids:readonly string[]){
 const result=new Map<string,{id:string;url:string;alt_text:string}>();
 if(!ids.length)return result;
 const db=createDataClient() as unknown as SupabaseClient;
 const {data,error}=await db.from('media_public_assets').select('id,url,alt_text').in('id',[...new Set(ids)]);
 if(error)return result;
 for(const row of data??[]){if(typeof row.id==='string'&&safeImageUrl(row.url))result.set(row.id,{id:row.id,url:row.url,alt_text:typeof row.alt_text==='string'?row.alt_text:''});}
 return result;
}
export async function hydratePublicEditorialImages<T extends {featured_image_id?:string|null;featured_image?:unknown}>(rows:T[]):Promise<T[]>{
 if(!securePublicMedia())return rows;
 const media=await publicImageMap(rows.map(r=>r.featured_image_id).filter((id):id is string=>typeof id==='string'));
 return rows.map(r=>({...r,featured_image:media.get(r.featured_image_id??'')??null}));
}
export async function safePublishedBody(body:unknown){
 const db=createDataClient() as unknown as SupabaseClient,urls=imageReferences(body),allowed=new Map<string,string>();
 // Bound PostgREST URL lengths, and suppress unverified legacy images.
 for(let i=0;i<urls.length;i+=5){const {data,error}=await db.from('media_public_assets').select('id,url').in('url',urls.slice(i,i+5));if(!error)for(const row of data??[])if(safeImageUrl(row.url)&&typeof row.id==='string')allowed.set(row.url,row.id);}
 return projectPublicBody(body,allowed);
}
export async function readPublicBylines(ids:readonly string[]){
 const result=new Map<string,{id:string;bylineName:string;editorialTitle:string|null;headshot:{url:string}|null}>();
 if(!ids.length)return result;
 const db=createDataClient();
 const {data,error}=await db.from('editorial_profiles').select('id,account_id,byline_name,editorial_title,headshot_media_id,byline_status').in('account_id',[...new Set(ids)]).in('byline_status',['active','former']);
 if(error)return result;
 const media=await publicImageMap((data??[]).map(row=>row.headshot_media_id).filter((id):id is string=>typeof id==='string'));
 for(const row of data??[]){if(row.account_id)result.set(row.account_id,{id:row.id,bylineName:row.byline_name,editorialTitle:row.editorial_title,headshot:media.get(row.headshot_media_id??'')??null});}
 return result;
}
