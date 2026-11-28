import Link from 'next/link';
import {notFound} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {pollPlacementsEnabled,readPollPlacements} from '@/lib/services/poll-placements';
import {validPlacementTarget,type PlacementKind} from '@/lib/permissions/poll-placement-contract';
import {PollPlacementManager} from '@/components/editorial/polls/PollPlacementManager';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PollPlacementsPage(props:{params:Promise<{id:string}>;searchParams:Promise<{kind?:string;target?:string}>}){
 if(!pollPlacementsEnabled())notFound();
 const [params,q,user]=await Promise.all([props.params,props.searchParams,getCurrentUser()]);if(!user)notFound();
 const locale=await newsroomLocale(user),state=await readPollPlacements(params.id).catch(()=>null);if(!state)notFound();
 const context=validPlacementTarget(q.kind,q.target??'')?{kind:q.kind as PlacementKind,target:q.target??'',startsAt:null,endsAt:null}:null;
 return <section className="space-y-4 p-4 md:p-6"><Link className="text-sm text-primary underline" href="/newsroom/polls">{locale==='es'?'Volver a encuestas':'Back to polls'}</Link><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Ubicaciones de encuesta':'Poll placements'}</h1><PollPlacementManager initial={state} locale={locale} context={context}/></section>;
}
