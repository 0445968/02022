'use client';
import {useState,type FormEvent} from 'react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import type {Locale} from '@/types';
import type {StaffOnboardingState} from '@/lib/permissions/staff-onboarding-types';
const copy={
 en:{welcome:'Welcome to the Newsroom',title:'Your staff profile',desc:'Set up your private working identity. Your administrator has already assigned your access.',
 access:'Assigned access',employee:'Employee',contractor:'Contractor',freelancer:'Freelancer',expires:'Membership expires',noExpiry:'No scheduled expiry',roles:'Assigned roles',noRoles:'No active role assignments',
 name:'Private display name',language:'Preferred Newsroom language',byline:'Request a public author byline',bylineNote:'This records a private request preference only. An administrator must separately review and link a public byline; this does not create or publish one.',
 privacy:'Your staff profile is separate from your reader account and public author profile. Saving it does not grant additional permissions.',
 acknowledge:'I understand that access is limited to assigned permissions, unpublished material must remain confidential, and any public byline requires separate approval.',
 finish:'Complete onboarding',save:'Save profile',saved:'Your private profile was saved.',continue:'Continue to Newsroom',error:'Unable to save your profile. Refresh before trying again.',conflict:'This profile changed in another session. Reload before saving.',loading:'Saving…'},
 es:{welcome:'Bienvenido a la redacción',title:'Su perfil del equipo',desc:'Configure su identidad privada de trabajo. Su administrador ya asignó sus accesos.',
 access:'Acceso asignado',employee:'Empleado',contractor:'Contratista',freelancer:'Colaborador independiente',expires:'Vencimiento de membresía',noExpiry:'Sin vencimiento programado',roles:'Funciones asignadas',noRoles:'Sin funciones activas',
 name:'Nombre privado para mostrar',language:'Idioma preferido de la redacción',byline:'Solicitar una firma pública de autor',bylineNote:'Solo registra una preferencia privada. Un administrador debe revisar y vincular la firma por separado; esto no crea ni publica una firma.',
 privacy:'Su perfil del equipo es independiente de su cuenta de lector y perfil público de autor. Guardarlo no concede permisos adicionales.',
 acknowledge:'Entiendo que el acceso se limita a los permisos asignados, que el material no publicado es confidencial y que una firma pública requiere aprobación separada.',
 finish:'Completar incorporación',save:'Guardar perfil',saved:'Se guardó su perfil privado.',continue:'Ir a la redacción',error:'No se pudo guardar su perfil. Actualice antes de reintentar.',conflict:'El perfil cambió en otra sesión. Recargue antes de guardar.',loading:'Guardando…'}
} as const;
const field='mt-1 w-full rounded-md border border-border bg-white px-3 py-2 text-sm';
export function StaffOnboardingForm({initial,locale,suggestedName}:{initial:StaffOnboardingState;locale:Locale;suggestedName:string}){
  const router=useRouter();
  const [state,setState]=useState(initial);
  const [name,setName]=useState(initial.profile?.displayName??suggestedName);
  const [language,setLanguage]=useState<Locale>(initial.profile?.locale??locale);
  const [requestByline,setRequestByline]=useState(initial.profile?.bylineRequested??false);
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [saved,setSaved]=useState(false);
  const t=copy[language==='es'?'es':'en'];
  const valid=name.trim().length>=2&&name.trim().length<=120&&confirmed;
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(!valid||busy)return;
    setBusy(true);setError('');setSaved(false);
    try{
      const res=await fetch('/api/newsroom/onboarding',{method:'POST',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expectedRevision:state.profile?.revision??0,displayName:name.trim(),locale:language,
          bylineRequested:requestByline,acknowledgedVersion:1,confirmed:true})});
      if(!res.ok){setError(res.status===409?t.conflict:t.error);return;}
      const next=await res.json() as StaffOnboardingState;
      if(!next.profile){setError(t.error);return;}
      setState(next);setName(next.profile.displayName);setConfirmed(false);setSaved(true);
      router.refresh();
    }catch{setError(t.error);}finally{setBusy(false);}
  }
  return <div className="mx-auto max-w-3xl space-y-5 px-6 py-8">
    <header className="border-b border-border pb-5"><h1 className="font-headline text-2xl font-bold text-deep">{state.profile?t.title:t.welcome}</h1><p className="mt-1 text-sm text-muted-foreground">{t.desc}</p></header>
    <section className="rounded-lg border border-border bg-white p-5 space-y-3">
      <h2 className="text-base font-semibold text-deep">{t.access}</h2>
      <p className="text-sm">{t[state.memberType]} · {state.expiresAt?t.expires+' '+new Date(state.expiresAt).toLocaleString(language==='es'?'es-ES':'en-US'):t.noExpiry}</p>
      <p className="text-xs font-medium text-muted-foreground">{t.roles}</p>
      <div className="flex flex-wrap gap-2">{state.roles.map(r=><span key={r.key} className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs">{language==='es'?r.nameEs:r.nameEn}</span>)}
      {!state.roles.length&&<p className="text-sm text-muted-foreground">{t.noRoles}</p>}</div>
    </section>
    <form onSubmit={e=>void submit(e)} className="space-y-4 rounded-lg border border-border bg-white p-5">
      <p className="text-sm text-muted-foreground">{t.privacy}</p>
      {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
      {saved&&<p role="status" className="text-sm text-foreground">{t.saved}</p>}
      <label className="block text-sm font-medium">{t.name}<input className={field} value={name} minLength={2} maxLength={120} required disabled={busy} onChange={e=>{setName(e.target.value);setConfirmed(false);setSaved(false);}}/></label>
      <label className="block text-sm font-medium">{t.language}<select className={field} value={language} disabled={busy} onChange={e=>{setLanguage(e.target.value as Locale);setConfirmed(false);setSaved(false);}}><option value="en">English</option><option value="es">Español</option></select></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={requestByline} disabled={busy} onChange={e=>{setRequestByline(e.target.checked);setConfirmed(false);setSaved(false);}}/>{t.byline}</label>
      <p className="text-xs text-muted-foreground">{t.bylineNote}</p>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{t.acknowledge}</label>
      <div className="flex flex-wrap items-center gap-3"><button type="submit" disabled={!valid||busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy?t.loading:state.profile?t.save:t.finish}</button>
      {state.profile&&<Link href="/newsroom" className="text-sm font-medium text-primary underline">{t.continue}</Link>}</div>
    </form>
  </div>;
}
