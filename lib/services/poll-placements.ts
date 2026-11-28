import 'server-only';
import type {SupabaseClient} from '@supabase/supabase-js';
import {createClient} from '@/lib/db/supabase-server';
import {canEnterPolls,staffPollsEnabled,publicPollsEnabled} from '@/lib/services/polls';
import {DraftHttpError} from '@/lib/permissions/assigned-draft-http';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import {parsePublicPollPage} from '@/lib/permissions/polls-contract';
import {parsePlacementState,parsePlacementOptions,validPlacementTarget,type PlacementCommand,type PlacementKind} from '@/lib/permissions/poll-placement-contract';
export function pollPlacementsEnabled(){return staffPollsEnabled()&&process.env.CT_POLL_PLACEMENTS_ENABLED==='true';}
const db=()=>createClient() as unknown as SupabaseClient;
function fail(code:string|undefined):never{throw new DraftHttpError(code==='42501'?403:code==='40001'||code==='23505'||code==='40P01'?409:code==='22023'?422:503);}
async function staffClient(){if(!pollPlacementsEnabled())throw new DraftHttpError(404);if(!await canEnterPolls())throw new DraftHttpError(403);const c=db();const {data:{user},error}=await c.auth.getUser();if(error||!user||user.is_anonymous||!user.email_confirmed_at)throw new DraftHttpError(403);return c;}
export async function readPollPlacements(id:string){if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);const c=await staffClient(),{data,error}=await c.rpc('staff_read_poll_placements',{p_id:id});if(error)fail(error.code);try{return parsePlacementState(data,id);}catch{throw new DraftHttpError(503);}}
export async function changePollPlacements(id:string,command:PlacementCommand){if(!DRAFT_UUID.test(id))throw new DraftHttpError(422);const c=await staffClient(),{data,error}=await c.rpc('staff_change_poll_placements',{p_id:id,p_expected:command.expectedRevision,p_action:command.action,p_copy:command.copy,p_reason:command.reason});if(error)fail(error.code);try{const result=parsePlacementState(data,id);if(result.revision!==command.expectedRevision+1)throw Error();return result;}catch{throw new DraftHttpError(503);}}
export async function lookupPollPlacementTargets(kind:'article'|'category',query:string,page:number){if(!['article','category'].includes(kind)||query.length>160||!Number.isInteger(page)||page<0||page>100)throw new DraftHttpError(422);const c=await staffClient(),{data,error}=await c.rpc('staff_lookup_poll_placement_targets',{p_kind:kind,p_query:query,p_page:page});if(error)fail(error.code);try{return parsePlacementOptions(data,kind);}catch{throw new DraftHttpError(503);}}
export async function listPlacedPolls(locale:'en'|'es',kind:PlacementKind,target:string){if(!pollPlacementsEnabled()||!publicPollsEnabled()||!validPlacementTarget(kind,target))return null;const {data,error}=await db().rpc('public_placed_polls',{p_language:locale,p_kind:kind,p_target:target});if(error)return null;try{return parsePublicPollPage(data);}catch{return null;}}
