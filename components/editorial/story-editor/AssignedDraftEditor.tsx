'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import Link from 'next/link';
import {RichTextEditor} from '@/components/editorial/rich-text-editor';
import type {Dictionary} from '@/lib/i18n/dictionaries';
import type {Locale} from '@/types';
import type {DraftCopy,DraftState} from '@/lib/permissions/assigned-draft-contract';

import type {RevisionState} from '@/lib/permissions/assigned-revision-contract';

type EditorState=DraftState&Partial<Pick<RevisionState,'liveUpdatedAt'|'revisionId'>>;
const copyOf=(s:DraftState):DraftCopy=>({headline:s.headline,subheadline:s.subheadline,summary:s.summary,body:s.body});
const button='rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
export function AssignedDraftEditor({initial,dict,locale,userId,revisionMode=false,approvedMedia=false}:{initial:EditorState;dict:Dictionary;locale:Locale;userId:string;revisionMode?:boolean;approvedMedia?:boolean}){
 const es=locale==='es';
 const [state,setState]=useState(initial);
 const [draft,setDraft]=useState<DraftCopy>(()=>copyOf(initial));
 const [busy,setBusy]=useState(false),[problem,setProblem]=useState(''),[blocked,setBlocked]=useState(false);
 const [saved,setSaved]=useState(JSON.stringify(copyOf(initial)));
 const inFlight=useRef(false);
 const revision=useRef(initial.updatedAt);
 const dirty=JSON.stringify(draft)!==saved;
 const editable=state.status==='draft'&&!blocked;
 const valid=!!draft.headline.trim()&&draft.headline.length<=300&&(draft.subheadline?.length??0)<=600&&(draft.summary?.length??0)<=3000;
 const save=useCallback(async(action:'save'|'submit')=>{
   if(!editable||!valid||inFlight.current||(action==='submit'&&!state.canSubmit))return false;
   inFlight.current=true;setBusy(true);setProblem('');
   const snapshot=draft;
   try{
     const res=await fetch('/api/newsroom/contributor/stories/'+state.id+(revisionMode?'/revision':''),{method:'PUT',cache:'no-store',
       headers:{'Content-Type':'application/json'},body:JSON.stringify({action,expectedUpdatedAt:revision.current,copy:snapshot,...(revisionMode?{liveUpdatedAt:state.liveUpdatedAt,revisionId:state.revisionId}:{})})});
     if(!res.ok){
       setBlocked(res.status===409||res.status===403||res.status===404||res.status>=500);
       setProblem(res.status===409?(es?'El artículo cambió. Copie su trabajo antes de recargar.':'This story changed. Copy your work before reloading.'):
         res.status===422?(es?'Contenido no admitido o imagen no autorizada. Elimine o vuelva a elegir la imagen.':'Unsupported content or image no longer eligible. Remove or reselect the image.'):
         (es?'No se pudo confirmar el guardado. Recargue antes de reintentar.':'Save could not be confirmed. Reload before retrying.'));
       return false;
     }
     const next=await res.json() as EditorState;
     if(next.id!==state.id||!next.updatedAt||(revisionMode&&(!next.liveUpdatedAt||!next.revisionId))||(action==='submit'&&next.status!=='in_review'))throw Error();
     revision.current=next.updatedAt;setState(next);
     // Record what was sent, not a later edit. A subsequent save uses new token.
     setSaved(JSON.stringify(snapshot));
     if(action==='submit'){setDraft(copyOf(next));setSaved(JSON.stringify(copyOf(next)));}
     return true;
   }catch{setBlocked(true);setProblem(es?'No se pudo confirmar el guardado. Copie su trabajo y recargue.':'Save could not be confirmed. Copy your work and reload.');return false;}
   finally{inFlight.current=false;setBusy(false);}
 },[draft,editable,valid,state.id,state.canSubmit,state.liveUpdatedAt,state.revisionId,revisionMode,es]);
 useEffect(()=>{
   if(!dirty||!editable||!valid||busy||problem)return;
   const timer=setTimeout(()=>void save('save'),1500);
   return()=>clearTimeout(timer);
 },[dirty,editable,valid,busy,problem,save]);
 useEffect(()=>{
   if(!dirty&&!busy)return;
   const warn=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};
   window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);
 },[dirty,busy]);
 const update=(patch:Partial<DraftCopy>)=>{setDraft(current=>({...current,...patch}));if(!blocked)setProblem('');};
 async function goBack(){
   if(busy)return;
   if(dirty&&!(await save('save'))){
     if(!window.confirm(es?'¿Salir sin confirmar el guardado?':'Leave without a confirmed save?'))return;
   }
   window.location.assign('/newsroom/contributor');
 }
 return <div className="flex h-full flex-col bg-white">
   <header className="flex flex-wrap items-center gap-3 border-b border-border bg-white px-4 py-3">
     <button type="button" className={button} disabled={busy} onClick={()=>void goBack()}>← {es?'Mi espacio de trabajo':'My workspace'}</button>
     <span className="mr-auto text-sm font-semibold text-deep">{state.status==='in_review'?(es?'En revisión':'In review'):(revisionMode?(es?'Revisión no publicada':'Unpublished revision'):(es?'Borrador asignado':'Assigned draft'))}</span>
     <span className="text-xs text-muted-foreground" role="status">{busy?(es?'Guardando…':'Saving…'):dirty?(es?'Cambios sin guardar':'Unsaved changes'):(es?'Guardado':'Saved')}</span>
     {editable&&<button type="button" className={button} disabled={busy||!valid} onClick={()=>void save('save')}>{es?'Guardar':'Save'}</button>}
     {editable&&state.canSubmit&&<button type="button" className="rounded-md bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50" disabled={busy||!valid} onClick={()=>{if(window.confirm(es?'¿Enviar estos cambios a revisión editorial?':'Submit these changes for editorial review?'))void save('submit');}}>{es?'Enviar a revisión':'Submit for review'}</button>}
     {state.status==='in_review'&&<Link className={button} href={'/newsroom/stories/'+state.id+'/preview'+(revisionMode?'?revision=1':'')}>{es?'Vista previa':'Preview'}</Link>}
   </header>
   <p className="border-b border-border px-4 py-2 text-xs text-muted-foreground">{revisionMode&&(es?'El artículo publicado no se modifica. ':'The published article remains unchanged. ')}{es?'La publicación, asignación y metadatos requieren revisión separada.':'Publication, assignments and metadata require separate review.'}</p>
   {problem&&<p role="alert" className="border-b border-border px-4 py-2 text-sm text-breaking">{problem}</p>}
   {state.status==='in_review'?<div className="mx-auto max-w-3xl px-6 py-8"><h2 className="font-headline text-xl font-bold text-deep">{state.headline}</h2><p className="mt-3 text-sm">{es?'Borrador enviado. El equipo editorial controla los próximos pasos.':'Changes submitted. The editorial team controls the next steps.'}</p></div>:
   <div className="min-h-0 flex-1 overflow-auto">
     <fieldset disabled={!editable||busy} className="mx-auto max-w-3xl space-y-3 px-6 py-5 lg:px-12">
       <label className="block text-xs font-semibold text-muted-foreground">{es?'Titular':'Headline'}<input className="mt-1 w-full border-b border-border bg-white py-2 font-headline text-2xl font-bold text-deep" maxLength={300} value={draft.headline} onChange={e=>update({headline:e.target.value})}/></label>
       <label className="block text-xs font-semibold text-muted-foreground">{es?'Subtítulo':'Subheadline'}<input className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" maxLength={600} value={draft.subheadline??''} onChange={e=>update({subheadline:e.target.value||null})}/></label>
       <label className="block text-xs font-semibold text-muted-foreground">{es?'Resumen':'Summary'}<textarea className="mt-1 w-full rounded-md border border-border px-3 py-2 text-sm" maxLength={3000} value={draft.summary??''} onChange={e=>update({summary:e.target.value||null})}/></label>
     </fieldset>
     <RichTextEditor content={draft.body} onChange={body=>update({body})} dict={dict} userId={userId} placeholder={dict.story.bodyPlaceholder} allowMedia={approvedMedia} assignedMedia={approvedMedia?{storyId:state.id,revision:revisionMode,locale}:undefined} editable={editable&&!busy}/>
   </div>}
 </div>;
}
