import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getServerLocale} from '@/lib/i18n/server-locale';
import {localizedPath} from '@/lib/i18n/config';
import {readerReportingEnabled,readOwnReports} from '@/lib/services/reader-reports';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function MyReports({searchParams}:{searchParams:{page?:string}}){
 if(!readerReportingEnabled())notFound();
 const user=await getCurrentUser(),locale=getServerLocale(user?.profile?.preferredLocale),es=locale==='es';
 if(!user)redirect(localizedPath(locale,'/auth/sign-in')+'?next=%2Faccount%2Freports');
 const raw=searchParams.page??'0';
 if(typeof raw!=='string'||!/^\d{1,3}$/.test(raw)||Number(raw)>100)notFound();
 const page=Number(raw);
 const data=await readOwnReports(page).catch(()=>null);
 const labels=es?{open:'Abierta',reviewed:'Revisada',dismissed:'Desestimada',actioned:'Con medidas'}:{open:'Open',reviewed:'Reviewed',dismissed:'Dismissed',actioned:'Actioned'};
 return <div className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
  <header className="border-b border-border pb-6"><h1 className="font-headline text-3xl font-bold text-deep">{es?'Mis denuncias':'My reports'}</h1><p className="mt-2 text-sm text-muted-foreground">{es?'Consulte el estado de sus propias denuncias. Las notas internas no se muestran.':'Check the status of your own reports. Internal moderation notes are not displayed.'}</p><Link href="/account/comments" className="mt-3 inline-block text-sm text-primary underline">{es?'Mis comentarios':'My comments'}</Link></header>
  {!data?<p role="alert" className="py-6 text-sm">{es?'No se pudieron cargar sus denuncias. Compruebe su cuenta y actualice.':'Unable to load your reports. Check your account and refresh.'}</p>:<>
   {!data.items.length&&<p className="py-8 text-sm text-muted-foreground">{es?'No hay denuncias en esta página.':'No reports on this page.'}</p>}
   {data.items.map(item=><article key={item.id} className="space-y-2 border-b border-border py-5"><div className="flex flex-wrap justify-between gap-2"><h2 className="font-semibold">{es?'Denuncia':'Report'}</h2><span className="rounded bg-surface-muted px-2 py-1 text-xs font-semibold">{labels[item.status]}</span></div><p className="whitespace-pre-wrap break-words text-sm">{item.reason}</p><p className="text-xs text-muted-foreground">{es?'Enviada':'Submitted'}: {new Date(item.createdAt).toLocaleString(locale)}{item.reviewedAt&&' · '+(es?'Actualizada':'Updated')+': '+new Date(item.reviewedAt).toLocaleString(locale)}</p><p className="text-xs text-muted-foreground">{es?'Referencia':'Reference'}: {item.id}</p></article>)}
   <nav className="mt-4 flex items-center justify-between gap-2 text-sm">{page>0?<Link prefetch={false} className="text-primary underline" href={'/account/reports?page='+(page-1)}>{es?'Anterior':'Previous'}</Link>:<span/>}<span>{es?'Página':'Page'} {page+1}</span>{data.hasMore?<Link prefetch={false} className="text-primary underline" href={'/account/reports?page='+(page+1)}>{es?'Siguiente':'Next'}</Link>:<span/>}</nav>
  </>}
 </div>;
}
