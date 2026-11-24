import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const url=s=>'data:text/javascript;base64,'+Buffer.from(s).toString('base64');
const draft=url(compile(file('lib/permissions/assigned-draft-contract.ts')));
const {validQueueIds,parseStoryQueuePage,queuePresentation}=await import(url(compile(file('lib/permissions/story-publication-queue.ts')).replace("'./assigned-draft-contract'","'"+draft+"'")));
const id='20000000-0000-0000-0000-000000000002',other='20000000-0000-0000-0000-000000000001',asOf='2026-11-24T12:00:00Z',future='2026-11-25T12:00:00Z';
const item={storyId:id,source:'draft',state:'pending',dueAt:future,snapshotCurrent:true};
test('queue page is strict, bounded, deduplicated and limited to requested IDs',()=>{
 assert.equal(validQueueIds([id,other]),true);
 for(const invalid of [[],[id,id],Array(51).fill(id),['bad']])assert.equal(validQueueIds(invalid),false);
 assert.deepEqual(parseStoryQueuePage({asOf,items:[item]},[id,other]).items,[item]);
 for(const bad of [{...item,storyId:other},{...item,authorizedBy:other},{...item,snapshotCurrent:null},{...item,state:'unverified',source:'revision'}])assert.throws(()=>parseStoryQueuePage({asOf,items:[bad]},[id]));
 assert.throws(()=>parseStoryQueuePage({asOf,items:[item,item]},[id,other]));
});
test('queue status distinguishes blocked, stale, due and unverified from future queued',()=>{
 assert.equal(queuePresentation(item,asOf),'queued');
 assert.equal(queuePresentation({...item,state:'blocked'},asOf),'blocked');
 assert.equal(queuePresentation({...item,snapshotCurrent:false},asOf),'stale');
 assert.equal(queuePresentation({...item,dueAt:asOf},asOf),'due');
 assert.equal(queuePresentation({...item,state:'unverified',snapshotCurrent:null,dueAt:null},asOf),'legacy');
});
test('one bounded RPC is independent of stored publication status and unpublished changes',()=>{
 const p=file('app/newsroom/(shell)/stories/page.tsx'),ui=file('components/editorial/stories-dashboard.tsx'),sql=file('supabase/migrations/20261124225839_ct08b2b_effective_schedule.sql');
 assert.match(p,/readStoryPublicationQueue\(storiesResult.items.map\(s=>s.id\)\)/);
 assert.match(ui,/StatusBadge status=\{story.status\}/);
 assert.match(ui,/story.hasUnpublishedChanges/);assert.match(ui,/Publication queue/);
 assert.match(sql,/calendar_story_scope\(s.id\)/);assert.match(sql,/revision.view/);
 assert.match(sql,/q.state in \('pending','blocked'\)/);
 assert.doesNotMatch(sql,/update public\.stories|run_due_reviewed_publications|cron\.schedule/);
});
