export type BylineRequest={membership_id:string;display_name:string;member_type:string;member_status:string;
 profile_revision:number;review_revision:number;review_status:'pending'|'approved'|'rejected'|'unlinked'|'withdrawn'|'conflict';
 editorial_profile_id:string|null;byline_name:string|null;requested:boolean;eligible:boolean};
export type BylineCandidate={id:string;byline_name:string;slug:string;byline_status:string};
export type BylinePage<T>={items:T[];hasMore:boolean;page:number};
