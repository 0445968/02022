'use client';

import {useCallback,useEffect,useRef,useState,type FormEvent} from 'react';
import {MailPlus,Copy,RefreshCw} from 'lucide-react';
import type {Locale} from '@/types';
import type {TeamPreset} from '@/lib/permissions/staff-team-types';
import type {StaffInviteDirectory,StaffInviteRow} from '@/lib/permissions/staff-invite-types';

const copy={
 en:{title:'Staff invitations',description:'Issue a private, single-use code for a verified email. No email is sent by Clear Talks.',
 email:'Invitee email',preset:'Configured role preset',choose:'Choose a role',type:'Membership type',employee:'Employee',contractor:'Contractor',freelancer:'Freelancer',
 days:'Invitation lifetime (days)',contract:'Membership lifetime (days)',reason:'Audit reason (12–500 characters)',confirm:'I authorize this access and understand it is audited.',
 create:'Create invitation',replace:'Replace invitation',cancel:'Cancel invitation',stop:'Stop editing',pending:'Pending',expired:'Expired',canceled:'Canceled',redeemed:'Redeemed',invalidated:'Invalidated',
 refresh:'Refresh',previous:'Previous',next:'Next',page:'Page',noInvites:'No invitations on this page.',noPresets:'No configured eligible presets. Configure and review grants first.',
 code:'Private invitation code — shown once',copy:'Copy code',copied:'Copied',hide:'Hide code',private:'Share securely with the intended recipient. They must sign in with the invited, verified email and enter this code at:',
 replaceHint:'Enter the original exact email. Replacement invalidates the previous code. Choose the new preset and expiry explicitly.',
 cancelHint:'Confirm cancellation with an audit reason.',failed:'Invitation request failed. Refresh before retrying; no automatic retry.',conflict:'Invitation or preset changed. Refresh and review before retrying.',rate:'Issuance limit reached. Try again later.',
 success:'Invitation change recorded.',expires:'Expires',revision:'Revision',loading:'Loading invitations…',manual:'Created — not emailed.'},
 es:{title:'Invitaciones del equipo',description:'Genere un código privado de un solo uso para un correo verificado. Clear Talks no envía correos.',
 email:'Correo de la persona invitada',preset:'Función configurada',choose:'Seleccione una función',type:'Tipo de membresía',employee:'Empleado',contractor:'Contratista',freelancer:'Colaborador independiente',
 days:'Vigencia de invitación (días)',contract:'Vigencia de membresía (días)',reason:'Motivo de auditoría (12–500 caracteres)',confirm:'Autorizo este acceso y entiendo que quedará registrado.',
 create:'Crear invitación',replace:'Reemplazar invitación',cancel:'Cancelar invitación',stop:'Dejar de editar',pending:'Pendiente',expired:'Vencida',canceled:'Cancelada',redeemed:'Canjeada',invalidated:'Invalidada',
 refresh:'Actualizar',previous:'Anterior',next:'Siguiente',page:'Página',noInvites:'No hay invitaciones en esta página.',noPresets:'No hay funciones elegibles configuradas. Configure y revise los permisos primero.',
 code:'Código privado — se muestra una sola vez',copy:'Copiar código',copied:'Copiado',hide:'Ocultar código',private:'Compártalo de forma segura con la persona invitada. Debe iniciar sesión con su correo verificado e ingresar el código en:',
 replaceHint:'Ingrese el correo original exacto. El reemplazo invalida el código anterior. Seleccione la nueva función y vigencia explícitamente.',
 cancelHint:'Confirme la cancelación con un motivo de auditoría.',failed:'No se pudo procesar la invitación. Actualice antes de reintentar; no hay reintentos automáticos.',conflict:'La invitación o función cambió. Actualice y revise antes de reintentar.',rate:'Límite de invitaciones alcanzado. Intente más tarde.',
 success:'Cambio de invitación registrado.',expires:'Vence',revision:'Revisión',loading:'Cargando invitaciones…',manual:'Creada — sin enviar correo.'}
} as const;
const field='w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground';
const button='inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium hover:bg-surface-muted disabled:opacity-50';
const endpoint='/api/newsroom/team/invitations';
const day=86400000;

export function StaffInvitationManager({locale,presets}:{locale:Locale;presets:TeamPreset[]}){
  const t=copy[locale==='es'?'es':'en'];
  const available=presets.filter(p=>p.key!=='owner'&&p.isBuiltin&&p.grantRevision>0&&
    p.configuredGrants.some(g=>g.capability==='newsroom.access'&&g.scope==='all'));
  const [data,setData]=useState<StaffInviteDirectory|null>(null);
  const [page,setPage]=useState(0);
  const [loading,setLoading]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState('');
  const [code,setCode]=useState('');
  const [copied,setCopied]=useState(false);
  const [role,setRole]=useState('');
  const [selectedRevision,setSelectedRevision]=useState<number|null>(null);
  const [memberType,setMemberType]=useState<'employee'|'contractor'|'freelancer'>('employee');
  const [email,setEmail]=useState('');
  const [days,setDays]=useState(3);
  const [contract,setContract]=useState(90);
  const [reason,setReason]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [target,setTarget]=useState<{row:StaffInviteRow;action:'replace'|'cancel'}|null>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const selected=available.find(p=>p.key===role&&p.grantRevision===selectedRevision);
  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const res=await fetch(endpoint+'?page='+page,{cache:'no-store'});
      if(!res.ok)throw Error();
      setData(await res.json() as StaffInviteDirectory);
    }catch{setData(null);setError(t.failed);}
    finally{setLoading(false);}
  },[page,t.failed]);
  useEffect(()=>{void refresh();},[refresh]);
  function clearForm(){
    setTarget(null);setEmail('');setRole('');setSelectedRevision(null);
    setMemberType('employee');setReason('');setConfirmed(false);setDays(3);setContract(90);
  }
  function chooseTarget(row:StaffInviteRow,action:'replace'|'cancel'){
    clearForm();setTarget({row,action});setCode('');setCopied(false);setError('');setStatus('');
    formRef.current?.scrollIntoView({block:'nearest'});
  }
  const valid=confirmed&&reason.trim().length>=12&&reason.length<=500&&
    (target?.action==='cancel'||(!!selected&&!!email.trim()&&Number.isInteger(days)&&days>=1&&days<=7&&
      (memberType==='employee'||(Number.isInteger(contract)&&contract>days&&contract<=365))));
  async function submit(e:FormEvent<HTMLFormElement>){
    e.preventDefault();if(!valid||busy)return;
    setBusy(true);setError('');setStatus('');setCode('');setCopied(false);
    try{
      const now=Date.now();
      const payload=target?.action==='cancel'?{action:'cancel',id:target.row.invitationId,reason:reason.trim(),confirmed:true}:
        {action:target?.action==='replace'?'replace':'issue',
          ...(target?.action==='replace'?{replaceId:target.row.invitationId}:{}),
          input:{email:email.trim(),roleKey:selected!.key,expectedPresetRevision:selectedRevision,memberType,
            expiresAt:new Date(now+days*day).toISOString(),membershipExpiresAt:memberType==='employee'?null:new Date(now+contract*day).toISOString(),
            reason:reason.trim(),confirmed:true}};
      const res=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},cache:'no-store',body:JSON.stringify(payload)});
      const result=await res.json() as {ok?:boolean;code?:string;delivery?:string};
      if(!res.ok||!result.ok){setError(res.status===409?t.conflict:res.status===429?t.rate:t.failed);return;}
      if(result.delivery==='manual'&&typeof result.code==='string'){setCode(result.code);setStatus(t.manual);}
      else setStatus(t.success);
      clearForm();await refresh();
    }catch{setError(t.failed);}
    finally{setBusy(false);}
  }
  const stamp=(value:string)=>new Date(value).toLocaleString(locale==='es'?'es-ES':'en-US');
  return <section className="rounded-lg border border-border bg-white p-4 space-y-4" aria-label={t.title}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h2 className="flex items-center gap-2 text-base font-semibold text-deep"><MailPlus className="h-4 w-4 text-primary"/>{t.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t.description}</p></div>
      <button className={button} type="button" disabled={loading||busy} onClick={()=>{setError('');void refresh();}}><RefreshCw className="h-4 w-4"/>{t.refresh}</button>
    </div>
    {error&&<p role="alert" className="text-sm text-breaking">{error}</p>}
    {status&&<p role="status" className="text-sm text-foreground">{status}</p>}
    {code&&<div className="space-y-2 rounded-md border border-border bg-surface-muted p-3">
      <p className="text-sm font-semibold">{t.code}</p><p className="break-all font-mono text-sm" aria-label={t.code}>{code}</p>
      <div className="flex flex-wrap gap-2"><button className={button} type="button" onClick={async()=>{try{await navigator.clipboard.writeText(code);setCopied(true);}catch{setCopied(false);}}}><Copy className="h-4 w-4"/>{copied?t.copied:t.copy}</button>
      <button className={button} type="button" onClick={()=>{setCode('');setCopied(false);}}>{t.hide}</button></div>
      <p className="text-sm">{t.private} <a className="underline" href={'/'+locale+'/staff-invite'}>{'/'+locale+'/staff-invite'}</a></p>
    </div>}
    <form ref={formRef} onSubmit={e=>void submit(e)} className="space-y-3 border-t border-border pt-3">
      {target&&<div className="flex items-start justify-between gap-3 text-sm"><p>{target.action==='replace'?t.replaceHint:t.cancelHint} ({target.row.emailHint})</p><button type="button" className={button} disabled={busy} onClick={clearForm}>{t.stop}</button></div>}
      {target?.action!=='cancel'&&<>
        {!available.length&&<p className="text-sm text-muted-foreground">{t.noPresets}</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">{t.email}<input className={field} type="email" autoComplete="off" maxLength={254} required value={email} disabled={busy} onChange={e=>{setEmail(e.target.value);setConfirmed(false);}}/></label>
          <label className="text-sm font-medium">{t.preset}<select className={field} value={role} disabled={busy} onChange={e=>{const p=available.find(x=>x.key===e.target.value);setRole(e.target.value);setSelectedRevision(p?.grantRevision??null);setMemberType(p?.key==='freelancer'?'freelancer':'employee');setConfirmed(false);}}>
            <option value="">{t.choose}</option>{available.map(p=><option key={p.key} value={p.key}>{locale==='es'?p.nameEs:p.nameEn} · {t.revision} {p.grantRevision}</option>)}</select></label>
          <label className="text-sm font-medium">{t.type}<select className={field} value={memberType} disabled={busy||role==='freelancer'} onChange={e=>{setMemberType(e.target.value as typeof memberType);setConfirmed(false);}}>
            {role==='freelancer'?<option value="freelancer">{t.freelancer}</option>:<><option value="employee">{t.employee}</option><option value="contractor">{t.contractor}</option></>}</select></label>
          <label className="text-sm font-medium">{t.days}<input className={field} type="number" min={1} max={7} step={1} value={days} disabled={busy} onChange={e=>{setDays(Number(e.target.value));setConfirmed(false);}}/></label>
          {memberType!=='employee'&&<label className="text-sm font-medium">{t.contract}<input className={field} type="number" min={days+1} max={365} value={contract} disabled={busy} onChange={e=>{setContract(Number(e.target.value));setConfirmed(false);}}/></label>}
        </div>
      </>}
      <label className="block text-sm font-medium">{t.reason}<textarea className={field} maxLength={500} minLength={12} required value={reason} disabled={busy} onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/></label>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)}/>{t.confirm}</label>
      <button className={button} disabled={!valid||busy} type="submit">{target?.action==='cancel'?t.cancel:target?.action==='replace'?t.replace:t.create}</button>
    </form>
    <div className="border-t border-border pt-3">
      {loading&&!data&&<p role="status" className="text-sm">{t.loading}</p>}
      {data?.items.length===0&&<p className="text-sm text-muted-foreground">{t.noInvites}</p>}
      <ul className="space-y-2">{data?.items.map(row=><li key={row.invitationId} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-border p-3">
        <div className="min-w-0 break-all"><p className="text-sm font-medium">{row.emailHint} · {t[row.status]}</p><p className="text-xs text-muted-foreground">{presets.find(p=>p.key===row.roleKey)?.[locale==='es'?'nameEs':'nameEn']??row.roleKey} · {t.revision} {row.presetRevision} · {t.expires} {stamp(row.expiresAt)}</p></div>
        {['pending','expired','invalidated'].includes(row.status)&&<div className="flex gap-2"><button type="button" disabled={busy} className={button} onClick={()=>chooseTarget(row,'replace')}>{t.replace}</button><button type="button" disabled={busy} className={button} onClick={()=>chooseTarget(row,'cancel')}>{t.cancel}</button></div>}
      </li>)}</ul>
      <div className="mt-3 flex items-center gap-2"><button className={button} type="button" disabled={page===0||busy||loading} onClick={()=>setPage(p=>p-1)}>{t.previous}</button><span className="text-xs">{t.page} {page+1}</span><button className={button} type="button" disabled={!data?.hasMore||busy||loading} onClick={()=>setPage(p=>p+1)}>{t.next}</button></div>
    </div>
  </section>;
}
