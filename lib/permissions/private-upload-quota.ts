/** Conservative reservations, not actual disk usage. Never release a slot
 * on uncertain upload or orphan cleanup without a reviewed retention flow. */
export const PRIVATE_UPLOAD_SLOTS=25;
export const PRIVATE_UPLOAD_MAX_FILE_BYTES=10*1024*1024;
export type PrivateUploadQuota={usedSlots:number;maxSlots:number;remainingSlots:number;maxFileBytes:number;maxReservedBytes:number};
export function parsePrivateUploadQuota(raw:unknown):PrivateUploadQuota{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid upload allowance');
 const q=raw as PrivateUploadQuota;
 if(!Number.isInteger(q.usedSlots)||q.usedSlots<0||q.usedSlots>PRIVATE_UPLOAD_SLOTS||
 q.maxSlots!==PRIVATE_UPLOAD_SLOTS||q.remainingSlots!==q.maxSlots-q.usedSlots||
 q.maxFileBytes!==PRIVATE_UPLOAD_MAX_FILE_BYTES||q.maxReservedBytes!==q.maxSlots*q.maxFileBytes)throw Error('Invalid upload allowance');
 return {usedSlots:q.usedSlots,maxSlots:q.maxSlots,remainingSlots:q.remainingSlots,maxFileBytes:q.maxFileBytes,maxReservedBytes:q.maxReservedBytes};
}
export function validPrivateReservation(path:unknown,userId:string,extension:string):path is string{
 if(typeof path!=='string'||!['jpg','png','webp','gif','avif'].includes(extension))return false;
 const parts=path.split('/');
 return parts.length===3&&parts[0]==='drafts'&&parts[1]===userId&&
 parts[2].endsWith('.'+extension)&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(parts[2].slice(0,-extension.length-1));
}
