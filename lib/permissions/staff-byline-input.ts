export const BYLINE_UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type BylineReviewInput={membershipId:string;profileRevision:number;reviewRevision:number;
  action:'approve'|'reject'|'unlink';bylineId:string|null;reason:string;confirmed:true};
export function validateBylineReview(raw:unknown):BylineReviewInput{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid review');
  const r=raw as Record<string,unknown>;
  const fields=['membershipId','profileRevision','reviewRevision','action','bylineId','reason','confirmed'];
  if(Object.keys(r).length!==fields.length||!fields.every(k=>Object.prototype.hasOwnProperty.call(r,k)))throw Error('Invalid fields');
  const {membershipId,profileRevision,reviewRevision,action,bylineId,reason,confirmed}=r;
  if(typeof membershipId!=='string'||!BYLINE_UUID.test(membershipId)||
    typeof profileRevision!=='number'||!Number.isSafeInteger(profileRevision)||profileRevision<1||profileRevision>2147483647||
    typeof reviewRevision!=='number'||!Number.isSafeInteger(reviewRevision)||reviewRevision<0||reviewRevision>=2147483647||
    (action!=='approve'&&action!=='reject'&&action!=='unlink')||
    (action==='approve'?(typeof bylineId!=='string'||!BYLINE_UUID.test(bylineId)):bylineId!==null)||
    typeof reason!=='string'||reason.trim().length<12||reason.length>500||confirmed!==true)throw Error('Invalid review');
  return {membershipId,profileRevision,reviewRevision,action,bylineId:bylineId as string|null,reason:reason.trim(),confirmed};
}
