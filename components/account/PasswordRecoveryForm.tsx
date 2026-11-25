'use client';
import {useState,useRef} from 'react';
import {createClient} from '@/lib/db/supabase-client';
import {validAccountEmail} from '@/lib/permissions/reader-account-contract';
import type {Locale} from '@/types';
export function PasswordRecoveryForm({locale}:{locale:Locale}){
 const es=locale==='es',lock=useRef(false),[email,setEmail]=useState(''),[sent,setSent]=useState(false),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent){e.preventDefault();if(lock.current||!validAccountEmail(email))return;lock.current=true;setBusy(true);
 try{await createClient().auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/api/account/auth-callback?locale='+locale+'&purpose=recovery'});}catch{/* Same response for every address. */}finally{setSent(true);setBusy(false);lock.current=false;}}
 return <form onSubmit={submit} className="space-y-4 rounded-md border border-border bg-white p-5">
  <label className="block space-y-1 text-sm font-semibold">{es?'Correo electrónico':'Email address'}<input className="block w-full rounded-md border border-border p-2" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={254} disabled={busy||sent}/></label>
  <button type="submit" disabled={busy||sent||!validAccountEmail(email)} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{es?'Enviar enlace':'Send reset link'}</button>
  {sent&&<p role="status" className="text-sm">{es?'Si existe una cuenta elegible, recibirá un enlace. Compruebe su correo en este navegador.':'If an eligible account exists, you will receive a link. Check your email in this browser.'}</p>}
 </form>;
}
