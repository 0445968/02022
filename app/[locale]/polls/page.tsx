import Link from 'next/link';
import {notFound} from 'next/navigation';
import {isLocale} from '@/lib/i18n/config';
import {getCurrentUser} from '@/lib/auth/session';
import {listPublicPolls,publicPollsEnabled} from '@/lib/services/polls';
import type {PublicPollPage} from '@/lib/permissions/polls-contract';
import {PublicPollCard} from '@/components/polls/PublicPollCard';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function PublicPolls({params,searchParams}:{params:{locale:string};searchParams:{page?:string}}){
 if(!isLocale(params.locale)||!publicPollsEnabled())notFound();
 const locale=params.locale,es=locale==='es',raw=searchParams.page??'0';
 if(typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)notFound();
 const page=Number(raw);
 let data:PublicPollPage;
 try{data=await listPublicPolls(locale,page);}catch{return <p role="alert" className="p-6 text-sm">{es?'No se pudieron cargar las encuestas.':'Unable to load polls.'}</p>;}
 if(!data.enabled)notFound();
 const user=await getCurrentUser();
 return <section className="mx-auto max-w-4xl space-y-5 px-4 py-8">
  <header><h1 className="font-headline text-3xl font-bold text-deep">{es?'Encuestas':'Polls'}</h1><p className="mt-2 text-sm text-muted-foreground">{es?'Una respuesta por cuenta verificada. Los votos no muestran su identidad; no son encuestas representativas.':'One response per verified account. Your identity is not displayed; these are not representative surveys.'}</p></header>
  {!data.items.length&&<p className="text-sm">{es?'No hay encuestas disponibles.':'No polls available.'}</p>}
  {data.items.map(p=><PublicPollCard key={p.id} poll={p} locale={locale} verified={data.verified} signedIn={!!user}/>)}
  <nav className="flex gap-3 text-sm">{page>0&&<Link className="underline" href={'/'+locale+'/polls?page='+(page-1)}>{es?'Anterior':'Previous'}</Link>}{data.hasMore&&<Link className="underline" href={'/'+locale+'/polls?page='+(page+1)}>{es?'Siguiente':'Next'}</Link>}</nav>
 </section>;
}
