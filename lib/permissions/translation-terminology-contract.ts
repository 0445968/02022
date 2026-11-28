export type TerminologyEntry={term:string;preferred:string;kind:'preferred'|'protected';note:string};
export type TerminologyState={revision:number;entries:TerminologyEntry[]};
export type TerminologyCommand={expectedRevision:number;entries:TerminologyEntry[];reason:string};
const record=(x:unknown):Record<string,unknown>=>{if(!x||typeof x!=='object'||Array.isArray(x))throw Error('Invalid terminology');return x as Record<string,unknown>;};
const exact=(x:Record<string,unknown>,keys:string[])=>Object.keys(x).length===keys.length&&keys.every(k=>Object.hasOwn(x,k));
const revision=(x:unknown):x is number=>typeof x==='number'&&Number.isInteger(x)&&x>=0&&x<2147483647;
const text=(x:unknown,min:number,max:number):x is string=>typeof x==='string'&&x.trim().length>=min&&x.length<=max&&!/[\u0000-\u001f\u007f]/.test(x);
export function parseTerminologyEntries(x:unknown):TerminologyEntry[]{
 if(!Array.isArray(x)||x.length>500||new TextEncoder().encode(JSON.stringify(x)).length>100000)throw Error('Glossary exceeds limit');
 const seen=new Set<string>();return x.map(raw=>{const e=record(raw);if(!exact(e,['term','preferred','kind','note'])||!text(e.term,1,160)||!text(e.preferred,1,160)||!text(e.note,0,500)||(e.kind!=='preferred'&&e.kind!=='protected')||(e.kind==='protected'&&e.term!==e.preferred))throw Error('Invalid glossary entry');const key=e.term.trim().toLowerCase();if(seen.has(key))throw Error('Duplicate glossary entry');seen.add(key);return {term:e.term,preferred:e.preferred,kind:e.kind,note:e.note};});
}
export function parseTerminologyState(raw:unknown):TerminologyState{const s=record(raw);if(!exact(s,['revision','entries'])||!revision(s.revision))throw Error('Invalid glossary state');return {revision:s.revision,entries:parseTerminologyEntries(s.entries)};}
export function parseTerminologyCommand(raw:unknown):TerminologyCommand{const s=record(raw);if(!exact(s,['expectedRevision','entries','reason'])||!revision(s.expectedRevision)||!text(s.reason,12,500))throw Error('Invalid glossary command');return {expectedRevision:s.expectedRevision,entries:parseTerminologyEntries(s.entries),reason:s.reason.trim()};}
