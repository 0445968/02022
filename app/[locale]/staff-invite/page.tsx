import Link from 'next/link';
import {notFound} from 'next/navigation';
import {staffInvitationsEnabled,verifiedInvitationUser} from '@/lib/services/staff-invitations';
import {StaffInviteRedeemForm} from '@/components/forms/staff-invite-redeem-form';
import {isLocale} from '@/lib/i18n/config';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer' as const};
export default async function StaffInvitePage(props:{params: Promise<{locale:string}>}) {
  const params = await props.params;
  if(!staffInvitationsEnabled()||!isLocale(params.locale))notFound();
  const locale=params.locale,es=locale==='es';
  const user=await verifiedInvitationUser();
  return <main className="mx-auto max-w-md space-y-6 px-4 py-12">
    <h1 className="font-headline text-2xl font-bold text-deep">{es?'Invitación a la redacción':'Newsroom invitation'}</h1>
    <div className="space-y-4 border border-border bg-white p-6">
      <p className="text-sm text-muted-foreground">{es?'Use únicamente el código privado que recibió del administrador y su correo verificado.':'Use only the private code received from your administrator and the invited, verified email.'}</p>
      {user?<StaffInviteRedeemForm locale={locale}/>:<>
        <p className="text-sm">{es?'Inicie sesión con el correo invitado. Si necesita crear una cuenta, verifique el correo y regrese a esta página.':'Sign in with the invited email. If you need to create an account, verify your email and return to this page.'}</p>
        <Link className="block text-sm font-semibold text-primary underline" href={'/'+locale+'/auth/sign-in?next='+encodeURIComponent('/'+locale+'/staff-invite')}>{es?'Iniciar sesión':'Sign in'}</Link>
        <Link className="block text-sm font-semibold text-primary underline" href={'/'+locale+'/auth/sign-up'}>{es?'Crear cuenta':'Create account'}</Link>
      </>}
    </div>
  </main>;
}
