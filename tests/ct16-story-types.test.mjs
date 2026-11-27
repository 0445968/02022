import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {STORY_TYPES,DEFAULT_STORY_TYPE,isStoryType,storyTypeLabel} from '../lib/permissions/story-types.ts';
test('story types are unique, bilingual and reject unknown values',()=>{
 assert.equal(STORY_TYPES.length,28);assert.equal(new Set(STORY_TYPES.map(r=>r[0])).size,28);assert.equal(DEFAULT_STORY_TYPE,'news_report');
 for(const [key,en,es] of STORY_TYPES){assert.match(key,/^[a-z_]+$/);assert.ok(en.trim()&&es.trim());assert.equal(isStoryType(key),true);assert.equal(storyTypeLabel(key,'en'),en);assert.equal(storyTypeLabel(key,'es'),es);}
 for(const invalid of [null,undefined,{},'','News report','news_report ','unknown'])assert.equal(isStoryType(invalid),false);
});
test('staged SQL allowlists equal the typed catalog',()=>{
 const sql=readFileSync(new URL('../supabase/migrations/20261127154150_ct16_story_types.sql',import.meta.url),'utf8');
 const checks=[...sql.matchAll(/check\(story_type in \(([^)]+)\)\)/g)];assert.equal(checks.length,3);
 for(const [,values] of checks)assert.deepEqual([...values.matchAll(/'([^']+)'/g)].map(m=>m[1]),STORY_TYPES.map(r=>r[0]));
 assert.match(sql,/s\.story_type is not distinct from new\.story_type/);
 assert.match(sql,/story_type = v_revision\.story_type/);
 assert.match(sql,/s\.short_title,s\.story_type,s\.subheadline/);
});
