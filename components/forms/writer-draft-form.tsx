'use client';
import {useRef,useState,type FormEvent} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {Locale} from '@/types';
import {DRAFT_UUID} from '@/lib/permissions/assigned-draft-contract';
import type {WriterDraftInput} from '@/lib/permissions/writer-draft-contract';
export function WriterDraftForm({locale}:{locale:Locale}){
 const es=locale==='es',router=useRouter();
 const [headline,setHeadline]=useState(''),[language,setLanguage]=useState<'en'|'es'>(locale==='es'?'es':'en');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[uncertain,setUncertain]=useState(false),[blocked,setBlocked]=useState(false);
 const request=useRef<WriterDraftInput|null>(null),inFlight=useRef(false);
 async function submit(event:FormEvent<HTMLFormElement>){
  event.preventDefault();if(inFlight.current||blocked||!headline.trim())return;
  inFlight.current=true;setBusy(true);setError('');
  try{
   const input=request.current??{requestId:crypto.randomUUID(),headline:headline.trim(),language};
   request.current=input;
   const res=await fetch('/api/newsroom/contributor/stories',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify(input)});
   if(!res.ok){
    if(res.status===422){request.current=null;setUncertain(false);setError(es?'Revise el titular y el idioma.':'Check the headline and language.');}
    else if(res.status===403||res.status===404||res.status===409){setBlocked(true);setUncertain(false);setError(es?'No se puede continuar. Revise su espacio de trabajo antes de intentar de nuevo.':'Unable to continue. Check your workspace before trying again.');}
    else throw Error();
    return;
   }
   const result=await res.json() as {id?:string};
   if(!result.id||!DRAFT_UUID.test(result.id))throw Error();
   setBlocked(true);router.replace('/newsroom/contributor/stories/'+result.id);router.refresh();
  }catch{setUncertain(true);setError(es?'No se pudo confirmar la creación. Reintente la misma solicitud o revise sus asignaciones.':'Creation could not be confirmed. Retry the same request or check your assignments.');}
  finally{inFlight.current=false;setBusy(false);}
 }
 const disabled=busy||blocked||uncertain;
 return <div className="mx-auto max-w-2xl space-y-4 px-6 py-8">
  <Link href="/newsroom/contributor" className="text-sm text-primary underline">{es?'Mi espacio de trabajo':'My workspace'}</Link>
  <h1 className="font-headline text-2xl font-bold text-deep">{es?'Nuevo borrador':'New draft'}</h1>
  <p className="text-sm text-muted-foreground">{es?'El borrador se asignará a usted. El equipo editorial controla la firma pública y la publicación.':'The draft will be assigned to you. The editorial team controls the public byline and publication.'}</p>
  <form onSubmit={e=>void submit(e)} className="space-y-4 rounded-lg border border-border bg-white p-5">
   <label className="block text-sm font-semibold">{es?'Titular':'Headline'}<input className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 font-normal" required maxLength={300} value={headline} disabled={disabled} onChange={e=>setHeadline(e.target.value)}/></label>
   <label className="block text-sm font-semibold">{es?'Idioma del artículo':'Article language'}<select className="mt-1 w-full rounded-md border border-border bg-white px-3 py-2 font-normal" value={language} disabled={disabled} onChange={e=>setLanguage(e.target.value==='es'?'es':'en')}><option value="en">English</option><option value="es">Español</option></select></label>
   {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
   <button type="submit" disabled={busy||blocked||!headline.trim()} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?(es?'Creando…':'Creating…'):uncertain?(es?'Reintentar solicitud':'Retry same request'):(es?'Crear borrador':'Create draft')}</button>
  </form>
 </div>;
}
