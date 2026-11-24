'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {AlertTriangle,CheckCircle2,RefreshCw,ShieldCheck} from 'lucide-react';
import type {Locale} from '@/types';
import {CAPABILITY_KEYS,type AccessScope,type Capability} from '@/lib/permissions/capabilities';
import {canOverrideCapability,type OverrideEffect,type OverrideOperation} from '@/lib/permissions/staff-override-input';
import type {TeamMember} from '@/lib/permissions/staff-team-types';
import type {MemberEffectiveAccess,MemberOverride} from '@/lib/permissions/staff-effective-types';

const languages={
 en:{
  heading:'Effective access & exceptions',sub:'Live database roles and overrides, not the proposed template.',
  preview:'Access preview',allow:'Allowed without a resource',denied:'Not granted',
  conditional:'Requires actual resource check',warning:'Conditional is not permission: assignment, ownership or scoped denials must be verified against a real record.',
  refresh:'Refresh access',loading:'Checking current grants…',error:'Cannot load permission preview.',
  cap:'Capability',scope:'Scope',effect:'Exception',none:'No overrides configured.',
  reason:'Audit reason',reasonNote:'12–500 characters. This will be recorded with your account.',
  expiration:'Expiration',remove:'Remove selected override',set:'Save exception',
  activeExceptions:'Individual permission overrides',readonly:'Only a current authorized owner may change these exceptions.',
  confirm:'I understand this changes access and creates an audit record.',
  submit:'Apply audited exception',saved:'Access exception saved and rechecked.',
  one:'1 day',seven:'7 days',thirty:'30 days',ninety:'90 days',
  permanent:'No expiry (deny only)',days:' days',expiry:'Expires',noOwner:'Owner or own membership cannot be overridden.',
  scopeAll:'All resources',scopeAssigned:'Assigned resources',scopeOwn:'Own resources',
  effectAllow:'Temporary allow',effectDeny:'Explicit deny',choose:'Select existing override',
  noMatch:'No matching exception to remove.',state:'State',note:'No real article/media resource was queried.',
 },
 es:{
  heading:'Acceso efectivo y excepciones',sub:'Funciones y excepciones reales, no la propuesta de plantilla.',
  preview:'Vista del acceso',allow:'Permitido sin recurso',denied:'Sin autorización',
  conditional:'Requiere verificar el recurso',warning:'Condicional no equivale a autorización: se deben verificar las asignaciones, la titularidad y las denegaciones específicas.',
  refresh:'Actualizar acceso',loading:'Verificando permisos…',error:'No se pudo cargar la vista de permisos.',
  cap:'Permiso',scope:'Alcance',effect:'Excepción',none:'No hay excepciones configuradas.',
  reason:'Motivo de auditoría',reasonNote:'12–500 caracteres. Se registrará con su cuenta.',
  expiration:'Vencimiento',remove:'Quitar excepción seleccionada',set:'Guardar excepción',
  activeExceptions:'Excepciones individuales',readonly:'Solo un propietario autorizado puede modificar estas excepciones.',
  confirm:'Entiendo que cambiará los accesos y se registrará en auditoría.',
  submit:'Aplicar excepción auditada',saved:'Excepción guardada y acceso actualizado.',
  one:'1 día',seven:'7 días',thirty:'30 días',ninety:'90 días',
  permanent:'Sin vencimiento (solo denegar)',days:' días',expiry:'Vence',noOwner:'No se puede modificar al propietario ni su propia cuenta.',
  scopeAll:'Todos los recursos',scopeAssigned:'Recursos asignados',scopeOwn:'Recursos propios',
  effectAllow:'Permitir temporalmente',effectDeny:'Denegar',choose:'Seleccione una excepción',
  noMatch:'No se encontró la excepción.',state:'Estado',note:'No se consultó un artículo o archivo específico.',
 }
} as const;
const field='w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground';
const button='inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium disabled:opacity-50';
const choices=CAPABILITY_KEYS.filter(capability=>canOverrideCapability(capability));
const DAY=86_400_000;
function displayDate(s:string|null,locale:Locale):string{
 if(!s)return '—';
 const date=new Date(s);
 return Number.isFinite(date.valueOf())?new Intl.DateTimeFormat(locale==='es'?'es-ES':'en-US',{dateStyle:'medium'}).format(date):'—';
}
function uniqueKey(o:MemberOverride){return o.capability+'|'+o.scope;}

export function StaffPermissionInspector({
  member,locale,canWrite,onSaved
}:{
  member:TeamMember;locale:Locale;canWrite:boolean;onSaved:()=>Promise<void>;
}){
 const t=languages[locale==='es'?'es':'en'];
 const [preview,setPreview]=useState<MemberEffectiveAccess|null>(null);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState<string|null>(null);
 const [success,setSuccess]=useState<string|null>(null);
 const [search,setSearch]=useState('');
 const [operation,setOperation]=useState<OverrideOperation>('set');
 const [capability,setCapability]=useState<Capability>('story.edit_assigned');
 const [scope,setScope]=useState<AccessScope>('assigned');
 const [effect,setEffect]=useState<OverrideEffect>('deny');
 const [days,setDays]=useState('7');
 const [reason,setReason]=useState('');
 const [confirmed,setConfirmed]=useState(false);
 const [selectedExisting,setSelectedExisting]=useState('');

 const reload=useCallback(async()=>{
   const response=await fetch('/api/newsroom/team/'+encodeURIComponent(member.id)+'/effective',{
     cache:'no-store'
   });
   const result=await response.json() as MemberEffectiveAccess & {error?:string};
   if(!response.ok)throw Error(result.error??t.error);
   setPreview(result);
 },[member.id,t.error]);
 useEffect(()=>{
   let current=true;
   setPreview(null);setError(null);setSuccess(null);
   void reload().catch((e:unknown)=>{
     if(current)setError(e instanceof Error?e.message:t.error);
   });
   return ()=>{current=false;};
 },[reload,t.error]);
 const visible=useMemo(()=>preview?.permissions.filter(p=>p.capability.toLowerCase().includes(search.toLowerCase()))??[],[preview,search]);
 const existing=preview?.overrides??[];
 const grantDate=()=>{
   const n=Number(days);
   return effect==='deny'&&days==='none'?null:new Date(Date.now()+n*DAY).toISOString();
 };
 const ready=canWrite&&!member.isSelf&&member.status!=='revoked'
   &&reason.trim().length>=12&&reason.length<=500&&confirmed&&!busy
   &&(operation==='set'||!!selectedExisting);
 async function submit(event:FormEvent<HTMLFormElement>){
   event.preventDefault();
   if(!ready)return;
   setBusy(true);setError(null);setSuccess(null);
   try{
     const prior=existing.find(o=>uniqueKey(o)===selectedExisting);
     if(operation==='remove'&&!prior)throw Error(t.noMatch);
     const payload={
       targetMembershipId:member.id,operation,
       capability:operation==='remove'?prior!.capability:capability,
       scope:operation==='remove'?prior!.scope:scope,
       effect:operation==='remove'?null:effect,
       expiresAt:operation==='remove'?null:grantDate(),
       reason:reason.trim()
     };
     const response=await fetch('/api/newsroom/team/override-change',{
       method:'POST',headers:{'Content-Type':'application/json'},
       body:JSON.stringify(payload)
     });
     const result=await response.json() as {ok?:boolean;error?:string};
     if(!response.ok||!result.ok)throw Error(result.error??t.error);
     await reload();await onSaved();
     setReason('');setConfirmed(false);setSuccess(t.saved);
   }catch(e){setError(e instanceof Error?e.message:t.error);}
   finally{setBusy(false);}
 }
 return <section className="mt-5 space-y-4 border-t border-border pt-4">
  <header className="flex flex-wrap items-center justify-between gap-3">
   <div><h3 className="text-sm font-semibold text-deep">{t.heading}</h3>
     <p className="mt-1 text-xs text-muted-foreground">{t.sub}</p></div>
   <button type="button" className={button} disabled={busy}
     onClick={()=>void reload().catch((e:unknown)=>setError(e instanceof Error?e.message:t.error))}>
     <RefreshCw className="h-4 w-4"/>{t.refresh}
   </button>
  </header>
  {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
  {success&&<p role="status" className="flex items-center gap-2 text-sm">
   <CheckCircle2 className="h-4 w-4"/>{success}</p>}
  {!preview?<p className="text-sm text-muted-foreground">{t.loading}</p>:<>
   <p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-xs text-muted-foreground">
    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{t.warning}
   </p>
   <div className="grid grid-cols-3 gap-2">
    {(['allowed','conditional','denied'] as const).map(status=>
     <div key={status} className="rounded-md border border-border p-2 text-center">
      <p className="text-lg font-bold text-deep">{preview.permissions.filter(p=>p.state===status).length}</p>
      <p className="text-xs text-muted-foreground">{status==='allowed'?t.allow:status==='conditional'?t.conditional:t.denied}</p>
     </div>)}
   </div>
   <div>
    <label className="block text-xs font-medium">{t.preview}
     <input className={field+' mt-1'} value={search}
       onChange={e=>setSearch(e.target.value)} placeholder={t.cap}/>
    </label>
    <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-border">
     {visible.map(p=><div key={p.capability}
       className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 text-xs last:border-b-0">
       <span className="truncate">{p.capability}</span>
       <span className="shrink-0 text-muted-foreground">
        {p.state==='allowed'?t.allow:p.state==='conditional'?t.conditional:t.denied}
       </span>
     </div>)}
    </div>
    <p className="mt-2 text-xs text-muted-foreground">{t.note}</p>
   </div>
   <div>
    <h4 className="text-sm font-semibold text-deep">{t.activeExceptions}</h4>
    {existing.length===0?<p className="mt-2 text-sm text-muted-foreground">{t.none}</p>:
     <ul className="mt-2 space-y-2">{existing.map(o=><li key={o.id}
       className="rounded-md border border-border px-3 py-2 text-xs">
       <span className="font-semibold">{o.effect==='deny'?t.effectDeny:t.effectAllow}</span>
       {' · '}{o.capability}{' · '}{o.scope}
       {o.expiresAt&&<span className="text-muted-foreground"> · {t.expiry} {displayDate(o.expiresAt,locale)}</span>}
       <p className="mt-1 text-muted-foreground">{o.reason}</p>
     </li>)}</ul>}
   </div>
  </>}
  {(!canWrite||member.isSelf)?<p className="text-xs text-muted-foreground">{t.readonly}</p>:
  <form onSubmit={event=>void submit(event)} className="space-y-3 border-t border-border pt-4">
    <label className="block text-sm font-medium">{t.effect}
      <select className={field+' mt-1'} value={operation} onChange={e=>{
        setOperation(e.target.value as OverrideOperation);setConfirmed(false);
      }}>
        <option value="set">{t.set}</option>
        <option value="remove">{t.remove}</option>
      </select>
    </label>
    {operation==='remove'?<label className="block text-sm font-medium">{t.choose}
      <select className={field+' mt-1'} value={selectedExisting}
        onChange={e=>setSelectedExisting(e.target.value)}>
        <option value="">{t.choose}</option>
        {existing.map(o=><option key={o.id} value={uniqueKey(o)}>
          {o.capability} · {o.scope} · {o.effect}</option>)}
      </select>
    </label>:<>
      <label className="block text-sm font-medium">{t.cap}
        <select className={field+' mt-1'} value={capability}
          onChange={e=>setCapability(e.target.value as Capability)}>
          {choices.map(c=><option key={c} value={c}>{c}</option>)}
        </select>
      </label>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-sm font-medium">{t.scope}
          <select className={field+' mt-1'} value={scope}
            onChange={e=>setScope(e.target.value as AccessScope)}>
            <option value="all">{t.scopeAll}</option>
            <option value="assigned">{t.scopeAssigned}</option>
            <option value="own">{t.scopeOwn}</option>
          </select>
        </label>
        <label className="block text-sm font-medium">{t.effect}
          <select className={field+' mt-1'} value={effect}
            onChange={e=>{setEffect(e.target.value as OverrideEffect);setDays('7');}}>
            <option value="deny">{t.effectDeny}</option>
            <option value="allow">{t.effectAllow}</option>
          </select>
        </label>
      </div>
      <label className="block text-sm font-medium">{t.expiration}
        <select className={field+' mt-1'} value={days}
          onChange={e=>setDays(e.target.value)}>
          {effect==='deny'&&<option value="none">{t.permanent}</option>}
          <option value="1">{t.one}</option>
          <option value="7">{t.seven}</option>
          <option value="30">{t.thirty}</option>
          <option value="90">{t.ninety}</option>
        </select>
      </label>
    </>}
    <label className="block text-sm font-medium">{t.reason}
      <textarea className={field+' mt-1'} rows={3} maxLength={500}
        value={reason} placeholder={t.reasonNote}
        onChange={e=>setReason(e.target.value)}/>
    </label>
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" className="mt-1" checked={confirmed}
        onChange={e=>setConfirmed(e.target.checked)}/>
      <span>{t.confirm}</span>
    </label>
    <button type="submit" disabled={!ready} className={button}>
      <ShieldCheck className="h-4 w-4"/>{t.submit}
    </button>
  </form>}
 </section>;
}
