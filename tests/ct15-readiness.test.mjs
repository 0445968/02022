import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('forward manifest includes all and only staged forward SQL, historical replay excluded',()=>{
 const files=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(x=>x.startsWith('202611')&&x.endsWith('.sql'));
 const manifest=f('docs/clear-talks/CT15_FORWARD_MIGRATION_MANIFEST.md');for(const name of files)assert.ok(manifest.includes('supabase/migrations/'+name),name);
 assert.doesNotMatch(manifest,/supabase\/migrations\/202608/);
});
test('browser audit requires explicit isolated target and no credentials or writes',()=>{
 const s=f('scripts/ct15-browser-audit.mjs');assert.match(s,/CT15_APPROVED_READ_ONLY==='yes'/);assert.match(s,/clear-talks.vercel.app/);assert.match(s,/\['GET','HEAD'\]/);assert.match(s,/390/);assert.match(s,/1440/);
 const workflow=f('.github/workflows/ct15-preview-browser-audit.yml');assert.match(workflow,/workflow_dispatch:/);assert.doesNotMatch(workflow,/pull_request:/);
});
test('account navigation uses actual scoped access, skip link and non-public metadata guard',()=>{
 const shell=f('components/account/account-shell.tsx');assert.match(shell,/scopedAccessEnabled\?\(canOpenNewsroom/);assert.match(shell,/href="#account-main"/);assert.match(shell,/id="account-main"/);
 assert.match(f('app/account/layout.tsx'),/scopedAccessEnabled=\{scopedNewsroomEnabled\(\)\}/);
 assert.match(f('app/\[locale\]/article/\[slug\]/page.tsx'),/story.accessLevel!=='public'/);
});

test('document language derives from the route and stays synchronized across navigation',()=>{
 const mw=f('middleware.ts'),root=f('app/layout.tsx');
 assert.ok(mw.indexOf('request.headers.set(LOCALE_HEADER')<mw.indexOf('createMiddlewareClient(request)'));
 assert.match(mw,/isLocale\(segment\)\?segment:defaultLocale/);
 assert.match(root,/\(await headers\(\)\)\.get\(LOCALE_HEADER\)/);
 assert.match(root,/lang=\{locale\}/);
 assert.match(f('components/layout/document-language.tsx'),/document\.documentElement\.lang=locale/);
 for(const path of ['lib/i18n/context.tsx','components/account/account-shell.tsx','components/editorial/newsroom-shell.tsx'])assert.match(f(path),/<DocumentLanguage locale=\{locale\}/);
 for(const path of ['app/[locale]/(auth)/layout.tsx','app/[locale]/staff-invite/page.tsx'])assert.doesNotMatch(f(path),/<main\b/);
 assert.match(f('components/editorial/newsroom-shell.tsx'),/href="#newsroom-main"/);
 for(const path of ['.github/workflows/ct15-local-browser-smoke.yml','.github/workflows/ct15-preview-browser-audit.yml'])assert.match(f(path),/runs-on: ubuntu-24\.04/);
});
