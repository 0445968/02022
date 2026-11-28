import {readTranslationBudget,translationUsageEnabled} from '@/lib/services/translation-budget';
import {translationBudgetProgress} from '@/lib/permissions/translation-budget-contract';
export async function TranslationUsage({locale}:{locale:'en'|'es'}){
 if(!translationUsageEnabled())return null;
 const es=locale==='es',t=(en:string,sp:string)=>es?sp:en;
 const usage=await readTranslationBudget();if(!usage)return <section className="mt-3 rounded-lg border border-border bg-white p-3"><h2 className="font-headline text-lg font-semibold text-deep">{t('Translation usage','Uso de traducción')}</h2><p className="text-sm text-muted-foreground">{t('Usage could not be verified.','No se pudo verificar el uso.')}</p></section>;
 const {percentage,remaining,threshold}=translationBudgetProgress(usage);
 const fmt=new Intl.NumberFormat(es?'es':'en-US');
 const period=new Intl.DateTimeFormat(es?'es':'en-US',{month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(usage.periodStart));
 return <section className="mt-3 space-y-2 rounded-lg border border-border bg-white p-3" aria-label={t('Translation usage','Uso de traducción')}>
  <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="font-headline text-lg font-semibold text-deep">{t('Translation usage','Uso de traducción')} · {period}</h2><span className="text-xs font-semibold text-muted-foreground">{usage.enabled?t('Budget reservation enabled','Reserva de presupuesto habilitada'):t('Automatic translation disabled','Traducción automática deshabilitada')}</span></div>
  <div className="flex flex-wrap justify-between gap-2 text-sm"><span>{fmt.format(usage.reservedCharacters)} / {fmt.format(usage.monthlyLimit)} {t('characters reserved','caracteres reservados')}</span><span>{fmt.format(remaining)} {t('remaining','restantes')}</span></div>
  <progress className="h-2 w-full accent-primary" value={Math.min(usage.reservedCharacters,usage.monthlyLimit)} max={usage.monthlyLimit} aria-label={t('Monthly reserved character budget','Presupuesto mensual de caracteres reservados')}/>
  {threshold>=50&&<p role="status" className="text-sm font-semibold text-breaking">{threshold===100?t('Monthly application limit reached. Manual translation remains available.','Límite mensual alcanzado. La traducción manual sigue disponible.'):t('Monthly usage threshold reached: ','Umbral mensual alcanzado: ')+threshold+'% ('+fmt.format(Math.round(percentage))+'%)'}</p>}
  <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4"><div><dt className="text-xs text-muted-foreground">{t('Articles','Artículos')}</dt><dd>{fmt.format(usage.storyCharacters)}</dd></div><div><dt className="text-xs text-muted-foreground">{t('Polls','Encuestas')}</dt><dd>{fmt.format(usage.pollCharacters)}</dd></div><div><dt className="text-xs text-muted-foreground">{t('Reservations','Reservas')}</dt><dd>{fmt.format(usage.requestCount)}</dd></div><div><dt className="text-xs text-muted-foreground">{t('Daily staff limit','Límite diario por miembro')}</dt><dd>{fmt.format(usage.dailyActorLimit)}</dd></div></dl>
  <p className="text-xs text-muted-foreground">{t('UTC monthly period. This is conservative application reservation accounting, not an Azure invoice or confirmed translation count. Failed or uncertain sends remain reserved. No paid upgrade is automatic.','Período mensual UTC. Son reservas conservadoras de la aplicación, no una factura de Azure ni traducciones confirmadas. Los envíos fallidos o inciertos siguen reservados. No hay actualización de pago automática.')}</p>
 </section>;
}
