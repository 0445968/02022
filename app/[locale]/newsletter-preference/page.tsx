import {NewsletterLinkForm} from '@/components/account/NewsletterLinkForm';
export const dynamic='force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
export default function NewsletterPreference({params}:{params:{locale:string}}){const locale=params.locale==='es'?'es':'en';return <div className="mx-auto max-w-lg space-y-4 px-4 py-12"><h1 className="font-headline text-2xl font-bold text-deep">{locale==='es'?'Preferencias de boletines':'Newsletter preferences'}</h1><NewsletterLinkForm locale={locale}/></div>;}
