import Link from 'next/link';
import {listPlacedPolls,pollPlacementsEnabled} from '@/lib/services/poll-placements';
import {getCurrentUser} from '@/lib/auth/session';
import type {PlacementKind} from '@/lib/permissions/poll-placement-contract';
import {PublicPollCard} from '@/components/polls/PublicPollCard';
export async function PlacedPolls({locale,kind,target='',returnPath}:{locale:'en'|'es';kind:PlacementKind;target?:string;returnPath:string}){
 if(!pollPlacementsEnabled())return null;
 const data=await listPlacedPolls(locale,kind,target).catch(()=>null);if(!data?.enabled||!data.items.length)return null;
 const user=await getCurrentUser().catch(()=>null);
 return <section className="container-wide space-y-4 py-7" aria-label={locale==='es'?'Encuestas':'Polls'}><h2 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Encuestas':'Polls'}</h2><div className="grid gap-4 lg:grid-cols-2">{data.items.map(poll=><PublicPollCard key={poll.id} poll={poll} locale={locale} verified={data.verified} signedIn={!!user} returnPath={returnPath}/>)}</div>{data.hasMore&&<Link className="text-sm text-primary underline" href={'/'+locale+'/polls'}>{locale==='es'?'Ver todas las encuestas':'View all polls'}</Link>}</section>;
}
