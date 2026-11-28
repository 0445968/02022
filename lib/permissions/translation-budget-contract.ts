export type TranslationBudget={enabled:boolean;periodStart:string;periodEnd:string;monthlyLimit:number;dailyActorLimit:number;requestLimit:number;reservedCharacters:number;storyCharacters:number;pollCharacters:number;requestCount:number};
const keys=['enabled','periodStart','periodEnd','monthlyLimit','dailyActorLimit','requestLimit','reservedCharacters','storyCharacters','pollCharacters','requestCount'];
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER):v is number=>typeof v==='number'&&Number.isSafeInteger(v)&&v>=min&&v<=max;
export function parseTranslationBudget(raw:unknown):TranslationBudget{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid usage summary');
 const x=raw as Record<string,unknown>;
 if(Object.keys(x).length!==keys.length||!keys.every(k=>Object.hasOwn(x,k))||typeof x.enabled!=='boolean'||typeof x.periodStart!=='string'||typeof x.periodEnd!=='string'||!integer(x.monthlyLimit,1,1900000)||!integer(x.dailyActorLimit,1,1900000)||!integer(x.requestLimit,1,50000)||!integer(x.reservedCharacters,0)||!integer(x.storyCharacters,0)||!integer(x.pollCharacters,0)||!integer(x.requestCount,0)||x.storyCharacters+x.pollCharacters!==x.reservedCharacters||x.requestCount>x.reservedCharacters||x.reservedCharacters>x.requestCount*50000)throw Error('Invalid usage fields');
 const start=new Date(x.periodStart),end=new Date(x.periodEnd);
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start.getUTCDate()!==1||start.getUTCHours()!==0||start.getUTCMinutes()!==0||start.getUTCSeconds()!==0||start.getUTCMilliseconds()!==0||end.getTime()!==Date.UTC(start.getUTCFullYear(),start.getUTCMonth()+1,1))throw Error('Invalid usage period');
 return x as TranslationBudget;
}
export function translationBudgetProgress(x:TranslationBudget){
 const percentage=100*x.reservedCharacters/x.monthlyLimit;
 return {percentage,remaining:Math.max(0,x.monthlyLimit-x.reservedCharacters),threshold:percentage>=100?100:percentage>=90?90:percentage>=75?75:percentage>=50?50:0};
}
