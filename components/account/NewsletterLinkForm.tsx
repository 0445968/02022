'use client';
import {useEffect,useState} from 'react';
import type {Locale} from '@/types';
export function NewsletterLinkForm({locale}:{locale:Locale}){
 const es=locale==='es',[payload,setPayload]=useState<{action:'confirm'|'unsubscribe';token:string}|null>(null),[ready,setReady]=useState(false),[busy,setBusy]=useState(false),[done,setDone]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{const p=new URLSearchParams(location.hash.slice(1)),confirm=p.get('confirm'),unsub=p.get('unsubscribe');if(!!confirm!==!!unsub){const token=confirm??unsub!;if(token.length<=200)setPayload({action:confirm?'confirm':'unsubscribe',token});}history.replaceState(null,'',location.pathname);setReady(true);},[]);
 async function submit(){if(!payload||busy)return;setBusy(true);try{const r=await fetch('/api/newsletters/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});if(!r.ok||(await r.json()).ok!==true)throw Error();setDone(true);setPayload(null);}catch{setError(true);}finally{setBusy(false);}}
 return <div className="space-y-3 rounded border border-border bg-white p-5">{done?<p role="status">{es?'Preferencia actualizada.':'Preference updated.'}</p>:error||ready&&!payload?<p role="alert">{es?'El enlace no está disponible. Puede administrar preferencias desde su cuenta.':'Link unavailable. Manage preferences from your account.'}</p>:payload?<button disabled={busy} onClick={()=>void submit()} className="rounded bg-primary px-4 py-2 text-sm font-semibold text-white">{payload.action==='confirm'?(es?'Confirmar suscripción':'Confirm subscription'):(es?'Cancelar suscripción':'Unsubscribe')}</button>:<p>{es?'Cargando…':'Loading…'}</p>}</div>;
}
