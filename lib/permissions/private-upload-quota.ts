/** Conservative reservations, not actual disk usage. Never release a slot
 * on uncertain upload or orphan cleanup without a reviewed retention flow. */
export const PRIVATE_UPLOAD_SLOTS=25;
export const PRIVATE_UPLOAD_MAX_FILE_BYTES=10*1024*1024;
export type PrivateUploadQuota={usedSlots:number;maxSlots:number|null;remainingSlots:number|null;maxFileBytes:number;maxReservedBytes:number|null};
export function parsePrivateUploadQuota(raw:unknown):PrivateUploadQuota{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid upload allowance');
 const q=raw as PrivateUploadQuota;
 if(!Number.isSafeInteger(q.usedSlots)||q.usedSlots<0||q.maxFileBytes!==PRIVATE_UPLOAD_MAX_FILE_BYTES||
 !(q.maxSlots===null&&q.remainingSlots===null&&q.maxReservedBytes===null||q.maxSlots===PRIVATE_UPLOAD_SLOTS&&q.remainingSlots===Math.max(0,PRIVATE_UPLOAD_SLOTS-q.usedSlots)&&q.maxReservedBytes===PRIVATE_UPLOAD_SLOTS*q.maxFileBytes))throw Error('Invalid upload allowance');
 return {usedSlots:q.usedSlots,maxSlots:q.maxSlots,remainingSlots:q.remainingSlots,maxFileBytes:q.maxFileBytes,maxReservedBytes:q.maxReservedBytes};
}
export function validPrivateReservation(path:unknown,userId:string,extension:string):path is string{
 if(typeof path!=='string'||!['jpg','png','webp','gif','avif'].includes(extension))return false;
 const parts=path.split('/');
 return parts.length===3&&parts[0]==='drafts'&&parts[1]===userId&&
 parts[2].endsWith('.'+extension)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(parts[2].slice(0,-extension.length-1));
}
