'use client';

import {useRef,useState} from 'react';
import {localizedPath} from '@/lib/i18n/config';
import type {Locale} from '@/types';
import { LogOut } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-client';
import type { Dictionary } from '@/lib/i18n/dictionaries';

export function SignOutButton({dict,locale='en'}:{dict:Dictionary;locale?:Locale}) {
  const lock=useRef(false);
  const [isPending,setPending]=useState(false),[error,setError]=useState(false);
  async function handleSignOut(){
    if(lock.current)return;
    lock.current=true;setPending(true);setError(false);
    try{
      const {error:failure}=await createClient().auth.signOut();
      if(failure)throw failure;
      // Drop the authenticated App Router cache after the auth cookie is cleared.
      window.location.replace(localizedPath(locale,'/'));
    }catch{setError(true);lock.current=false;setPending(false);}
  }

  return (
    <div className="relative">
    <button
      type="button"
      onClick={handleSignOut}
      disabled={isPending}
      className="inline-flex h-9 items-center gap-1.5 rounded-[6px] border border-border bg-white px-3 text-xs font-semibold text-foreground transition-colors hover:border-breaking hover:text-breaking focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
    >
      <LogOut className="h-3.5 w-3.5" aria-hidden />
      {dict.newsroom.signOut}
    </button>
    {error&&<p role="alert" className="absolute right-0 top-full z-50 mt-1 w-56 rounded border border-border bg-white p-2 text-xs text-breaking shadow-sm">{locale==='es'?'No se pudo cerrar sesión. Intente de nuevo.':'Sign-out could not be confirmed. Try again.'}</p>}
    </div>
  );
}
