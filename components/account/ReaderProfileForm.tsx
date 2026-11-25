'use client';
import {useState,useRef} from 'react';
import {useRouter} from 'next/navigation';
import type {AvatarChoice,ReaderAccount,ReaderLocale} from '@/lib/permissions/reader-account-contract';
import {parseReaderAccount} from '@/lib/permissions/reader-account-contract';
export function ReaderProfileForm({initial}:{initial:ReaderAccount}){
 const router=useRouter(),lock=useRef(false);
 const [state,setState]=useState(initial),[name,setName]=useState(initial.displayName),[locale,setLocale]=useState<ReaderLocale>(initial.locale),[avatar,setAvatar]=useState<AvatarChoice>('keep'),[busy,setBusy]=useState(false),[error,setError]=useState(false),[saved,setSaved]=useState(false),[uncertain,setUncertain]=useState(false);
 const es=state.locale==='es',preview=avatar==='keep'?state.image:avatar==='initials'?null:'/avatars/reader-'+avatar+'.svg';
 async function save(e:React.FormEvent){e.preventDefault();if(lock.current||uncertain)return;lock.current=true;setBusy(true);setError(false);setSaved(false);try{
  const response=await fetch('/api/account/profile',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'profile',displayName:name,locale,avatar,expectedUpdatedAt:state.updatedAt})});
  if(!response.ok)throw Error();const next=parseReaderAccount(await response.json());setState(next);setName(next.displayName);setLocale(next.locale);setAvatar('keep');setSaved(true);router.refresh();
 }catch{setError(true);setUncertain(true);}finally{lock.current=false;setBusy(false);}}
 return <form onSubmit={save} className="min-w-0 space-y-5 rounded-lg border border-border bg-white p-4 sm:p-5">
  <p className="text-sm text-muted-foreground">{es?'El nombre y avatar de lector pueden aparecer junto a sus comentarios. No cambian su firma editorial ni sus permisos.':'Your reader name and avatar may appear with your comments. They do not change editorial bylines or permissions.'}</p>
  <label className="block space-y-1 text-sm font-semibold">{es?'Nombre visible':'Display name'}<input className="block w-full rounded-md border border-border p-2 font-normal" value={name} onChange={e=>setName(e.target.value)} required maxLength={80} disabled={busy||uncertain}/></label>
  <label className="block space-y-1 text-sm font-semibold">{es?'Idioma de la cuenta':'Account language'}<select className="block w-full rounded-md border border-border p-2 font-normal" value={locale} onChange={e=>setLocale(e.target.value as ReaderLocale)} disabled={busy||uncertain}><option value="en">English</option><option value="es">Español</option></select></label>
  <div className="space-y-2"><p className="text-sm font-semibold">{es?'Avatar':'Avatar'}</p><div className="flex flex-wrap items-center gap-4"><span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-deep text-lg font-bold text-white">{preview?<img src={preview} alt="" className="h-full w-full"/>:name.trim().slice(0,1).toUpperCase()}</span><select aria-label={es?'Elegir avatar':'Choose avatar'} className="min-w-0 max-w-full rounded-md border border-border p-2 text-sm" value={avatar} onChange={e=>setAvatar(e.target.value as AvatarChoice)} disabled={busy||uncertain}><option value="keep">{es?'Conservar actual':'Keep current'}</option><option value="initials">{es?'Iniciales':'Initials'}</option><option value="ocean">{es?'Océano':'Ocean'}</option><option value="sun">{es?'Sol':'Sun'}</option><option value="island">{es?'Isla':'Island'}</option></select></div></div>
  <div className="text-sm"><p className="font-semibold">{es?'Correo de acceso':'Sign-in email'}</p><p className="break-all">{state.email}</p><a href="/account/security" className="text-primary underline">{es?'Administrar seguridad':'Manage security'}</a></div>
  {error&&<p role="alert" className="text-sm text-breaking">{es?'No se pudo confirmar el guardado. Recargue antes de reintentar.':'Save could not be confirmed. Reload before retrying.'}</p>}
  {saved&&<p role="status" className="text-sm text-live">{es?'Perfil guardado.':'Profile saved.'}</p>}
  <button type="submit" disabled={busy||uncertain||!name.trim()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?(es?'Guardando…':'Saving…'):(es?'Guardar perfil':'Save profile')}</button>
 </form>;
}
