import {NextResponse} from 'next/server';
import {DraftHttpError,readDraftRequest} from '@/lib/permissions/assigned-draft-http';
import {parseAlignmentApproval} from '@/lib/permissions/translation-alignment-review-contract';
import {alignmentReviewEnabled,confirmAlignment} from '@/lib/services/translation-alignment-review';
export const dynamic='force-dynamic';
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer'}});
export async function POST(request:Request,props:{params:Promise<{id:string}>}){if(!alignmentReviewEnabled())return reply({error:'Not found'},404);try{const raw=await readDraftRequest(request);let command;try{command=parseAlignmentApproval(raw);}catch{return reply({error:'Invalid alignment confirmation'},422);}return reply(await confirmAlignment((await props.params).id,command));}catch(e){return reply({error:'Alignment unavailable'},e instanceof DraftHttpError?e.status:503);}}
