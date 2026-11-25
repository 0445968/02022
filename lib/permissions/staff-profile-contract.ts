export type OwnByline={status:'not_requested'|'pending'|'approved'|'rejected'|'unlinked'|'conflict';name:string|null};
type PrivateReview={status:unknown;reviewed_profile_revision:unknown;editorial_profile_id:unknown};
export function ownBylineStatus(requested:boolean,revision:number,review:PrivateReview|null,eligible:boolean,name:unknown):OwnByline{
 if(!review)return {status:requested?'pending':'not_requested',name:null};
 if(review.status==='approved'){
  if(!eligible||typeof name!=='string'||!name.trim()||typeof review.editorial_profile_id!=='string')return {status:'conflict',name:null};
  return {status:'approved',name};
 }
 if(review.status!=='rejected'&&review.status!=='unlinked')throw Error('Invalid private association');
 if(!Number.isInteger(review.reviewed_profile_revision))throw Error('Invalid review revision');
 if(requested&&(review.reviewed_profile_revision as number)<revision)return {status:'pending',name:null};
 return {status:review.status,name:null};
}
export const DASHBOARD_STORY_LIMIT=25;
export type DashboardStory={id:string;headline:string;status:string;updatedAt:string};
export function dashboardStorySummary(items:readonly DashboardStory[]){
 return {total:items.length,drafts:items.filter(i=>i.status==='draft').length,inReview:items.filter(i=>i.status==='in_review').length,published:items.filter(i=>i.status==='published').length};
}
