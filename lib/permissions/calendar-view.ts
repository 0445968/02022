/** Civil-month display in explicitly supported time zones. No browser/server local time. */
export const CALENDAR_ZONES=['America/Bogota','UTC','America/Chicago'] as const;
export type CalendarZone=typeof CALENDAR_ZONES[number];
export function calendarZone(v:unknown):v is CalendarZone{return CALENDAR_ZONES.some(z=>z===v);}
export function calendarMonth(v:unknown):v is string{return typeof v==='string'&&/^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])$/.test(v);}
export function localDay(instant:string|Date,zone:CalendarZone){
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 const get=(k:string)=>parts.find(p=>p.type===k)?.value??'';
 return get('year')+'-'+get('month')+'-'+get('day');
}
function midnight(day:string,zone:CalendarZone){
 const target=Date.parse(day+'T00:00:00Z');
 let instant=target;
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 for(let i=0;i<4;i++){
  const parts=fmt.formatToParts(new Date(instant)),get=(k:string)=>parts.find(p=>p.type===k)?.value??'';
  const displayed=Date.parse(get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute')+':'+get('second')+'Z');
  const delta=target-displayed;if(delta===0)return new Date(instant).toISOString();instant+=delta;
 }
 throw Error('Unsupported midnight');
}
export function shiftMonth(month:string,delta:number){
 if(!calendarMonth(month)||!Number.isInteger(delta))throw Error('Invalid month');
 const [y,m]=month.split('-').map(Number);
 return new Date(Date.UTC(y,m-1+delta,1)).toISOString().slice(0,7);
}
export function monthRange(month:string,zone:CalendarZone){
 if(!calendarMonth(month)||!calendarZone(zone))throw Error('Invalid calendar month');
 return {start:midnight(month+'-01',zone),end:midnight(shiftMonth(month,1)+'-01',zone)};
}
export function monthCells(month:string):(string|null)[]{
 if(!calendarMonth(month))throw Error('Invalid month');
 const [y,m]=month.split('-').map(Number),first=new Date(Date.UTC(y,m-1,1)),count=new Date(Date.UTC(y,m,0)).getUTCDate();
 const cells:(string|null)[]=Array((first.getUTCDay()+6)%7).fill(null);
 for(let d=1;d<=count;d++)cells.push(month+'-'+String(d).padStart(2,'0'));
 while(cells.length%7)cells.push(null);
 return cells;
}

/** Return exact UTC instants for a civil minute in one of the supported zones.
 * A gap has zero candidates; a repeated minute has two. Sample adjacent
 * offsets around the date, then verify the exact civil round-trip with Intl.
 * Supported scheduling dates are 2000–2100; these three zones have no
 * sub-minute offsets or multiple transitions inside the sampling window. */
export function schedulingInstants(civil:string,zone:CalendarZone):string[]{
 if(!calendarZone(zone)||! /^(20[0-9]{2}|2100)-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]$/.test(civil))return [];
 const target=Date.parse(civil+':00Z');
 if(!Number.isFinite(target)||new Date(target).toISOString().slice(0,16)!==civil)return [];
 const fmt=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const civilAt=(instant:number)=>{
  const parts=fmt.formatToParts(new Date(instant)),get=(k:string)=>parts.find(p=>p.type===k)?.value??'';
  return get('year')+'-'+get('month')+'-'+get('day')+'T'+get('hour')+':'+get('minute')+':'+get('second');
 };
 const offsets=new Set([-36,0,36].map(hours=>{
  const sample=target+hours*3600000;
  return Date.parse(civilAt(sample)+'Z')-sample;
 }));
 return [...new Set([...offsets].map(offset=>target-offset).filter(instant=>civilAt(instant)===civil+':00'))].sort((x,y)=>x-y).map(instant=>new Date(instant).toISOString());
}
