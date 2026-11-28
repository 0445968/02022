import {terminologyEnabled} from '@/lib/services/translation-terminology';
import {TranslationUsage} from '@/components/editorial/dashboard/TranslationUsage';
import {WorkAssignmentSummary} from '@/components/editorial/dashboard/WorkAssignmentSummary';
import {DashboardActivity} from '@/components/editorial/dashboard/DashboardActivity';
import {readDashboardStorySample,readOwnerDashboard,type OwnerDashboardMode} from '@/lib/services/newsroom-dashboard';
import {CalendarAlerts} from '@/components/editorial/calendar/CalendarAlerts';
import { FileText, FileEdit, Send, Eye } from 'lucide-react';
import Link from 'next/link';
import {redirect} from 'next/navigation';
import type {StaffOnboardingState} from '@/lib/permissions/staff-onboarding-types';
import {getWorkspaceAccess,scopedNewsroomEnabled} from '@/lib/services/newsroom-workspace';
import {staffOnboardingEnabled,readStaffOnboarding} from '@/lib/services/staff-onboarding';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { resolveRoleLabel } from '@/lib/permissions';
import { getStoryCounts } from '@/lib/services/stories';

export default async function NewsroomDashboard({searchParams}:{searchParams:Promise<{mode?:string}>}) {
  const requested=(await searchParams).mode;
  const user = await getCurrentUser();
  let onboarding:StaffOnboardingState|null=null;
  if(staffOnboardingEnabled()){
    try{onboarding=await readStaffOnboarding();}catch{redirect('/newsroom/onboarding');}
    if(!onboarding.profile)redirect('/newsroom/onboarding');
  }
  const locale = onboarding?.profile?.locale??user?.profile?.preferredLocale??defaultLocale;
  const dict = getDictionary(locale);
  const roleLabel = scopedNewsroomEnabled()?null:resolveRoleLabel(user);
  const access=scopedNewsroomEnabled()?await getWorkspaceAccess():null;
  if(access&&!access.allowed)redirect('/newsroom/denied');
  if(access&&!access.viewStories)redirect('/newsroom/contributor');
  const owner=!!access&&!!onboarding?.roles.some(r=>r.key==='owner');
  const mode:OwnerDashboardMode=requested==='personal'?'personal':'team';
  const ownerData=owner?await readOwnerDashboard(mode):null;
  const sample=access&&!owner?await readDashboardStorySample():null;
  const counts=owner?ownerData?.summary:access?sample?.summary:await getStoryCounts();
  const recent=owner?ownerData?.items:sample?.items;
  const es=locale==='es';


  const stats = [
    { key: 'statStories', value: counts?.total, icon: FileText },
    { key: 'statDrafts', value: counts?.drafts, icon: FileEdit },
    { key: 'statInReview', value: counts?.inReview, icon: Eye },
    { key: 'statPublished', value: counts?.published, icon: Send },
  ];

  return (
    <div className="w-full min-w-0 px-3 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h1 className="font-headline text-2xl font-bold text-deep">
            {dict.newsroom.dashboardTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.newsroom.dashboardDesc}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">{owner&&<nav aria-label={es?'Modo de panel':'Dashboard mode'} className="inline-flex rounded-lg border border-border bg-white p-1">{(['team','personal'] as const).map(v=><Link key={v} href={'/newsroom?mode='+v} aria-current={mode===v?'page':undefined} className={'rounded-md px-3 py-1.5 text-sm font-semibold '+(mode===v?'bg-deep text-white':'text-muted-foreground hover:bg-surface-muted')}>{v==='team'?(es?'Equipo':'Team'):(es?'Personal':'Personal')}</Link>)}</nav>}{(!access||access.createStory)&&<Link
          href="/newsroom/stories/new"
          className="inline-flex h-9 items-center gap-1.5 rounded-[6px] bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          + {dict.newsroom.newStory}
        </Link>}</div>
      </div>

      {owner?<p className="mt-2 text-xs text-muted-foreground">{ownerData?(mode==='team'?(es?'Totales de todas las historias autorizadas del equipo.':'Totals across all authorized team stories.'):(es?'Historias propias o asignadas y asignaciones activas propias.':'Your authored, created or assigned stories and your active assignments.')):(es?'No se pudo verificar el resumen.':'Unable to verify dashboard totals.')} {ownerData&&<>· {es?'Asignaciones activas':'Active assignments'}: {ownerData.summary.assignments}</>}</p>:access&&<p className="mt-4 text-xs text-muted-foreground">{sample?.unavailable?(locale==='es'?'Resumen no disponible.':'Story summary unavailable.'):(locale==='es'?'Resumen de hasta 25 historias recientes con acceso editorial verificado; no son totales de toda la redacción.':'Summary of up to 25 recent stories with verified editorial access; not newsroom-wide totals.')}</p>}
      {/* Stats grid */}
      <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.key} className="rounded-xl border border-border bg-white p-3">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {dict.newsroom[stat.key as keyof typeof dict.newsroom]}
                </span>
              </div>
              <p className="mt-1 font-headline text-2xl font-bold text-deep">
                {stat.value??'—'}
              </p>
            </div>
          );
        })}
      </div>

      {staffOnboardingEnabled()&&<Link href="/newsroom/profile" className="mt-4 inline-flex text-sm font-medium text-primary underline">{locale==='es'?'Perfil privado del equipo':'Private staff profile'}</Link>}
      {(!owner||mode==='team')&&<CalendarAlerts locale={locale}/>}
      {owner&&ownerData&&mode==='team'&&<TranslationUsage locale={locale}/>}
      {owner&&ownerData&&mode==='team'&&terminologyEnabled()&&<Link href="/newsroom/translation-settings" className="mt-3 inline-flex text-sm text-primary underline">{es?'Configuración de traducción':'Translation settings'}</Link>}
      {access&&<WorkAssignmentSummary locale={locale} mode={owner?mode:undefined}/>}
      {access&&<DashboardActivity locale={locale} includeAssignments={true} mode={owner?mode:undefined}/>}
      {recent?.length?<section className="mt-3 space-y-2 rounded-lg border border-border bg-white p-3"><h2 className="font-headline text-lg font-semibold text-deep">{locale==='es'?'Historias recientes accesibles':'Recent accessible stories'}</h2><ul className="divide-y divide-border">{recent.slice(0,5).map(s=><li key={s.id} className="py-2"><Link className="break-words text-sm font-semibold text-deep underline" href={'/newsroom/stories/'+s.id+'/preview'}>{s.headline}</Link></li>)}</ul><Link href="/newsroom/stories" className="text-sm text-primary underline">{dict.newsroom.stories}</Link></section>:null}
      {/* Profile summary */}
      {(!owner||mode==='personal')&&<div className="mt-3 rounded-xl border border-border bg-white p-3">
        <h2 className="font-headline text-lg font-semibold text-deep">
          {dict.account.profile}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.auth.name}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {access?(onboarding?.profile?.displayName??'—'):(user?.profile?.name??'—')}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.account.role}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {access?onboarding?.roles.map(role=>locale==='es'?role.nameEs:role.nameEn).join(' · ')||'—':dict.account[
                roleLabel === 'author-editor'
                  ? 'roleAuthorEditor'
                  : roleLabel === 'author'
                  ? 'roleAuthor'
                  : roleLabel === 'editor'
                  ? 'roleEditor'
                  : 'roleUser'
              ]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.account.editorialTitle}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {access?'—':user?.profile?.editorialTitle ?? '—'}
            </dd>
          </div>
        </dl>
      </div>}

      {!access&&<p className="mt-6 text-xs text-muted-foreground">{dict.newsroom.stageNotice}</p>}
    </div>
  );
}
