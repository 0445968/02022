'use client';
import {useState,useRef} from 'react';
import Link from 'next/link';
import type {Locale} from '@/types';
import type {PublicPoll} from '@/lib/permissions/polls-contract';
export function PublicPollCard({poll,locale,verified,signedIn,returnPath}:{poll:PublicPoll;locale:Locale;verified:boolean;signedIn:boolean;returnPath?:string}){
 const es=locale==='es',[choice,setChoice]=useState<number|null>(null),[busy,setBusy]=useState(false),[locked,setLocked]=useState(false),[error,setError]=useState('');
 const running=useRef(false);
 async function vote(){
  if(running.current||locked||choice===null||!verified||!poll.open||poll.ownChoice!==null)return;
  if(!window.confirm(es?'¿Confirmar su voto? No podrá cambiarlo.':'Confirm your vote? You cannot change it.'))return;
  running.current=true;setBusy(true);setError('');
  try{const r=await fetch('/api/polls/'+poll.id+'/vote',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({choice})});
   if(!r.ok){setLocked(true);setError(r.status===429?(es?'Demasiados votos. Actualice e intente más tarde.':'Too many votes. Refresh and try later.'):(es?'No se confirmó el voto. Actualice para verificar.':'Vote not confirmed. Refresh to check.'));return;}
   const result=await r.json();if(result.pollId!==poll.id||result.choice!==choice||typeof result.alreadyVoted!=='boolean')throw Error();window.location.reload();
  }catch{setLocked(true);setError(es?'Resultado incierto. Actualice la página.':'Uncertain result. Refresh the page.');}
  finally{running.current=false;setBusy(false);}
 }
 const total=poll.counts?.reduce((a,b)=>a+b,0)??0;
 return <article className="space-y-4 rounded-[6px] border border-border bg-white p-5">
  <h2 className="font-headline text-xl font-semibold text-deep">{poll.question}</h2>
  <p className="text-xs text-muted-foreground">{poll.open?(es?'Votación abierta':'Voting open'):(es?'Votación cerrada':'Voting closed')} · {es?'Cierre previsto':'Scheduled close'} {new Intl.DateTimeFormat(locale,{timeZone:'America/Bogota',dateStyle:'medium',timeStyle:'short'}).format(new Date(poll.closesAt))} America/Bogota</p>
  <fieldset className="space-y-2" disabled={!poll.open||!verified||poll.ownChoice!==null||busy||locked}><legend className="sr-only">{es?'Elija una respuesta':'Choose an answer'}</legend>
   {poll.options.map((o,i)=><div key={i} className="space-y-1"><label className="flex items-center gap-2 text-sm"><input type="radio" name={'poll-'+poll.id} checked={poll.ownChoice===i||poll.ownChoice===null&&choice===i} onChange={()=>setChoice(i)}/>{o}</label>
    {poll.counts&&<div className="flex items-center gap-2"><div className="h-2 flex-1 bg-surface-muted"><div className="h-full bg-primary" style={{width:(total?poll.counts[i]/total*100:0)+'%'}}/></div><span className="text-xs">{poll.counts[i]} ({total?Math.round(poll.counts[i]/total*100):0}%)</span></div>}</div>)}
  </fieldset>
  {poll.ownChoice!==null?<p className="text-sm font-medium">{es?'Su voto está registrado.':'Your vote is recorded.'}</p>:poll.open?(verified?<button type="button" disabled={choice===null||busy||locked} onClick={()=>void vote()} className="rounded-[6px] bg-deep px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{es?'Votar':'Vote'}</button>:signedIn?<p className="text-sm">{es?'Verifique su correo para votar.':'Verify your email to vote.'}</p>:<Link className="text-sm text-primary underline" href={'/'+locale+'/auth/sign-in?next='+encodeURIComponent(returnPath??'/'+locale+'/polls')}>{es?'Inicie sesión para votar':'Sign in to vote'}</Link>):null}
  {!poll.open&&!poll.counts&&<p className="text-xs text-muted-foreground">{es?'Resultados aún no disponibles o muestra insuficiente.':'Results not yet available or sample too small.'}</p>}
  {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
 </article>;
}
