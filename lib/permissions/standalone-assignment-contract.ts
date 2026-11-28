// CT16 R2b: standalone task contract only. This does not grant story-level access.
// Database authorization, locking, actor derivation and audit remain mandatory.
export const ASSIGNMENT_ACTIVITIES=[
  [
    "interview",
    "Interview",
    "Entrevista"
  ],
  [
    "research",
    "Research",
    "Investigación"
  ],
  [
    "observe",
    "Observe",
    "Observación"
  ],
  [
    "report",
    "Report",
    "Reportaje"
  ],
  [
    "public_records_request",
    "Public records request",
    "Solicitud de registros públicos"
  ],
  [
    "fact_checking",
    "Fact-checking / Verification",
    "Verificación de hechos"
  ],
  [
    "other",
    "Other",
    "Otro"
  ],
  [
    "source_outreach",
    "Source outreach",
    "Contacto con fuentes"
  ],
  [
    "transcription",
    "Transcription",
    "Transcripción"
  ],
  [
    "photo_video",
    "Photo / Video",
    "Foto / Video"
  ],
  [
    "data_analysis",
    "Data analysis",
    "Análisis de datos"
  ],
  [
    "translation",
    "Translation",
    "Traducción"
  ],
  [
    "copy_edit",
    "Copy edit",
    "Corrección de texto"
  ],
  [
    "follow_up",
    "Follow-up",
    "Seguimiento"
  ],
  [
    "field_reporting",
    "Field reporting",
    "Reportaje de campo"
  ],
  [
    "document_review",
    "Document review",
    "Revisión de documentos"
  ]
] as const;
export const ASSIGNMENT_COVERAGE=[
  [
    "profile_feature",
    "Profile / Feature",
    "Perfil / Reportaje"
  ],
  [
    "meeting_event",
    "Meeting / Event",
    "Reunión / Evento"
  ],
  [
    "breaking",
    "Breaking",
    "Última hora"
  ],
  [
    "investigative",
    "Investigative",
    "Investigación"
  ],
  [
    "community",
    "Community",
    "Comunidad"
  ],
  [
    "government_civic",
    "Government / Civic",
    "Gobierno / Asuntos cívicos"
  ],
  [
    "culture",
    "Culture",
    "Cultura"
  ],
  [
    "sports",
    "Sports",
    "Deportes"
  ],
  [
    "environment",
    "Environment",
    "Medio ambiente"
  ],
  [
    "education",
    "Education",
    "Educación"
  ],
  [
    "health",
    "Health",
    "Salud"
  ],
  [
    "business",
    "Business",
    "Negocios"
  ],
  [
    "courts_public_safety",
    "Courts / Public safety",
    "Tribunales / Seguridad pública"
  ],
  [
    "service_explainer",
    "Service / Explainer",
    "Servicio / Explicativo"
  ],
  [
    "opinion",
    "Opinion",
    "Opinión"
  ],
  [
    "data",
    "Data",
    "Datos"
  ],
  [
    "other",
    "Other",
    "Otro"
  ]
] as const;
export const ASSIGNMENT_WORK_STATUSES=[
  [
    "assigned",
    "Assigned",
    "Asignada"
  ],
  [
    "in_progress",
    "In progress",
    "En curso"
  ],
  [
    "blocked",
    "Blocked",
    "Bloqueada"
  ],
  [
    "completed",
    "Completed",
    "Completada"
  ],
  [
    "cancelled",
    "Cancelled",
    "Cancelada"
  ]
] as const;
export const ASSIGNMENT_PRIORITIES=[
  [
    "low",
    "Low",
    "Baja"
  ],
  [
    "normal",
    "Normal",
    "Normal"
  ],
  [
    "high",
    "High",
    "Alta"
  ],
  [
    "urgent",
    "Urgent",
    "Urgente"
  ]
] as const;
export type AssignmentActivity=typeof ASSIGNMENT_ACTIVITIES[number][0];
export type AssignmentCoverage=typeof ASSIGNMENT_COVERAGE[number][0];
export type AssignmentWorkStatus=typeof ASSIGNMENT_WORK_STATUSES[number][0];
export type AssignmentPriority=typeof ASSIGNMENT_PRIORITIES[number][0];
export type AssignmentDetails={title:string;activity:AssignmentActivity;coverage:AssignmentCoverage|null;storyId:string|null;assigneeIds:string[];priority:AssignmentPriority;dueAt:string|null;notes:string};
type MutationBase={requestId:string;expectedRevision:number;reason:string};
export type StandaloneAssignmentCommand =
 | (MutationBase&{action:'create';assignmentId:null;details:AssignmentDetails})
 | (MutationBase&{action:'edit';assignmentId:string;details:AssignmentDetails})
 | (MutationBase&{action:'status';assignmentId:string;status:AssignmentWorkStatus});
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid=(v:unknown):v is string=>typeof v==='string'&&uuid.test(v);
const timestamp=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
function isDate(v:unknown):v is string{return typeof v==='string'&&timestamp.test(v)&&Number.isFinite(Date.parse(v));}
function record(v:unknown):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid assignment object');return v as Record<string,unknown>;}
function exact(r:Record<string,unknown>,keys:string[]){if(Object.keys(r).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(r,k)))throw Error('Unexpected assignment fields');}
function allowed<T extends readonly (readonly [string,string,string])[]>(catalog:T,v:unknown):v is T[number][0]{return typeof v==='string'&&catalog.some(row=>row[0]===v);}
function plain(v:unknown,min:number,max:number,multiline=false):string{
 if(typeof v!=='string')throw Error('Invalid text');
 const trimmed=v.trim();
 if(trimmed.length<min||trimmed.length>max||(multiline?/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/:/[\u0000-\u001f\u007f]/).test(trimmed))throw Error('Invalid text');
 return trimmed;
}
export function validateAssignmentDetails(raw:unknown):AssignmentDetails{
 const r=record(raw);exact(r,['title','activity','coverage','storyId','assigneeIds','priority','dueAt','notes']);
 if(!allowed(ASSIGNMENT_ACTIVITIES,r.activity)||(r.coverage!==null&&!allowed(ASSIGNMENT_COVERAGE,r.coverage))||(r.storyId!==null&&!isUuid(r.storyId))
 ||!allowed(ASSIGNMENT_PRIORITIES,r.priority)||(r.dueAt!==null&&!isDate(r.dueAt))
 ||!Array.isArray(r.assigneeIds)||r.assigneeIds.length<1||r.assigneeIds.length>25||!r.assigneeIds.every(isUuid))throw Error('Invalid assignment details');
 const ids=r.assigneeIds.map(id=>id.toLowerCase());
 if(new Set(ids).size!==ids.length)throw Error('Duplicate assignee');
 return {title:plain(r.title,1,240),activity:r.activity,coverage:r.coverage,storyId:r.storyId===null?null:r.storyId.toLowerCase(),assigneeIds:ids.sort(),priority:r.priority,dueAt:r.dueAt===null?null:new Date(r.dueAt).toISOString(),notes:plain(r.notes,0,10000,true)};
}
export function validateStandaloneAssignmentCommand(raw:unknown):StandaloneAssignmentCommand{
 const r=record(raw);
 if(r.action!=='create'&&r.action!=='edit'&&r.action!=='status')throw Error('Invalid assignment action');
 exact(r,['action','assignmentId','expectedRevision','requestId','reason',r.action==='status'?'status':'details']);
 if(!isUuid(r.requestId)||typeof r.expectedRevision!=='number'||!Number.isSafeInteger(r.expectedRevision)||r.expectedRevision<0||r.expectedRevision>2147483646)throw Error('Invalid assignment token');
 const base={requestId:r.requestId.toLowerCase(),expectedRevision:r.expectedRevision,reason:plain(r.reason,12,500)};
 if(r.action==='create'){
  if(r.assignmentId!==null||r.expectedRevision!==0)throw Error('Invalid creation token');
  return {...base,action:'create',assignmentId:null,details:validateAssignmentDetails(r.details)};
 }
 if(!isUuid(r.assignmentId)||r.expectedRevision===0)throw Error('Invalid assignment revision');
 const assignmentId=r.assignmentId.toLowerCase();
 if(r.action==='edit')return {...base,action:'edit',assignmentId,details:validateAssignmentDetails(r.details)};
 if(!allowed(ASSIGNMENT_WORK_STATUSES,r.status))throw Error('Invalid assignment status');
 return {...base,action:'status',assignmentId,status:r.status};
}
// Lifecycle helper is only a domain check: database must recheck scoped capability,
// current assignment/member state and optimistic revision in the same transaction.
export function assignmentTransitionAllowed(from:AssignmentWorkStatus,to:AssignmentWorkStatus,manager:boolean):boolean{
 if(from===to)return false;
 if(manager){if(from==='cancelled'||from==='completed')return to==='assigned';return to==='cancelled'||to==='completed'||to==='assigned'||to==='in_progress'||to==='blocked';}
 if(from==='completed'||from==='cancelled'||to==='cancelled'||to==='assigned')return false;
 return to==='in_progress'||to==='blocked'||to==='completed';
}

export type WorkMember={id:string;name:string};
export type WorkAssignmentRow={id:string;title:string;activity:AssignmentActivity;coverage:AssignmentCoverage|null;storyId:string|null;storyHeadline:string|null;priority:AssignmentPriority;status:AssignmentWorkStatus;dueAt:string|null;notes:string;revision:number;updatedAt:string;assignees:WorkMember[];canEdit:boolean;canUpdateStatus:boolean};
export type WorkAssignmentHistory={id:string;at:string;action:'create'|'edit'|'status';revision:number;reason:string;actor:string};
export type WorkAssignmentPage={mode:'team'|'personal';canManage:boolean;canViewTeam:boolean;items:WorkAssignmentRow[];hasMore:boolean;candidates:WorkMember[];history:WorkAssignmentHistory[]};
export function parseWorkAssignmentPage(raw:unknown,mode:'team'|'personal'):WorkAssignmentPage{
 const r=record(raw);
 const bool=(v:unknown)=>typeof v==='boolean';
 const revision=(v:unknown)=>typeof v==='number'&&Number.isSafeInteger(v)&&v>0;
 const member=(v:unknown)=>{const m=record(v);return isUuid(m.id)&&typeof m.name==='string'&&m.name.length<=160;};
 if(r.mode!==mode||!bool(r.canManage)||!bool(r.canViewTeam)||!bool(r.hasMore)||!Array.isArray(r.items)||r.items.length>25||!Array.isArray(r.candidates)||r.candidates.length>100||!r.candidates.every(member)||!Array.isArray(r.history)||r.history.length>25)throw Error('Invalid assignments page');
 for(const item of r.items){const a=record(item);
  if(!isUuid(a.id)||typeof a.title!=='string'||!allowed(ASSIGNMENT_ACTIVITIES,a.activity)||(a.coverage!==null&&!allowed(ASSIGNMENT_COVERAGE,a.coverage))||(a.storyId!==null&&!isUuid(a.storyId))||(a.storyHeadline!==null&&typeof a.storyHeadline!=='string')||(a.storyId===null&&a.storyHeadline!==null)||!allowed(ASSIGNMENT_PRIORITIES,a.priority)||!allowed(ASSIGNMENT_WORK_STATUSES,a.status)||(a.dueAt!==null&&!isDate(a.dueAt))||typeof a.notes!=='string'||!revision(a.revision)||!isDate(a.updatedAt)||!Array.isArray(a.assignees)||a.assignees.length<1||a.assignees.length>25||!a.assignees.every(member)||!bool(a.canEdit)||!bool(a.canUpdateStatus))throw Error('Invalid assignment row');
 }
 for(const item of r.history){const h=record(item);if(!isUuid(h.id)||!isDate(h.at)||!['create','edit','status'].includes(String(h.action))||!revision(h.revision)||typeof h.reason!=='string'||typeof h.actor!=='string')throw Error('Invalid assignment history');}
 return r as unknown as WorkAssignmentPage;
}

export type WorkLookup={kind:'article'|'member';items:WorkMember[];hasMore:boolean};
export type WorkOverviewRow={id:string;title:string;activity:AssignmentActivity;priority:AssignmentPriority;status:'assigned'|'in_progress'|'blocked';dueAt:string};
export type WorkOverview={mode:'team'|'personal';asOf:string;counts:{total:number;active:number;blocked:number;completed:number;overdue:number;dueSoon:number};items:WorkOverviewRow[];hasMore:boolean};
export function parseWorkLookup(raw:unknown,kind:'article'|'member'):WorkLookup{
 const r=record(raw);if(r.kind!==kind||typeof r.hasMore!=='boolean'||!Array.isArray(r.items)||r.items.length>25)throw Error('Invalid work lookup');
 for(const item of r.items){const x=record(item);if(!isUuid(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>1000)throw Error('Invalid work option');}
 return r as unknown as WorkLookup;
}
export function parseWorkOverview(raw:unknown,mode:'team'|'personal'):WorkOverview{
 const r=record(raw),c=record(r.counts);
 if(r.mode!==mode||!isDate(r.asOf)||typeof r.hasMore!=='boolean'||!Array.isArray(r.items)||r.items.length>50)throw Error('Invalid work overview');
 for(const k of ['total','active','blocked','completed','overdue','dueSoon'])if(typeof c[k]!=='number'||!Number.isSafeInteger(c[k])||Number(c[k])<0)throw Error('Invalid work count');
 if(Number(c.active)+Number(c.completed)>Number(c.total)||Number(c.blocked)>Number(c.active)||Number(c.overdue)+Number(c.dueSoon)>Number(c.active))throw Error('Inconsistent work count');
 for(const item of r.items){const x=record(item);if(!isUuid(x.id)||typeof x.title!=='string'||!allowed(ASSIGNMENT_ACTIVITIES,x.activity)||!allowed(ASSIGNMENT_PRIORITIES,x.priority)||!['assigned','in_progress','blocked'].includes(String(x.status))||!isDate(x.dueAt))throw Error('Invalid work deadline');}
 return r as unknown as WorkOverview;
}
