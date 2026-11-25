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

test('mobile header can shrink its masthead without hiding navigation and browser shards retain route evidence',()=>{
 const header=f('components/layout/header.tsx'),masthead=f('components/layout/masthead.tsx');
 assert.match(header,/min-w-0\s+flex-1\s+sm:flex-none/);
 assert.match(masthead,/max-h-6 w-auto max-w-full object-contain/);
 assert.match(f('components/navigation/account-button.tsx'),/aria-label=\{dict.nav.signIn\}/);
 const smoke=f('scripts/ct15-local-browser-smoke.mjs');
 assert.match(smoke,/AbortSignal.timeout\(10000\)/);assert.doesNotMatch(smoke,/waitUntil:'networkidle'/);
 assert.match(smoke,/await checkpoint\(\)/);assert.match(smoke,/CT15_VIEWPORT_WIDTH/);
 const ci=f('.github/workflows/ct15-local-browser-smoke.yml');assert.match(ci,/width: \[390, 768, 1440\]/);assert.match(ci,/fail-fast: false/);
});

test('public homepage owns exactly one main landmark with fallback heading and preserves language navigation state',()=>{
 const grid=f('components/editorial/home/LeadNewsGrid.tsx'),lead=f('components/editorial/home/LeadStoryColumn.tsx'),shell=f('components/layout/public-shell.tsx');
 assert.doesNotMatch(grid,/<main\b/);
 assert.match(lead,/<h1 className="sr-only">/);
 assert.match(shell,/href="#main"/);assert.match(shell,/id="main"\s+tabIndex=\{-1\}/);
 assert.match(f('components/navigation/language-switcher.tsx'),/current\.search \+ current\.hash/);
 const smoke=f('scripts/ct15-local-browser-smoke.mjs');assert.match(smoke,/metrics.main===1&&metrics.headings===1/);assert.match(smoke,/queryAndHashPreserved:true/);
});

import {execFileSync} from 'node:child_process';
test('browser harness parses before the expensive build',()=>{execFileSync(process.execPath,['--check',new URL('../scripts/ct15-local-browser-smoke.mjs',import.meta.url).pathname]);});

test('locale toggle uses a fresh document URL and full navigation to avoid stale fragments',()=>{
 const source=f('components/navigation/language-switcher.tsx');
 assert.match(source,/new URL\(window.location.href\)/);assert.match(source,/stripLocale\(current.pathname\)/);
 assert.match(source,/window.location.assign\(next\)/);assert.doesNotMatch(source,/router\.push\(/);
});
