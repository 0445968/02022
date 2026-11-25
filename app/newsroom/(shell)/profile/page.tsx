import Link from 'next/link';
import {readerAccountEnabled} from '@/lib/services/reader-account';
import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {getWorkspaceAccess,scopedNewsroomEnabled,newsroomLocale} from '@/lib/services/newsroom-workspace';
import {readStaffOnboarding,readOwnByline,staffOnboardingEnabled,StaffOnboardingError} from '@/lib/services/staff-onboarding';
import {StaffOnboardingForm} from '@/components/editorial/team/StaffOnboardingForm';
import type {OwnByline} from '@/lib/permissions/staff-profile-contract';
import {localizedPath} from '@/lib/i18n/config';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function NewsroomProfile(){
 const user=await getCurrentUser();if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fprofile');
 const scoped=scopedNewsroomEnabled();
 if(scoped&&!(await getWorkspaceAccess()).allowed)redirect('/newsroom/denied');
 const locale=await newsroomLocale(user),es=locale==='es';
 let state=null,byline:OwnByline|null=null,unavailable=false;
 if(staffOnboardingEnabled()){
  try{state=await readStaffOnboarding();}catch(e){if(e instanceof StaffOnboardingError&&e.status===403)redirect('/newsroom/denied');unavailable=true;}
  if(state&&!state.profile)redirect('/newsroom/onboarding');
  if(state?.profile){try{byline=await readOwnByline();}catch{byline=null;}}
 }
 const statuses=es?{not_requested:'No solicitada',pending:'Pendiente de revisión',approved:'Asociación aprobada',rejected:'Solicitud rechazada',unlinked:'Asociación retirada',conflict:'Requiere revisión administrativa'}:{not_requested:'Not requested',pending:'Pending review',approved:'Approved association',rejected:'Request rejected',unlinked:'Association removed',conflict:'Administrator review required'};
 return <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
  <header className="border-b border-border pb-5"><h1 className="font-headline text-2xl font-bold text-deep">{es?'Perfil de redacción':'Newsroom profile'}</h1><p className="mt-1 text-sm text-muted-foreground">{es?'Su identidad privada, preferencias y cuenta de acceso.':'Your private working identity, preferences and sign-in account.'}</p></header>
  <section className="space-y-2 rounded-lg border border-border bg-white p-5"><h2 className="font-headline text-lg font-semibold text-deep">{es?'Cuenta de acceso':'Sign-in account'}</h2><dl><dt className="text-xs text-muted-foreground">{es?'Correo electrónico':'Email address'}</dt><dd className="break-all text-sm">{user.email??'—'}</dd></dl>
   <p className="text-sm text-muted-foreground">{es?'Los permisos del equipo y la firma editorial se administran por separado.':'Staff permissions and public editorial attribution are administered separately.'}</p>
   <Link className="text-sm font-medium text-primary underline" href={readerAccountEnabled()?'/account/profile':localizedPath(locale,'/account')}>{es?'Preferencias de mi cuenta':'My account settings'}</Link>
   {readerAccountEnabled()?<Link href="/account/security" className="block text-sm text-primary underline">{es?'Seguridad y privacidad':'Security and privacy'}</Link>:<p className="text-xs text-muted-foreground">{es?'Seguridad de la cuenta aún no habilitada.':'Account security is not enabled yet.'}</p>}
  </section>
  {unavailable&&<p role="alert" className="text-sm text-breaking">{es?'No se pudo cargar el perfil privado. Actualice esta página.':'Unable to load private profile. Refresh this page.'}</p>}
  {state?.profile?<StaffOnboardingForm initial={state} locale={locale} suggestedName="" embedded/>:!unavailable&&<p className="text-sm text-muted-foreground">{es?'La edición privada del equipo aún no está habilitada.':'Private staff profile editing is not enabled yet.'}</p>}
  {state?.profile&&<section className="space-y-2 rounded-lg border border-border bg-white p-5"><h2 className="font-headline text-lg font-semibold text-deep">{es?'Firma editorial':'Editorial byline'}</h2>
   {byline?<><p className="text-sm font-medium">{statuses[byline.status]}</p>{byline.name&&<p className="break-words text-sm">{byline.name}</p>}</>:<p role="status" className="text-sm text-muted-foreground">{es?'No se pudo verificar la asociación actual.':'Unable to verify the current association.'}</p>}
   <p className="text-xs text-muted-foreground">{es?'Una asociación privada aprobada no modifica la autoría publicada. La foto y el perfil público se gestionan en el flujo editorial autorizado.':'An approved private association does not change published attribution. Headshots and public profiles are managed through the authorized editorial workflow.'}</p>
  </section>}
 </div>;
}
