export const PLACEMENT_KINDS=[['homepage','Homepage','Portada'],['latest','Latest news','Últimas noticias'],['san-andres','San Andrés','San Andrés'],['old-providence','Old Providence','Providencia'],['saint-catalina','Saint Catalina','Santa Catalina'],['category','Category','Categoría'],['article','Article','Artículo']] as const;
export type PlacementKind=typeof PLACEMENT_KINDS[number][0];
export type PollPlacement={kind:PlacementKind;target:string;startsAt:string|null;endsAt:string|null};
export type PlacementState={pollId:string;revision:number;draft:PollPlacement[];published:PollPlacement[];hasRestrictedTargets:boolean;canEdit:boolean;canPublish:boolean;history:{revision:number;action:'save'|'publish'|'revert';at:string;reason:string}[]};
export type PlacementCommand={action:'save'|'publish'|'revert';expectedRevision:number;copy:PollPlacement[]|null;reason:string};
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const obj=(v:unknown)=>{if(!v||typeof v!=='object'||Array.isArray(v))throw Error('Invalid placement');return v as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const rev=(v:unknown):v is number=>typeof v==='number'&&Number.isInteger(v)&&v>=0&&v<2147483647;
const date=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(v)&&Number.isFinite(Date.parse(v));
export function validPlacementTarget(kind:unknown,target:unknown):boolean{return typeof target==='string'&&PLACEMENT_KINDS.some(([k])=>k===kind)&&(kind==='article'?uuid.test(target):kind==='category'?/^[a-z0-9][a-z0-9-]{0,119}$/.test(target):target==='');}
export function parsePlacements(v:unknown):PollPlacement[]{
 if(!Array.isArray(v)||v.length>20)throw Error('Invalid placements');const seen=new Set<string>();
 for(const item of v){const x=obj(item);if(!exact(x,['kind','target','startsAt','endsAt'])||!validPlacementTarget(x.kind,x.target)||(x.startsAt!==null&&!date(x.startsAt))||(x.endsAt!==null&&!date(x.endsAt))||(typeof x.startsAt==='string'&&typeof x.endsAt==='string'&&Date.parse(x.endsAt)<=Date.parse(x.startsAt)))throw Error('Invalid placement');const k=x.kind+':'+x.target;if(seen.has(k))throw Error('Duplicate placement');seen.add(k);}
 return v as PollPlacement[];
}
export function parsePlacementCommand(raw:unknown):PlacementCommand{
 const x=obj(raw);if(!exact(x,['action','expectedRevision','copy','reason'])||!['save','publish','revert'].includes(String(x.action))||!rev(x.expectedRevision)||typeof x.reason!=='string'||x.reason.trim().length<12||x.reason.length>500||/[\u0000-\u001f\u007f]/.test(x.reason))throw Error('Invalid placement command');
 if(x.action==='save')parsePlacements(x.copy);else if(x.copy!==null)throw Error('Unexpected copy');return x as unknown as PlacementCommand;
}
export function parsePlacementState(raw:unknown,id:string):PlacementState{
 const x=obj(raw);if(!exact(x,['pollId','revision','draft','published','hasRestrictedTargets','canEdit','canPublish','history'])||x.pollId!==id||!uuid.test(id)||!rev(x.revision)||typeof x.hasRestrictedTargets!=='boolean'||typeof x.canEdit!=='boolean'||typeof x.canPublish!=='boolean'||!Array.isArray(x.history)||x.history.length>20)throw Error('Invalid placement state');parsePlacements(x.draft);parsePlacements(x.published);for(const item of x.history){const h=obj(item);if(!exact(h,['revision','action','at','reason'])||!rev(h.revision)||!['save','publish','revert'].includes(String(h.action))||!date(h.at)||typeof h.reason!=='string'||h.reason.length>500)throw Error('Invalid history');}return x as unknown as PlacementState;
}
export type PlacementOptions={items:{target:string;label:string}[];hasMore:boolean};
export function parsePlacementOptions(raw:unknown,kind:'article'|'category'):PlacementOptions{
 const x=obj(raw);if(!exact(x,['items','hasMore'])||typeof x.hasMore!=='boolean'||!Array.isArray(x.items)||x.items.length>25)throw Error('Invalid placement options');for(const i of x.items){const v=obj(i);if(!exact(v,['target','label'])||!validPlacementTarget(kind,v.target)||typeof v.label!=='string'||!v.label.trim()||v.label.length>1000)throw Error('Invalid option');}return x as unknown as PlacementOptions;
}
