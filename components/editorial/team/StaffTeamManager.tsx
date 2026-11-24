'use client';

import {useCallback,useEffect,useMemo,useState,type FormEvent} from 'react';
import {CheckCircle2,ChevronRight,RefreshCw,Search,ShieldCheck,Users,AlertTriangle} from 'lucide-react';
import type {Locale} from '@/types';
import {STAFF_ROLE_KEYS,type StaffRoleKey,type StaffRoleOperation} from '@/lib/permissions/staff-admin-input';
import {proposedRoleGrants} from '@/lib/permissions/role-presets';
import type {TeamDirectory,TeamMember,TeamStatus} from '@/lib/permissions/staff-team-types';
import {StaffPermissionInspector} from '@/components/editorial/team/StaffPermissionInspector';
import {StaffInvitationManager} from '@/components/editorial/team/StaffInvitationManager';
import {RolePresetMatrixEditor} from '@/components/editorial/team/RolePresetMatrixEditor';

const copy={
  en:{
    title:'Team & access',desc:'Current staff memberships, roles and audited access changes.',
    directory:'Team members',search:'Search members',filter:'All statuses',all:'All',
    active:'Active',invited:'Invited',suspended:'Suspended',revoked:'Revoked',
    loading:'Loading staff access…',refresh:'Refresh',empty:'No staff memberships yet.',
    select:'Select a member to inspect their roles.',role:'Assigned roles',
    noRoles:'No roles assigned',self:'Your account',expires:'Expires',member:'Member',
    manage:'Change access',mutationsOff:'Role changes remain disabled until administrator activation.',
    reason:'Audit reason',reasonHint:'Explain the business reason (12–500 characters).',
    confirm:'I understand this change will affect this person’s access and be audited.',
    apply:'Apply change',working:'Saving…',success:'Access change recorded. Directory refreshed.',
    roleKey:'Role preset',operation:'Operation',grant_role:'Grant role',
    revoke_role:'Revoke role',suspend:'Suspend membership',reactivate:'Reactivate membership',
    revoke_membership:'Revoke membership',noSelf:'Self-management is blocked.',
    roles:'Role permissions',configured:'Configured in database',proposed:'Proposed baseline (not activated)',
    missing:'No configured grants yet. Proposed permissions are not effective access.',
    scope:'Scope',capability:'Capability',audit:'Recent access audit',noAudit:'No audit entries.',
    limited:'Showing 25 members per page. Search applies to this page.',page:'Page',previous:'Previous',next:'Next',
    auditAll:'All changes',auditSelected:'Selected member',activePage:'Active on this page',
    caution:'Changes are accepted only after the server verifies a current owner and the database records an audit.',
    review:'Role definitions and proposed grants cannot be changed in this phase.',
    readOnly:'Read-only',error:'Unable to load staff permissions',noResult:'No matching members.',
    permissionNote:'Role assignments do not imply access until the corresponding database grants are configured.',
  },
  es:{
    title:'Equipo y accesos',desc:'Membresías, funciones y cambios de acceso auditados.',
    directory:'Integrantes',search:'Buscar integrantes',filter:'Todos los estados',all:'Todos',
    active:'Activo',invited:'Invitado',suspended:'Suspendido',revoked:'Revocado',
    loading:'Cargando accesos…',refresh:'Actualizar',empty:'Aún no hay integrantes.',
    select:'Seleccione un integrante para ver sus funciones.',role:'Funciones asignadas',
    noRoles:'Sin funciones asignadas',self:'Su cuenta',expires:'Vence',member:'Integrante',
    manage:'Cambiar acceso',mutationsOff:'Los cambios están desactivados hasta la autorización administrativa.',
    reason:'Motivo de auditoría',reasonHint:'Explique el motivo (12–500 caracteres).',
    confirm:'Entiendo que este cambio afectará el acceso y quedará registrado.',
    apply:'Aplicar cambio',working:'Guardando…',success:'Cambio registrado. Directorio actualizado.',
    roleKey:'Función',operation:'Operación',grant_role:'Asignar función',
    revoke_role:'Quitar función',suspend:'Suspender membresía',reactivate:'Reactivar membresía',
    revoke_membership:'Revocar membresía',noSelf:'No puede modificar su propio acceso.',
    roles:'Permisos por función',configured:'Configurados en la base de datos',proposed:'Propuesta (sin activar)',
    missing:'Aún no hay permisos configurados. La propuesta no concede acceso efectivo.',
    scope:'Alcance',capability:'Capacidad',audit:'Auditoría reciente',noAudit:'Sin registros.',
    limited:'Se muestran 25 integrantes por página. La búsqueda se aplica a esta página.',page:'Página',previous:'Anterior',next:'Siguiente',
    auditAll:'Todos los cambios',auditSelected:'Integrante seleccionado',activePage:'Activos en esta página',
    caution:'Solo un propietario verificado puede cambiar accesos; la base de datos audita cada cambio.',
    review:'Las definiciones y propuestas de funciones no pueden editarse en esta fase.',
    readOnly:'Solo lectura',error:'No se pudieron cargar los permisos',noResult:'Sin coincidencias.',
    permissionNote:'Una función no concede acceso hasta que sus permisos se configuren en la base de datos.',
  }
} as const;
const row='rounded-lg border border-border bg-white';
const selectClass='w-full rounded-md border border-border bg-white px-3 py-2 text-sm text-foreground';
const button='inline-flex items-center justify-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm font-medium text-foreground hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-50';
const statusKeys:TeamStatus[]=['active','invited','suspended','revoked'];
const opKeys:StaffRoleOperation[]=['grant_role','revoke_role','suspend','reactivate','revoke_membership'];
function stamp(value:string|null,locale:Locale):string{
  if(!value)return '—';
  const n=Date.parse(value);
  return Number.isFinite(n)?new Intl.DateTimeFormat(locale==='es'?'es-ES':'en-US',{dateStyle:'medium'}).format(n):'—';
}
function isRoleOperation(op:StaffRoleOperation):boolean{
  return op==='grant_role'||op==='revoke_role';
}

export function StaffTeamManager({locale,showInvitations=false}:{locale:Locale;showInvitations?:boolean}){
  const t=copy[locale==='es'?'es':'en'];
  const [data,setData]=useState<TeamDirectory|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState<string|null>(null);
  const [success,setSuccess]=useState<string|null>(null);
  const [search,setSearch]=useState('');
  const [filter,setFilter]=useState<'all'|TeamStatus>('all');
  const [page,setPage]=useState(0);
  const [auditPage,setAuditPage]=useState(0);
  const [auditFilter,setAuditFilter]=useState<'all'|'selected'>('all');
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [rolePreview,setRolePreview]=useState<StaffRoleKey>('editor');
  const [op,setOp]=useState<StaffRoleOperation>('grant_role');
  const [role,setRole]=useState<StaffRoleKey>('editor');
  const [reason,setReason]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [saving,setSaving]=useState(false);

  const refresh=useCallback(async()=>{
    setLoading(true);
    try{
      const query=new URLSearchParams({
        page:String(page),auditPage:String(auditPage)
      });
      if(filter!=='all')query.set('status',filter);
      if(auditFilter==='selected'&&selectedId)query.set('auditMemberId',selectedId);
      const result=await fetch('/api/newsroom/team?'+query.toString(),{cache:'no-store'});
      if(!result.ok)throw new Error(t.error);
      const directory=await result.json() as TeamDirectory;
      setData(directory);setError(null);
    }catch(e){
      setError(e instanceof Error?e.message:t.error);
    }finally{setLoading(false);}
  },[t.error,page,auditPage,filter,auditFilter,selectedId]);
  useEffect(()=>{void refresh();},[refresh]);

  const members=useMemo(()=>data?.members.filter(m=>{
    const normalized=search.trim().toLocaleLowerCase(locale);
    return !normalized||m.name.toLocaleLowerCase(locale).includes(normalized)
        ||m.roles.some(r=>r.roleKey.includes(normalized));
  })??[],[data,search,locale]);
  const current=data?.members.find(m=>m.id===selectedId)??null;
  const selectedRole=data?.presets.find(p=>p.key===rolePreview)??null;
  const allowedActions=opKeys.filter(action=>{
    if(!current)return false;
    if(action==='suspend')return current.status==='active';
    if(action==='reactivate')return current.status==='suspended';
    if(action==='revoke_membership')return current.status!=='revoked';
    if(action==='revoke_role')return current.roles.length>0;
    return current.status!=='revoked';
  });
  const validAction=allowedActions.includes(op);
  const validRole=!isRoleOperation(op)||(op==='grant_role'
    ? !current?.roles.some(r=>r.roleKey===role)
    : !!current?.roles.some(r=>r.roleKey===role));
  const canSubmit=!!current&&!current.isSelf&&data?.mutationsEnabled
    &&validAction&&validRole&&reason.trim().length>=12
    &&reason.length<=500&&confirmed&&!saving;

  function pick(member:TeamMember){
    setSelectedId(member.id);setOp('grant_role');setRole('editor');
    setReason('');setConfirmed(false);setError(null);setSuccess(null);
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!canSubmit||!current)return;
    setSaving(true);setError(null);setSuccess(null);
    try{
      const payload={
        targetMembershipId:current.id,operation:op,reason:reason.trim(),
        ...(isRoleOperation(op)?{roleKey:role}:{roleKey:null})
      };
      const response=await fetch('/api/newsroom/team/role-change',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify(payload)
      });
      const outcome=await response.json() as {ok?:boolean;error?:string};
      if(!response.ok||!outcome.ok)throw new Error(outcome.error??t.error);
      setReason('');setConfirmed(false);setSuccess(t.success);
      await refresh();
    }catch(e){setError(e instanceof Error?e.message:t.error);}
    finally{setSaving(false);}
  }

  return <div className="mx-auto max-w-7xl space-y-6 px-6 py-8">
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
      <div>
        <h1 className="font-headline text-2xl font-bold text-deep">{t.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t.desc}</p>
      </div>
      <button type="button" onClick={()=>void refresh()} className={button} disabled={loading||saving}>
        <RefreshCw className="h-4 w-4"/>{t.refresh}
      </button>
    </header>
    {error&&<p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {success&&<p role="status" className="flex items-center gap-2 text-sm text-foreground">
      <CheckCircle2 className="h-4 w-4"/>{success}</p>}
    {loading&&!data&&<p className="text-sm text-muted-foreground">{t.loading}</p>}
    {data&&<>
      {showInvitations&&<StaffInvitationManager locale={locale} presets={data.presets}/>}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className={row+' p-4'}><p className="text-xs text-muted-foreground">{t.directory}</p>
          <p className="mt-1 text-2xl font-bold text-deep">{data.totalMembers}</p></div>
        <div className={row+' p-4'}><p className="text-xs text-muted-foreground">{t.activePage}</p>
          <p className="mt-1 text-2xl font-bold text-deep">{data.members.filter(m=>m.status==='active').length}</p></div>
        <div className={row+' p-4'}><p className="text-xs text-muted-foreground">{t.roles}</p>
          <p className="mt-1 text-2xl font-bold text-deep">{data.presets.length}</p></div>
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
        <section className={row+' p-4'} aria-label={t.directory}>
          <div className="mb-4 flex items-center gap-2"><Users className="h-4 w-4 text-primary"/>
            <h2 className="text-base font-semibold text-deep">{t.directory}</h2></div>
          <div className="mb-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <label className="relative">
              <span className="sr-only">{t.search}</span>
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
              <input className={selectClass+' pl-9'} value={search} placeholder={t.search}
                onChange={e=>setSearch(e.target.value)}/>
            </label>
            <label>
              <span className="sr-only">{t.filter}</span>
              <select className={selectClass} value={filter}
                onChange={e=>{setFilter(e.target.value as 'all'|TeamStatus);setPage(0);setAuditPage(0);setSelectedId(null);setAuditFilter('all');}}>
                <option value="all">{t.all}</option>
                {statusKeys.map(s=><option key={s} value={s}>{t[s]}</option>)}
              </select>
            </label>
          </div>
          {data.members.length===0&&<p className="text-sm text-muted-foreground">{t.empty}</p>}
          {data.members.length>0&&members.length===0&&<p className="text-sm text-muted-foreground">{t.noResult}</p>}
          <ul className="space-y-2">
            {members.map(member=><li key={member.id}>
              <button type="button" onClick={()=>pick(member)} aria-pressed={current?.id===member.id}
                className={'flex w-full items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors '
                  +(current?.id===member.id?'border-deep bg-surface-muted':'border-border hover:bg-surface-muted')}>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-deep">{member.name}
                    {member.isSelf&&<span className="ml-2 font-normal text-muted-foreground">({t.self})</span>}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {member.roles.length?member.roles.map(r=>r.roleKey.replaceAll('_',' ')).join(' · '):t.noRoles}
                  </p>
                </div>
                <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                  {t[member.status]}<ChevronRight className="h-4 w-4"/>
                </span>
              </button>
            </li>)}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {data.totalMembers>data.pageSize?t.limited:t.directory}
            </p>
            <div className="flex items-center gap-2">
              <button type="button" className={button} disabled={loading||page===0}
                onClick={()=>{setPage(value=>Math.max(0,value-1));setSelectedId(null);setAuditFilter('all');}}>
                {t.previous}
              </button>
              <span className="text-xs text-muted-foreground">{t.page} {page+1}</span>
              <button type="button" className={button} disabled={loading||!data.hasMoreMembers}
                onClick={()=>{setPage(value=>value+1);setSelectedId(null);setAuditFilter('all');}}>
                {t.next}
              </button>
            </div>
          </div>
        </section>
        <section className={row+' p-4'} aria-label={t.manage}>
          {!current?<p className="text-sm text-muted-foreground">{t.select}</p>:<>
            <div className="flex items-start justify-between gap-3 border-b border-border pb-4">
              <div><h2 className="font-headline text-lg font-semibold text-deep">{current.name}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t[current.status]} · {current.memberType}</p></div>
              <ShieldCheck className="h-5 w-5 shrink-0 text-primary"/>
            </div>
            <div className="py-4">
              <h3 className="text-sm font-semibold text-deep">{t.role}</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {current.roles.length===0?<span className="text-sm text-muted-foreground">{t.noRoles}</span>:
                current.roles.map(assignment=><span key={assignment.roleKey}
                  className="rounded-md border border-border bg-surface-muted px-2 py-1 text-xs">
                  {data.presets.find(p=>p.key===assignment.roleKey)?.[locale==='es'?'nameEs':'nameEn']
                    ??assignment.roleKey}
                  {assignment.expiresAt&&<span className="ml-1 text-muted-foreground">
                    · {t.expires} {stamp(assignment.expiresAt,locale)}</span>}
                </span>)}
              </div>
            </div>
            {!data.mutationsEnabled?<p className="flex items-start gap-2 rounded-md bg-surface-muted p-3 text-sm text-muted-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0"/>{t.mutationsOff}
            </p>:current.isSelf?<p className="text-sm text-muted-foreground">{t.noSelf}</p>:
            <form onSubmit={event=>void submit(event)} className="space-y-3 border-t border-border pt-4">
              <h3 className="text-sm font-semibold text-deep">{t.manage}</h3>
              <label className="block text-sm font-medium">{t.operation}
                <select className={selectClass+' mt-1'} value={validAction?op:''}
                  onChange={e=>{setOp(e.target.value as StaffRoleOperation);setConfirmed(false);}}>
                  {!validAction&&<option value="" disabled>{t.operation}</option>}
                  {allowedActions.map(action=><option key={action} value={action}>{t[action]}</option>)}
                </select>
              </label>
              {isRoleOperation(op)&&<label className="block text-sm font-medium">{t.roleKey}
                <select className={selectClass+' mt-1'} value={role}
                  onChange={e=>{setRole(e.target.value as StaffRoleKey);setConfirmed(false);}}>
                  {data.presets.filter(p=>op==='grant_role'
                    ? !current.roles.some(r=>r.roleKey===p.key)
                    : current.roles.some(r=>r.roleKey===p.key))
                    .map(p=><option key={p.key} value={p.key}>{locale==='es'?p.nameEs:p.nameEn}</option>)}
                  {!validRole&&<option value={role}>{role.replaceAll('_',' ')}</option>}
                </select>
              </label>}
              <label className="block text-sm font-medium">{t.reason}
                <textarea className={selectClass+' mt-1'} rows={3} maxLength={500}
                  value={reason} onChange={e=>setReason(e.target.value)}
                  placeholder={t.reasonHint}/>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}
                  className="mt-1"/>
                <span>{t.confirm}</span>
              </label>
              <p className="text-xs text-muted-foreground">{t.caution}</p>
              <button className={button} type="submit" disabled={!canSubmit}>
                <ShieldCheck className="h-4 w-4"/>{saving?t.working:t.apply}
              </button>
            </form>}
            {data.canManageOverrides&&<StaffPermissionInspector key={current.id}
              member={current} locale={locale}
              canWrite={data.overrideMutationsEnabled&&!current.isSelf}
              onSaved={refresh}/>}
          </>}
        </section>
      </div>
      <section className={row+' p-4'}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-semibold text-deep">{t.roles}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{t.review}</p></div>
          <span className="text-xs text-muted-foreground">{data.presetMutationsEnabled?t.manage:t.readOnly}</span>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
          <label className="block text-sm font-medium">{t.roleKey}
            <select value={rolePreview} onChange={e=>setRolePreview(e.target.value as StaffRoleKey)}
              className={selectClass+' mt-1'}>
              {data.presets.map(p=><option key={p.key} value={p.key}>
                {locale==='es'?p.nameEs:p.nameEn}</option>)}
            </select>
          </label>
          <div className="min-w-0 space-y-4">
            <div><h3 className="text-sm font-semibold text-deep">{t.configured}</h3>
              {!selectedRole?.configuredGrants.length?<p className="mt-1 text-sm text-muted-foreground">{t.missing}</p>:
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedRole.configuredGrants.map(g=><span key={g.capability}
                  className="rounded-md border border-border px-2 py-1 text-xs">
                  {g.capability} · {g.scope}</span>)}
              </div>}
            </div>
            <div><h3 className="text-sm font-semibold text-deep">{t.proposed}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{t.permissionNote}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {STAFF_ROLE_KEYS.includes(rolePreview)&&proposedRoleGrants(rolePreview).map(g=>
                  <span key={g.capability} className="rounded-md bg-surface-muted px-2 py-1 text-xs text-muted-foreground">
                    {g.capability} · {g.scope}</span>)}
              </div>
            </div>
          </div>
        </div>
        {selectedRole&&<RolePresetMatrixEditor
          key={selectedRole.key} preset={selectedRole} locale={locale}
          canEdit={data.presetMutationsEnabled && selectedRole.key!=='owner'}
          onSaved={refresh}/>}
      </section>
      {data.canViewAudit&&<section className={row+' p-4'} aria-label={t.audit}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-deep">{t.audit}</h2>
          <label className="text-xs text-muted-foreground">
            <span className="sr-only">{t.audit}</span>
            <select className={selectClass} value={auditFilter} onChange={e=>{
              setAuditFilter(e.target.value as 'all'|'selected');setAuditPage(0);
            }}>
              <option value="all">{t.auditAll}</option>
              <option value="selected" disabled={!selectedId}>{t.auditSelected}</option>
            </select>
          </label>
        </div>
        {data.audit.length===0?<p className="mt-3 text-sm text-muted-foreground">{t.noAudit}</p>:
        <ul className="mt-3 divide-y divide-border">
          {data.audit.map(entry=><li key={entry.id} className="py-3">
            <div className="flex flex-wrap justify-between gap-2 text-sm">
              <span className="font-medium text-deep">{entry.action}</span>
              <span className="text-muted-foreground">{stamp(entry.occurredAt,locale)}</span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{entry.actorName}{entry.reason?' · '+entry.reason:''}</p>
          </li>)}
        </ul>}
        <div className="mt-3 flex justify-end gap-2">
          <button type="button" className={button} disabled={loading||auditPage===0}
            onClick={()=>setAuditPage(value=>Math.max(0,value-1))}>{t.previous}</button>
          <span className="self-center text-xs text-muted-foreground">{t.page} {auditPage+1}</span>
          <button type="button" className={button} disabled={loading||!data.hasMoreAudit}
            onClick={()=>setAuditPage(value=>value+1)}>{t.next}</button>
        </div>
      </section>}
    </>}
  </div>;
}
