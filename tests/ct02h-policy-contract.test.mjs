import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read = path => readFileSync(new URL('../'+path,import.meta.url),'utf8');
const migration=read('supabase/migrations/20261124012440_ct02h_editorial_direct_policies.sql');
const original=read('tests/fixtures/ct02h-original-homepage-publisher.sql');
const executable=migration.split('\n').filter(line=>!line.trimStart().startsWith('--')).join('\n');

test('homepage publisher retains the exact original transactional body after the validation marker',()=>{
  const marker="  IF jsonb_typeof(p_selections) <> 'array'";
  const a=original.indexOf(marker),b=migration.indexOf(marker);
  assert.ok(a>0&&b>0);
  assert.equal(migration.slice(b,migration.indexOf('$function$',b)), original.slice(a,original.indexOf('$function$',a)));
});
test('homepage publisher validates JWT actor, edit permission and independent publish permission',()=>{
  assert.match(executable, /auth\.uid\(\)\) IS DISTINCT FROM p_user_id/);
  assert.match(executable, /'homepage\.edit'::public\.staff_capability_key/);
  assert.match(executable, /'homepage\.publish'::public\.staff_capability_key/);
  assert.match(executable, /revoke all on function public\.publish_homepage_layout\(jsonb,uuid\) from public, anon, authenticated/);
  assert.doesNotMatch(executable,/security definer|user_metadata/i);
});
test('old legacy direct writes removed without deleting the public reader-facing policies',()=>{
  for(const policy of ['homepage_slots_insert_editor','homepage_slots_update_editor',
    'homepage_slots_delete_editor','breaking_news_insert_editor','breaking_news_update_editor',
    'breaking_news_delete_editor','tags_insert_staff','story_categories_insert_staff','story_tags_insert_staff',
    'editorial_profiles_update_editor','Editors can update editorial profiles']){
      assert.ok(migration.includes('drop policy if exists '+(policy.includes(' ')?'"'+policy+'"':policy)),policy);
    }
  for(const policy of ['homepage_slots_select_public','breaking_news_select_public','tags_select_public','editorial_profiles_select_visible']){
    assert.ok(!migration.includes('drop policy if exists '+policy),policy);
  }
});
test('direct homepage editing alone cannot write live placement rows',()=>{
  for(const p of ['ct02h_slots_insert','ct02h_slots_update','ct02h_slots_delete',
    'ct02h_breaking_insert','ct02h_breaking_update','ct02h_breaking_delete']){
    const at=migration.indexOf('create policy '+p);
    assert.ok(at>=0,p);
    const segment=migration.slice(at,migration.indexOf(';',at));
    assert.match(segment,/homepage\.edit'/);
    assert.match(segment,/homepage\.publish'/);
  }
});
test('taxonomy relationships are tied to actual story scope and live publishing',()=>{
  for(const p of ['ct02h_story_categories_insert','ct02h_story_categories_delete',
   'ct02h_story_tags_insert','ct02h_story_tags_delete']){
   const at=migration.indexOf('create policy '+p),segment=migration.slice(at,migration.indexOf(';',at));
   assert.ok(at>=0,p);
   assert.match(segment,/story\.edit_assigned'/);
   assert.match(segment,/s\.status <> 'published'/);
   assert.match(segment,/story\.publish'/);
  }
});
test('new story, restore, homepage, breaking news, byline and tags all use current server gates',()=>{
 const gates=read('lib/permissions/editorial-route-gates.ts');
 for(const cap of ['story.create','story.assign','story.edit_all','revision.view',
  'homepage.edit','homepage.publish','byline.manage']){
  assert.ok(gates.includes(cap),cap);
 }
 assert.match(gates,/CT_STAFF_ACCESS_V2_ENABLED === 'true'/);
 for(const [path,method] of [
 ['app/api/stories/create/route.ts','mayCreateStory'],
 ['app/api/stories/[id]/restore/route.ts','mayRestoreStoryVersion'],
 ['app/api/front-page/layout-draft/route.ts','mayEditHomepage'],
 ['app/api/front-page/layout-publish/route.ts','mayPublishHomepage'],
 ['app/api/front-page/placements/route.ts','mayPublishHomepage'],
 ['app/api/front-page/placements/[id]/route.ts','mayPublishHomepage'],
 ['app/api/front-page/breaking-news/route.ts','mayManageBreakingNews'],
 ['app/api/front-page/breaking-news/[id]/route.ts','mayManageBreakingNews'],
 ['app/api/editorial-profiles/[id]/route.ts','mayManageByline'],
 ['app/api/tags/route.ts','mayCreateTag']]){
  assert.ok(read(path).includes('await '+method+'('),path);
 }
});
