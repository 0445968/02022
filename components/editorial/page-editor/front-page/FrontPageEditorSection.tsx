'use client';
import {ChevronDown} from 'lucide-react';
interface FrontPageEditorSectionProps {
 number:string;title:string;description?:string;children:React.ReactNode;
}
/** Native disclosure preserves the mounted slot editors and controller state. */
export function FrontPageEditorSection({number,title,description,children}:FrontPageEditorSectionProps){
 return <details data-front-page-section={number} className="group min-w-0 rounded-2xl border border-border bg-surface-muted/25">
  <summary className="flex cursor-pointer list-none items-start gap-3 rounded-2xl bg-white p-4 text-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary group-open:rounded-b-none group-open:border-b group-open:border-border sm:gap-4 sm:p-5 [&::-webkit-details-marker]:hidden">
   <span aria-hidden="true" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-deep text-xs font-bold text-white">{number}</span>
   <span className="min-w-0 flex-1">
    <span className="block font-headline text-xl font-bold tracking-tight text-deep">{title}</span>
    {description&&<span className="mt-1 block max-w-4xl text-sm leading-6 text-muted-foreground">{description}</span>}
   </span>
   <ChevronDown aria-hidden="true" className="mt-2 h-4 w-4 shrink-0 transition-transform group-open:rotate-180 motion-reduce:transition-none"/>
  </summary>
  <div className="min-w-0 p-4 sm:p-5 xl:p-6">{children}</div>
 </details>;
}
