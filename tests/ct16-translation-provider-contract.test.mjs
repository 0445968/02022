import test from 'node:test';import assert from 'node:assert/strict';
import {planTranslation,parseProviderResults,preparePollTranslation,applyPollTranslationResult} from '../lib/permissions/translation-provider-contract.ts';
import {prepareTranslation,applyTranslationResult} from '../lib/permissions/story-translation-contract.ts';
const fp='a'.repeat(64);
const request={sourceFingerprint:fp,sourceLocale:'en',targetLocale:'es',segments:Array.from({length:52},(_,i)=>({id:String(i),text:'x'.repeat(220)}))};
const response=plan=>plan.batches.map(b=>b.body.map((_,i)=>({translations:[{text:'Synthetic output '+b.ids[i],to:plan.targetLocale}]})));
test('provider plan conservatively limits every batch and reserves entire input',()=>{
 const plan=planTranslation(request,20000);assert.equal(plan.characters,52*220);assert.equal(plan.batches.length,3);
 assert.ok(plan.batches.every(b=>b.characters<=5000&&b.body.length<=25));assert.equal(plan.batches.flatMap(b=>b.ids).length,52);
 assert.deepEqual(Object.keys(plan.batches[0].body[0]),['Text']);assert.throws(()=>planTranslation(request,10000));
 assert.throws(()=>planTranslation({...request,segments:[{id:'0',text:'x'.repeat(5001)}]},20000));
 assert.throws(()=>planTranslation({...request,segments:[request.segments[0],request.segments[0]]},20000));
});
test('provider response fails closed for missing rows, extra data, wrong locale and multiple targets',()=>{
 const plan=planTranslation(request,20000);const raw=response(plan);const parsed=parseProviderResults(request,20000,raw);
 assert.equal(parsed.segments[51].id,'51');assert.equal(parsed.sourceFingerprint,fp);
 for(const mutate of [x=>x.pop(),x=>x[0].pop(),x=>x[0][0].translations[0].to='en',x=>x[0][0].translations.push({text:'extra',to:'es'}),x=>x[0][0].other='unexpected',x=>x[0][0].translations[0].text='']){const bad=structuredClone(raw);mutate(bad);assert.throws(()=>parseProviderResults(request,20000,bad));}
});
test('story round trip preserves original structure and link attributes',()=>{
 const copy={headline:'News',shortTitle:null,subheadline:null,summary:null,seoTitle:null,seoDescription:null,imageCaption:null,body:{type:'doc',content:[{type:'paragraph',content:[{type:'text',text:'Read',marks:[{type:'link',attrs:{href:'https://example.test/path'}}]}]}]}};
 const req=prepareTranslation(copy,'en',fp),plan=planTranslation(req,20000);assert.ok(!JSON.stringify(plan.batches.map(b=>b.body)).includes('example.test'));
 const result=applyTranslationResult(copy,req,parseProviderResults(req,20000,response(plan)));assert.equal(result.body.content[0].content[0].marks[0].attrs.href,'https://example.test/path');assert.equal(copy.headline,'News');
});
test('poll translation preserves option positions and rejects duplicate or stale labels',()=>{
 const copy={question:'Which option?',options:['One','Two','Three']},req=preparePollTranslation(copy,'en',fp),plan=planTranslation(req,20000);
 const result=parseProviderResults(req,20000,response(plan));const translated=applyPollTranslationResult(copy,req,{...result,segments:[...result.segments].reverse()});
 assert.deepEqual(translated.options,['Synthetic output 1','Synthetic output 2','Synthetic output 3']);
 assert.throws(()=>applyPollTranslationResult({...copy,options:['Two','One','Three']},req,result));
 assert.throws(()=>applyPollTranslationResult(copy,req,{...result,segments:result.segments.map(s=>({...s,text:'Repeated label'}))}));
});
