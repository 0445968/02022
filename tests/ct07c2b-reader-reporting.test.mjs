import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const compile=s=>ts.transpileModule(s,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const base='data:text/javascript;base64,'+Buffer.from(compile(file('lib/permissions/assigned-draft-contract.ts'))).toString('base64');
const code=compile(file('lib/permissions/reader-report-contract.ts')).replace("'./assigned-draft-contract'","'"+base+"'");
const {parseReaderReportCommand,parseReaderReportReceipt,parseReaderReportPage}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const id='42000000-0000-0000-0000-000000000010',at='2026-11-24T00:00:00Z';
test('CT07c2b reader submission and receipt are strict, no identity injection',()=>{
 const c={commentId:id,updatedAt:at,reason:'Report reason'};
 assert.deepEqual(parseReaderReportCommand(c),c);
 for(const x of [{reporterId:id},{status:'actioned'},{updatedAt:'invalid'},{reason:'x'},{reason:'a\nb'}])assert.throws(()=>parseReaderReportCommand({...c,...x}));
 const item={id,commentId:id,reason:'Report reason',status:'open',createdAt:at,reviewedAt:null};
 assert.deepEqual(parseReaderReportReceipt({report:item,alreadyReported:true},id),{report:item,alreadyReported:true});
 assert.throws(()=>parseReaderReportPage({items:[{...item,reviewedBy:id}],hasMore:false}));
});
test('CT07c2b reader controls send displayed timestamp and require confirmation',()=>{
 const s=file('components/comments/reader-report-control.tsx');
 assert.match(s,/parseReaderReportCommand\(\{commentId,updatedAt,reason\}\)/);
 assert.match(s,/!confirmed\|\|!valid/);
 assert.match(s,/r.status===409/);
 assert.match(s,/Check My reports/);
 assert.match(file('lib/services/reader-reports.ts'),/auth\.getUser\(\)/);
 assert.match(file('app/[locale]/article/[slug]/page.tsx'),/reportingEnabled=\{readerReportingEnabled\(\)\}/);
 assert.match(file('.env.example'),/CT_READER_REPORTING_ENABLED=false/);
});
