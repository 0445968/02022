import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {canEnterPolls,listStaffPolls} from '@/lib/services/polls';
import {PollManager} from '@/components/editorial/polls/PollManager';
// Read the request-time clock outside the client rendering function.
async function getPollClock(){return Date.now();}
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PollsPage({searchParams}:{searchParams:{page?:string}}){
 const user=await getCurrentUser();if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fpolls');
 if(!await canEnterPolls())notFound();
 const locale=await newsroomLocale(user),es=locale==='es',raw=searchParams.page??'0';
 if(typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)notFound();
 const page=Number(raw);
 const data=await listStaffPolls(page).catch(()=>null);
 if(!data)return <p role="alert" className="p-6 text-sm text-muted-foreground">{es?'No se pudieron cargar las encuestas. Actualice la página.':'Unable to load polls. Refresh the page.'}</p>;
 return <section className="space-y-4 p-4 md:p-6">
  <header><h1 className="font-headline text-2xl font-bold text-deep">{es?'Encuestas':'Polls'}</h1><p className="mt-1 text-sm text-muted-foreground">{es?'Borradores, revisión independiente, publicación y resultados agregados. La votación pública requiere habilitación separada.':'Drafts, independent review, publication and aggregate results. Public voting requires separate activation.'}</p></header>
  <PollManager data={data} locale={locale} initialNow={await getPollClock()}/>
  <nav className="flex gap-3 text-sm">{page>0&&<Link className="underline" href={'/newsroom/polls?page='+(page-1)}>{es?'Anterior':'Previous'}</Link>}<span>{es?'Página':'Page'} {page+1}</span>{data.hasMore&&<Link className="underline" href={'/newsroom/polls?page='+(page+1)}>{es?'Siguiente':'Next'}</Link>}</nav>
 </section>;
}
