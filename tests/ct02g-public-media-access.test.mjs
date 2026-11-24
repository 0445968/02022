import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const s=readFileSync(new URL('../lib/services/stories.ts',import.meta.url),'utf8');

test('public story queries choose safe projection when v2 enabled',()=>{
  assert.match(s,/PUBLIC_STORY_SELECT_SAFE = PUBLIC_STORY_SELECT\.replace/);
  assert.match(s,/featured_image_id/);
  assert.match(s,/securePublicMediaEnabled\(\) \? PUBLIC_STORY_SELECT_SAFE : PUBLIC_STORY_SELECT/);
  assert.match(s,/CT_STAFF_ACCESS_V2_ENABLED === 'true'/);
});
test('public detail, feed and related story media never fall back to base table on safe-view failure',()=>{
  assert.match(s,/publicProjection \? 'media_public_assets' : 'media_assets'/);
  assert.match(s,/\.from\('media_public_assets'\)/);
  assert.match(s,/\.select\('id, url, alt_text'\)/);
  assert.ok((s.match(/await hydratePublicMedia\(/g) ?? []).length >= 3);
  assert.match(s,/if \(error\) \{\s*console\.error\('Unable to load public media metadata:'[\s\S]*featured_image: null/);
});
test('legacy image path remains untouched unless new release flag deliberately enabled',()=>{
  assert.match(s,/featured_image:media_assets!stories_featured_image_id_fkey/);
  assert.match(s,/return resolveStoryRelations\(\s*story as StoryRow,\s*true\s*\)/);
});
