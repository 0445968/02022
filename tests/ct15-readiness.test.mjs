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


test('reader profile language has a stable bilingual accessible name and public navigation receives scoped authorization',()=>{
 assert.match(f('components/account/ReaderProfileForm.tsx'),/select aria-label=\{es\?'Idioma de la cuenta':'Account language'\}/);
 assert.match(f('components/layout/public-shell.tsx'),/scopedNewsroomEnabled\(\)\?!!user&&await getWorkspaceAccess\(\)/);
 for(const path of ['components/layout/header.tsx','components/navigation/mobile-nav.tsx'])assert.match(f(path),/canOpenNewsroom=\{canOpenNewsroom\}/);
 assert.match(f('components/navigation/account-button.tsx'),/canOpenNewsroom\?\?isStaff\(user\)/);
 execFileSync(process.execPath,['--check',new URL('../scripts/ct15-local-platform-integration.mjs',import.meta.url).pathname]);
});


test('responsive newsroom keeps one scoped navigation and keyboard focusable main, and story status uses current locale',()=>{
 const shell=f('components/editorial/newsroom-shell.tsx'),sidebar=f('components/editorial/newsroom-sidebar.tsx'),stories=f('components/editorial/stories-dashboard.tsx');
 assert.match(shell,/flex-col overflow-hidden lg:flex-row/);assert.match(shell,/id="newsroom-main"\s+tabIndex=\{-1\}/);
 assert.match(sidebar,/lg:w-60/);assert.match(sidebar,/overflow-x-auto/);assert.match(sidebar,/lg:min-w-0/);
 assert.match(stories,/statusLabel\(status, locale\)/);assert.match(stories,/islandLabel\(i, locale\)/);assert.match(stories,/aria-label=\{label\}/);
});


test('story sorting uses explicit dictionary keys and readable filter labels',()=>{
 const source=f('components/editorial/stories-dashboard.tsx');
 for(const locale of ['en','es']){const dict=JSON.parse(f('messages/'+locale+'.json'));for(const key of ['sortUpdatedDesc','sortUpdatedAsc','sortPublishedDesc','sortHeadlineAsc']){assert.ok(dict.stories[key]);assert.ok(source.includes(key));}}
 assert.match(source,/Object.entries\(SORT_LABELS\)/);assert.match(source,/Clear filters/);assert.match(source,/type="submit"/);
 assert.match(f('components/editorial/newsroom-sidebar.tsx'),/nav.scrollLeft\+=/);
});


test('restricted writer sidebar uses its own draft route and account branding is not another page heading',()=>{
 assert.match(f('lib/services/newsroom-workspace.ts'),/canStartWriterDraft\(\)\)access.nav.push\('contributorNew'\)/);
 const nav=f('components/editorial/newsroom-sidebar.tsx');assert.match(nav,/key==='contributorNew'\?\{key,icon:PlusCircle,href:'\/newsroom\/contributor\/new'\}/);assert.match(nav,/item.href===activeHref/);
 const account=f('components/account/account-shell.tsx');assert.doesNotMatch(account,/<h1\b/);assert.match(account,/mobileNavRef/);
});


test('page editor uses a single shell main and real localized page heading',()=>{
 assert.doesNotMatch(f('components/editorial/page-editor/PageEditor.tsx'),/<main\b/);
 assert.match(f('components/editorial/page-editor/PageEditorTopBar.tsx'),/<h1[\s\S]*?Page Editor[\s\S]*?<\/h1>/);
 assert.match(f('components/editorial/page-editor/PageEditorNav.tsx'),/aria-pressed=\{active\}/);
});
test('header sign-out checks provider result, blocks duplicate submissions and clears navigation cache',()=>{
 for(const path of ['components/editorial/sign-out-button.tsx','components/navigation/account-button.tsx']){
  const s=f(path);assert.match(s,/if\(lock.current\)return/);assert.match(s,/if\(failure\)throw failure/);assert.match(s,/window.location.replace\(localizedPath\(locale,'\/'\)\)/);assert.match(s,/role="alert"/);assert.doesNotMatch(s,/router\.refresh\(/);
 }
});


test('calendar offers an accessible scroll region and explicit agenda selection; loaded-state markers are available',()=>{
 const calendar=f('app/newsroom/(shell)/schedule/page.tsx');assert.match(calendar,/Calendar controls/);assert.match(calendar,/name="view"/);assert.match(calendar,/<option value="agenda">Agenda<\/option>/);assert.match(calendar,/type="submit"/);assert.match(calendar,/Monthly calendar/);assert.match(calendar,/tabIndex=\{0\}/);
 for(const [path,id] of [['components/editorial/team/StaffTeamManager.tsx','ct-team-directory'],['components/editorial/media-library/MediaLibrary.tsx','ct-media-library']]){const source=f(path);assert.ok(source.includes('id="'+id+'"'));assert.match(source,/aria-busy=\{loading\}/);}
 assert.match(f('components/editorial/media-library/MediaErrorState.tsx'),/role="alert"/);
 const menu=f('components/navigation/account-button.tsx');assert.match(menu,/aria-expanded=\{open\}/);assert.match(menu,/hidden=\{!open\}/);assert.match(menu,/event.key==='Escape'/);
});


test('reader profile cannot accept edits before hydration',()=>{
 const s=f('components/account/ReaderProfileForm.tsx');assert.match(s,/useSyncExternalStore\(subscribeHydration,clientHydrated,serverHydrated\)/);assert.match(s,/if\(!hydrated\|\|lock.current\|\|uncertain\)return/);assert.match(s,/aria-busy=\{!hydrated\|\|busy\}/);assert.equal((s.match(/disabled=\{!hydrated\|\|busy\|\|uncertain/g)||[]).length,4);
});
