'use client';
import {useEffect,useMemo,useState,type FormEvent} from 'react';
import {AlertTriangle,CheckCircle2,LockKeyhole,Save} from 'lucide-react';
import type {Locale} from '@/types';
import type {TeamPreset} from '@/lib/permissions/staff-team-types';
import {
  editablePresetCapabilities,type PresetGrant
} from '@/lib/permissions/staff-preset-input';

const translations={
  en:{
    title:'Edit preset grants',
    immutable:'The Owner role cannot be edited from this matrix.',
    inactive:'Preset changes are unavailable until the approved security rollout.',
    current:'Currently configured',proposed:'Reviewed permission ceiling',
    warning:'Select exactly which permissions to grant. Proposed permissions are not assigned automatically.',
    choose:'Select capabilities',grants:'Selected grants',adds:'Additions',
    removals:'Removals',same:'No permission changes to save.',
    reason:'Audit reason',why:'Explain why these permissions are being changed (12–500 characters).',
    confirm:'I have reviewed the selected permissions and understand that these grants may affect everyone assigned this role.',
    save:'Save versioned preset',saving:'Saving…',saved:'New role preset revision saved and audited.',
    conflict:'Another administrator changed this preset. Refresh before editing again.',
    reload:'Reload from database',revision:'Revision',unsafe:'The configured grants contain an unreviewed permission. Manual security review is required before editing.',
    changed:'Pending change',none:'No changes',noGrant:'No permissions configured',
    currentRole:'Role',scope:'scope',error:'Could not save the permission matrix.',
  },
  es:{
    title:'Editar permisos de la función',
    immutable:'No se puede modificar la función Propietario desde esta matriz.',
    inactive:'La edición no estará disponible hasta la activación de seguridad aprobada.',
    current:'Configurados actualmente',proposed:'Límite de permisos revisado',
    warning:'Seleccione solo los permisos que desea conceder. La propuesta no se asigna automáticamente.',
    choose:'Seleccionar permisos',grants:'Permisos seleccionados',adds:'Agregados',
    removals:'Eliminados',same:'No hay cambios por guardar.',
    reason:'Motivo de auditoría',why:'Explique el motivo (12–500 caracteres).',
    confirm:'He revisado los permisos elegidos y entiendo que pueden afectar a todas las personas con esta función.',
    save:'Guardar versión auditada',saving:'Guardando…',saved:'Versión guardada y auditada.',
    conflict:'Otro administrador cambió esta función. Actualice antes de editar de nuevo.',
    reload:'Actualizar desde la base de datos',revision:'Revisión',unsafe:'Los permisos configurados contienen una capacidad no revisada. Se necesita revisión de seguridad.',
    changed:'Cambio pendiente',none:'Sin cambios',noGrant:'No hay permisos configurados',
    currentRole:'Función',scope:'alcance',error:'No se pudo guardar la matriz de permisos.',
  }
} as const;
const checkbox='h-4 w-4 accent-primary';
const button='inline-flex items-center gap-2 rounded-md border border-border bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50';
const field='w-full rounded-md border border-border bg-white px-3 py-2 text-sm';

function keyOf(item:{capability:string;scope:string}){
  return item.capability+'|'+item.scope;
}

export function RolePresetMatrixEditor({
  preset,locale,canEdit,onSaved
}:{
  preset:TeamPreset;locale:Locale;canEdit:boolean;
  onSaved:()=>Promise<void>;
}){
  const t=translations[locale==='es'?'es':'en'];
  const allowed=useMemo(()=>editablePresetCapabilities(preset.key),[preset.key]);
  const [selected,setSelected]=useState<Set<string>>(new Set());
  const [reason,setReason]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [busy,setBusy]=useState(false);
  const [stale,setStale]=useState(false);
  const [error,setError]=useState<string|null>(null);
  const [saved,setSaved]=useState(false);
  useEffect(()=>{
    setSelected(new Set(preset.configuredGrants.map(keyOf)));
    setReason('');setConfirmed(false);setStale(false);setSaved(false);setError(null);
  },[preset.key,preset.grantRevision,preset.configuredGrants]);

  const baseline=useMemo(()=>new Set(preset.configuredGrants.map(keyOf)),
    [preset.configuredGrants]);
  const allowedKeys=useMemo(()=>new Set(allowed.map(keyOf)),[allowed]);
  const unsafe=preset.configuredGrants.some(grant=>!allowedKeys.has(keyOf(grant)));
  const added=[...selected].filter(k=>!baseline.has(k));
  const removed=[...baseline].filter(k=>!selected.has(k));
  const changed=added.length+removed.length>0;
  const ready=canEdit&&!busy&&!stale&&!unsafe&&changed&&confirmed
    &&reason.trim().length>=12&&reason.length<=500;
  function toggle(grant:PresetGrant,checked:boolean){
    const key=keyOf(grant);
    setSelected(old=>{
      const next=new Set(old);
      if(checked)next.add(key);else next.delete(key);
      return next;
    });
    setSaved(false);setError(null);setConfirmed(false);
  }
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!ready)return;
    setBusy(true);setError(null);setSaved(false);
    try{
      const grants=allowed.filter(grant=>selected.has(keyOf(grant)));
      const response=await fetch('/api/newsroom/team/preset-change',{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          roleKey:preset.key,expectedRevision:preset.grantRevision,
          grants,reason:reason.trim(),confirmed:true
        })
      });
      const result=await response.json() as {ok?:boolean;code?:string;error?:string};
      if(!response.ok||!result.ok){
        if(response.status===409||result.code==='conflict'){
          setStale(true);throw Error(t.conflict);
        }
        throw Error(result.error??t.error);
      }
      setReason('');setConfirmed(false);setSaved(true);
      await onSaved();
    }catch(e){setError(e instanceof Error?e.message:t.error);}
    finally{setBusy(false);}
  }
  if(preset.key==='owner')return <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
    <LockKeyhole className="h-4 w-4"/>{t.immutable}
  </p>;
  return <section className="mt-5 space-y-3 border-t border-border pt-4"
    aria-label={t.title}>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <h3 className="text-sm font-semibold text-deep">{t.title}</h3>
      <span className="text-xs text-muted-foreground">{t.revision} {preset.grantRevision}</span>
    </div>
    <p className="text-xs text-muted-foreground">{t.warning}</p>
    {unsafe&&<p role="alert" className="flex items-start gap-2 text-xs text-red-700">
      <AlertTriangle className="h-4 w-4 shrink-0"/>{t.unsafe}</p>}
    {!canEdit&&<p className="text-xs text-muted-foreground">{t.inactive}</p>}
    <form onSubmit={event=>void submit(event)} className="space-y-3">
      <fieldset disabled={!canEdit||busy||unsafe||stale}>
        <legend className="mb-2 text-sm font-medium text-deep">{t.choose}</legend>
        <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
          {allowed.map(grant=><label key={keyOf(grant)}
            className="flex min-w-0 cursor-pointer items-start gap-2 text-xs">
            <input type="checkbox" className={checkbox} checked={selected.has(keyOf(grant))}
              onChange={e=>toggle(grant,e.target.checked)}/>
            <span className="min-w-0 break-words text-foreground">
              {grant.capability}
              <span className="ml-1 text-muted-foreground">({grant.scope})</span>
            </span>
          </label>)}
        </div>
      </fieldset>
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span>{t.grants}: {selected.size}</span>
        <span>{t.adds}: {added.length}</span>
        <span>{t.removals}: {removed.length}</span>
      </div>
      {!changed&&<p className="text-xs text-muted-foreground">{t.same}</p>}
      {canEdit&&<>
        <label className="block text-sm font-medium text-foreground">{t.reason}
          <textarea rows={3} maxLength={500} className={field+' mt-1'}
            placeholder={t.why} value={reason}
            onChange={e=>{setReason(e.target.value);setConfirmed(false);}}/>
        </label>
        <label className="flex items-start gap-2 text-sm text-foreground">
          <input type="checkbox" className="mt-1" checked={confirmed}
            onChange={e=>setConfirmed(e.target.checked)}/>
          <span>{t.confirm}</span>
        </label>
        <button type="submit" className={button} disabled={!ready}>
          <Save className="h-4 w-4"/>{busy?t.saving:t.save}
        </button>
      </>}
      {stale&&<p role="alert" className="text-sm text-red-700">{t.conflict} {t.reload}</p>}
      {error&&<p role="alert" className="text-sm text-red-700">{error}</p>}
      {saved&&<p role="status" className="flex items-center gap-2 text-sm">
        <CheckCircle2 className="h-4 w-4"/>{t.saved}</p>}
    </form>
  </section>;
}
