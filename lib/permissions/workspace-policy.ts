/** CT-05a: pure presentation policy. Inputs come exclusively from fresh server checks.
 * Navigation is not authorization. Existing pages and APIs must recheck capabilities.
 * Complex legacy editors are only offered with their full required capability set
 * until CT-05b/CT-10/CT-11 provide granular controls. */
export const WORKSPACE_CAPABILITIES=[
  'newsroom.access','story.view_all','story.create','story.edit_all','story.assign',
  'story.publish','story.schedule','story.archive_delete','story.submit_review','story.review',
  'revision.view','revision.publish','revision.discard','media.view_all','media.upload',
  'media.edit_all','media.approve','media.delete','byline.manage','homepage.view_editor',
  'homepage.edit','homepage.publish','team.view'
] as const;
export type WorkspaceCapability=typeof WORKSPACE_CAPABILITIES[number];
export type WorkspaceNavKey='dashboard'|'contributor'|'stories'|'newStory'|'media'|'authors'|'pageEditor'|'team'|'profile';
export type WorkspaceAccess={
  allowed:boolean;landing:'/newsroom'|'/newsroom/contributor';nav:WorkspaceNavKey[];
  viewStories:boolean;fullEditor:boolean;createStory:boolean;fullMedia:boolean;privateMedia:boolean;
  manageBylines:boolean;fullHomepage:boolean;viewTeam:boolean;onboarding:boolean;
};
export function buildWorkspaceAccess(grants:ReadonlySet<string>,options:{privateMedia:boolean;onboarding:boolean}):WorkspaceAccess{
  const allowed=grants.has('newsroom.access');
  const all=(...keys:WorkspaceCapability[])=>allowed&&keys.every(k=>grants.has(k));
  const viewStories=all('story.view_all');
  // Do not expose legacy editor controls to partially privileged staff.
  const fullEditor=all('story.view_all','story.edit_all','story.assign','story.publish','story.schedule',
    'story.archive_delete','story.submit_review','story.review','revision.view','revision.publish','revision.discard');
  const createStory=fullEditor&&all('story.create');
  const fullMedia=all('media.view_all','media.upload','media.edit_all','media.approve','media.delete');
  const privateMedia=options.privateMedia&&all('media.upload');
  const manageBylines=all('byline.manage');
  const fullHomepage=all('homepage.view_editor','homepage.edit','homepage.publish');
  const viewTeam=all('team.view');
  const onboarding=allowed&&options.onboarding;
  const nav:WorkspaceNavKey[]=[];
  if(allowed){
    nav.push(viewStories?'dashboard':'contributor');
    if(viewStories)nav.push('stories');
    if(createStory)nav.push('newStory');
    if(fullMedia||privateMedia)nav.push('media');
    if(manageBylines)nav.push('authors');
    if(fullHomepage)nav.push('pageEditor');
    if(viewTeam)nav.push('team');
    if(onboarding)nav.push('profile');
  }
  return {allowed,landing:viewStories?'/newsroom':'/newsroom/contributor',nav,viewStories,fullEditor,createStory,fullMedia,privateMedia,manageBylines,fullHomepage,viewTeam,onboarding};
}
