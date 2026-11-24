import {notFound,redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {defaultLocale} from '@/lib/i18n/config';
import {readStaffOnboarding,staffOnboardingEnabled,StaffOnboardingError} from '@/lib/services/staff-onboarding';
import {StaffOnboardingForm} from '@/components/editorial/team/StaffOnboardingForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function StaffOnboardingPage(){
  if(!staffOnboardingEnabled())notFound();
  const user=await getCurrentUser();
  if(!user)redirect('/en/auth/sign-in?next=%2Fnewsroom%2Fonboarding');
  const locale=user.profile?.preferredLocale??defaultLocale;
  let state;
  try{state=await readStaffOnboarding();}
  catch(e){
    if(e instanceof StaffOnboardingError&&e.status===403)redirect('/newsroom/denied');
    return <div className="mx-auto max-w-xl px-6 py-8 text-sm text-muted-foreground" role="alert">{locale==='es'?'No se pudo cargar el perfil. Actualice esta página.':'Unable to load your staff profile. Refresh this page.'}</div>;
  }
  return <StaffOnboardingForm initial={state} locale={state.profile?.locale??locale} suggestedName={user.profile?.name??''}/>;
}
