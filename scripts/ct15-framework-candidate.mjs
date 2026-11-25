/** Disposable CI-only preparation; never run against a live deployment. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
assert.equal(process.env.CT15_DISPOSABLE_FRAMEWORK_REHEARSAL,'yes');
assert.equal(process.env.GITHUB_ACTIONS,'true');
const p=JSON.parse(readFileSync('package.json','utf8'));
assert.equal(p.dependencies.next,'13.5.1');
p.dependencies.next='16.4.6';
p.dependencies.react='19.2.7';
p.dependencies['react-dom']='19.2.7';
p.dependencies['@types/react']='^19.2.0';
p.dependencies['@types/react-dom']='^19.2.0';
p.dependencies.typescript='^5.9.3';
p.dependencies.eslint='^9.39.0';
p.dependencies['eslint-config-next']='16.4.6';
p.dependencies['react-day-picker']='9.11.1';
// Legacy 13.x WASM runtime is not compatible with candidate Next.
delete p.dependencies['@next/swc-wasm-nodejs'];
// Netlify build plugin is not used by the Vercel application. Remove only
// from the disposable candidate, review Netlify compatibility before adoption.
delete p.dependencies['@netlify/plugin-nextjs'];
p.scripts.lint='eslint app components lib middleware.ts --max-warnings=1000';
p.scripts.build='next build --webpack';
writeFileSync('package.json',JSON.stringify(p,null,2)+'\n');
let config=readFileSync('next.config.js','utf8');
config=config.replace(/  eslint: \{[\s\S]*?\},\n/,'');
writeFileSync('next.config.js',config);
writeFileSync('eslint.config.mjs', "import {defineConfig,globalIgnores} from 'eslint/config';\nimport nextVitals from 'eslint-config-next/core-web-vitals';\nexport default defineConfig([...nextVitals,globalIgnores(['.next/**','out/**','build/**','next-env.d.ts'])]);\n");
// DayPicker 8 -> 9 naming changes. Preserve existing theme tokens, dimensions and icons.
let calendar=readFileSync('components/ui/calendar.tsx','utf8');
for(const [from,to] of Object.entries({caption:'month_caption',nav_button_previous:'button_previous',nav_button_next:'button_next',table:'month_grid',head_row:'weekdays',head_cell:'weekday',row:'week',cell:'day',day:'day_button',day_range_end:'range_end',day_selected:'selected',day_today:'today',day_outside:'outside',day_disabled:'disabled',day_range_middle:'range_middle',day_hidden:'hidden'})){
 calendar=calendar.replace(new RegExp('(^\\s*)'+from+':','m'),'$1__ct15_'+to+':');
}
calendar=calendar.replaceAll('__ct15_','');
calendar=calendar.replace(/        nav_button: cn\([\s\S]*?\),\n/,'');
calendar=calendar.replace("button_previous: 'absolute left-1',","button_previous: cn(buttonVariants({variant:'outline'}),'absolute left-1 h-7 w-7 p-0'),");
calendar=calendar.replace("button_next: 'absolute right-1',","button_next: cn(buttonVariants({variant:'outline'}),'absolute right-1 h-7 w-7 p-0'),");
calendar=calendar.replace(/        IconLeft:[^\n]+\n        IconRight:[^\n]+/,"        Chevron: ({orientation,className}) => orientation==='left'?<ChevronLeft className={cn('h-4 w-4',className)}/>:<ChevronRight className={cn('h-4 w-4',className)}/>,");
writeFileSync('components/ui/calendar.tsx',calendar);
// Run official asynchronous request-API codemod. Unresolved comments and
// build errors must be reviewed; never accept UnsafeUnwrapped casts as final.
execFileSync('npx',['--yes','--package','@next/codemod@16.4.6','next-codemod','next-async-request-api','.','--force'],{stdio:'inherit'});
