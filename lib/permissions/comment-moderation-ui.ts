import type {ModerationAction,ModerationItem,ModerationFilter} from './comment-moderation-contract';
export function availableCommentActions(item:Pick<ModerationItem,'canModerate'|'status'>):ModerationAction[]{
 if(!item.canModerate||item.status==='deleted')return [];
 if(item.status==='pending')return ['approve','hide','remove'];
 if(item.status==='published')return ['hide','remove'];
 return item.status==='hidden'?['restore','remove']:[];
}
export function commentQueueHref(status:ModerationFilter,storyId:string|null,query:string,page=0,view?:'article'|'comments'){
 const params=new URLSearchParams({status,page:String(page)});
 if(storyId)params.set('storyId',storyId);
 if(query)params.set('q',query);
 if(view)params.set('view',view);
 return '/newsroom/comments?'+params.toString();
}
