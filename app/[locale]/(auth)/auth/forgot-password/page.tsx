import Link from 'next/link';
import {notFound} from 'next/navigation';
import {readerAccountEnabled} from '@/lib/services/reader-account';
import {PasswordRecoveryForm} from '@/components/account/PasswordRecoveryForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default function ForgotPasswordPage({params}:{params:{locale:string}}){
 if(!readerAccountEnabled())notFound();const locale=params.locale==='es'?'es':'en';
 return <div className="space-y-4"><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Restablecer contraseña':'Reset password'}</h1><PasswordRecoveryForm locale={locale}/><Link href={'/'+locale+'/auth/sign-in'} className="text-sm text-primary underline">{locale==='es'?'Volver al inicio de sesión':'Return to sign in'}</Link></div>;
}
