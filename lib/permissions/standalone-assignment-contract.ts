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
