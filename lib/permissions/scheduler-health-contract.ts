import {isDraftTimestamp} from './assigned-draft-contract';
export type SchedulerHealth={state:'paused'|'awaiting_first_run'|'heartbeat_stale'|'recent_run';lastRunAt:string|null;asOf:string};
export function parseSchedulerHealth(raw:unknown):SchedulerHealth{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid scheduler health');
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).length!==3||!isDraftTimestamp(x.asOf))throw Error('Invalid scheduler health');
 if(x.state==='paused'||x.state==='awaiting_first_run'){
  if(x.lastRunAt!==null)throw Error('Unexpected heartbeat');
 }else if(x.state==='heartbeat_stale'||x.state==='recent_run'){
  if(!isDraftTimestamp(x.lastRunAt))throw Error('Invalid heartbeat');
 }else throw Error('Invalid scheduler state');
 return x as SchedulerHealth;
}
