'use client';
import {useRef,useState} from 'react';
import {Upload} from 'lucide-react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {PrivateDraftMediaPanel} from './PrivateDraftMediaPanel';
import type {Locale} from '@/types';

export function PrivateDraftMediaDialog({open,onOpenChange,canReview,locale,onChanged,restoreFocus}:{open:boolean;onOpenChange:(open:boolean)=>void;canReview:boolean;locale:Locale;onChanged?:()=>void;restoreFocus?:()=>void}){
 const [busy,setBusy]=useState(false);
 const es=locale==='es';
 return <Dialog open={open} onOpenChange={next=>{if(next||!busy)onOpenChange(next);}}>
  <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl overflow-y-auto rounded-xl bg-white p-4" onEscapeKeyDown={e=>{if(busy)e.preventDefault();}} onInteractOutside={e=>{if(busy)e.preventDefault();}} onCloseAutoFocus={e=>{if(restoreFocus){e.preventDefault();restoreFocus();}}}>
   <DialogTitle>{es?'Cargar y revisar archivos':'Upload and review media'}</DialogTitle>
   <DialogDescription>{es?'Los archivos privados permanecen protegidos hasta su aprobación.':'Private files remain protected until approved.'}</DialogDescription>
   <PrivateDraftMediaPanel canReview={canReview} locale={locale} onBusyChange={setBusy} onChanged={onChanged}/>
  </DialogContent>
 </Dialog>;
}
export function PrivateMediaWorkspace({canReview,locale}:{canReview:boolean;locale:Locale}){
 const [open,setOpen]=useState(false),trigger=useRef<HTMLButtonElement>(null),es=locale==='es';
 return <div className="w-full min-w-0 space-y-3 px-3 py-4 sm:px-5"><header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3"><h1 className="font-headline text-2xl font-bold text-deep">{es?'Mis archivos privados':'My private media'}</h1><button type="button" ref={trigger} onClick={()=>setOpen(true)} className="inline-flex h-9 items-center gap-2 rounded-md bg-deep px-3 text-sm font-semibold text-white"><Upload size={16}/>{es?'Cargar archivos':'Upload media'}</button></header><p className="text-sm text-muted-foreground">{es?'Abra el diálogo para cargar, consultar y revisar sus archivos privados.':'Open the upload dialog to submit and check your private media.'}</p><PrivateDraftMediaDialog open={open} onOpenChange={setOpen} canReview={canReview} locale={locale} restoreFocus={()=>trigger.current?.focus()}/></div>;
}
