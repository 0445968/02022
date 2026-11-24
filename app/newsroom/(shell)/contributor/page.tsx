import Link from 'next/link';
import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getWorkspaceAccess,scopedNewsroomEnabled,readAssignedWorkspace,readWorkspaceOnboarding,newsroomLocale} from '@/lib/services/newsroom-workspace';
import {getDictionary} from '@/lib/i18n/dictionaries';
import {staffOnboardingEnabled} from '@/lib/services/staff-onboarding';
import {FileText,Image,Users,Newspaper,User} from 'lucide-react';
export const dynamic='force-dynamic';
export default async function ContributorWorkspace({searchParams}:{searchParams:{page?:string}}){
  if(!scopedNewsroomEnabled())notFound();
  const user=await getCurrentUser();
  if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fcontributor');
  const access=await getWorkspaceAccess();
  if(!access.allowed)redirect('/newsroom/denied');
  const onboarding=await readWorkspaceOnboarding();
  if(staffOnboardingEnabled()&&!onboarding?.profile)redirect('/newsroom/onboarding');
  const locale=await newsroomLocale(user),es=locale==='es',dict=getDictionary(locale);
  const raw=searchParams.page??'0',page=/^\d{1,3}$/.test(raw)?Math.min(Number(raw),100):0;
  const assigned=await readAssignedWorkspace(page);
  const links=[
    {allowed:access.viewStories,href:'/newsroom/stories',label:dict.newsroom.stories,icon:FileText},
    {allowed:access.fullMedia||access.privateMedia,href:'/newsroom/media',label:dict.newsroom.media,icon:Image},
    {allowed:access.manageBylines,href:'/newsroom/authors',label:dict.newsroom.authors,icon:Users},
    {allowed:access.fullHomepage,href:'/newsroom/page-editor',label:dict.newsroom.pageEditor,icon:Newspaper},
    {allowed:access.viewTeam,href:'/newsroom/team',label:dict.newsroom.team,icon:Users},
    {allowed:access.onboarding,href:'/newsroom/onboarding',label:es?'Perfil privado del equipo':'Private staff profile',icon:User}
  ].filter(link=>link.allowed);
  const statuses:Record<string,string>=es?{draft:'Borrador',in_review:'En revisión',scheduled:'Programado',published:'Publicado',archived:'Archivado'}:{draft:'Draft',in_review:'In review',scheduled:'Scheduled',published:'Published',archived:'Archived'};
  const types:Record<string,string>=es?{author:'Autor',editor:'Editor',reviewer:'Revisor',copy:'Corrección',visual:'Visual'}:{author:'Author',editor:'Editor',reviewer:'Reviewer',copy:'Copy editing',visual:'Visual'};
  return <div className="mx-auto max-w-5xl space-y-6 px-6 py-8">
    <header className="border-b border-border pb-5"><h1 className="font-headline text-2xl font-bold text-deep">{es?'Mi espacio de trabajo':'My workspace'}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{es?'Acceda a sus asignaciones y herramientas autorizadas.':'Access your assigned work and authorized tools.'}</p>
      {onboarding?.roles.length? <p className="mt-2 text-xs text-muted-foreground">{onboarding.roles.map(r=>es?r.nameEs:r.nameEn).join(' · ')}</p>:null}</header>
    {links.length>0&&<section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label={es?'Herramientas':'Workspace tools'}>
      {links.map(({href,label,icon:Icon})=><Link key={href} href={href} className="flex items-center gap-3 rounded-lg border border-border bg-white p-4 text-sm font-medium text-deep hover:bg-surface-muted"><Icon className="h-4 w-4 text-primary"/>{label}</Link>)}
    </section>}
    <section className="space-y-3 rounded-lg border border-border bg-white p-5">
      <h2 className="font-headline text-lg font-semibold text-deep">{es?'Mis asignaciones activas':'My active assignments'}</h2>
      {assigned.unavailable?<p role="alert" className="text-sm text-muted-foreground">{es?'No se pudieron cargar sus asignaciones. Actualice esta página.':'Unable to load assignments. Refresh this page.'}</p>:<>
        {!assigned.items.length&&<p className="text-sm text-muted-foreground">{es?'No hay asignaciones accesibles en esta página.':'No accessible assignments on this page.'}</p>}
        <ul className="space-y-2">{assigned.items.map(story=><li key={story.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
          <div className="min-w-0"><p className="break-words text-sm font-semibold text-deep">{story.headline}</p><p className="mt-1 text-xs text-muted-foreground">{statuses[story.status]??story.status} · {story.assignmentTypes.map(t=>types[t]??t).join(', ')}{story.dueAt?' · '+(es?'Vence ':'Due ')+new Date(story.dueAt).toLocaleString(es?'es-ES':'en-US'):''}</p></div>
          <Link href={'/newsroom/stories/'+story.id+'/preview'} className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-surface-muted">{es?'Vista previa':'Preview'}</Link>
        </li>)}</ul>
        <div className="flex items-center gap-3 text-sm">{page>0&&<Link className="underline" href={'/newsroom/contributor?page='+(page-1)}>{es?'Anterior':'Previous'}</Link>}<span className="text-muted-foreground">{es?'Página':'Page'} {page+1}</span>{assigned.hasMore&&<Link className="underline" href={'/newsroom/contributor?page='+(page+1)}>{es?'Siguiente':'Next'}</Link>}</div>
      </>}
    </section>
  </div>;
}
