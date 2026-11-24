'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import type {Locale} from '@/types';

export function StaffInviteRedeemForm({locale}:{locale:Locale}){
  const es=locale==='es';
  const [token,setToken]=useState('');
  const [busy,setBusy]=useState(false);
  const [done,setDone]=useState(false);
  const [failed,setFailed]=useState(false);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(busy||!/^[A-Za-z0-9_-]{43}$/.test(token.trim()))return;
    setBusy(true);setFailed(false);
    try{
      const res=await fetch('/api/newsroom/team/invitations',{method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'redeem',token:token.trim()})});
      const result=await res.json() as {ok?:boolean};
      if(!res.ok||!result.ok){setFailed(true);return;}
      setDone(true);
    }catch{setFailed(true);}
    finally{setToken('');setBusy(false);}
  }
  if(done)return <div role="status" className="space-y-4">
    <p>{es?'Invitación aceptada. Su acceso se ha registrado.':'Invitation accepted. Your access has been recorded.'}</p>
    <Link href="/newsroom" className="inline-flex rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white">{es?'Abrir redacción':'Open Newsroom'}</Link>
  </div>;
  return <form className="space-y-4" onSubmit={e=>void submit(e)}>
    {failed&&<p role="alert" className="text-sm text-breaking">{es?'No se pudo aceptar la invitación. Verifique su correo y solicite un código válido al administrador.':'Invitation could not be accepted. Verify your email and ask the administrator for a valid code.'}</p>}
    <label className="block text-sm font-semibold text-deep">{es?'Código privado de invitación':'Private invitation code'}
      <input className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm" type="password" autoComplete="off" spellCheck={false} autoCapitalize="none" required maxLength={43} value={token} disabled={busy} onChange={e=>setToken(e.target.value)}/>
    </label>
    <button className="w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50" type="submit" disabled={busy||!/^[A-Za-z0-9_-]{43}$/.test(token.trim())}>{es?'Aceptar invitación':'Accept invitation'}</button>
  </form>;
}
