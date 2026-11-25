export function currentPublicWindow(active:boolean,start:string|null,end:string|null,now:number):boolean{
 if(!active||!Number.isFinite(now))return false;
 const from=start===null?-Infinity:Date.parse(start),to=end===null?Infinity:Date.parse(end);
 return !Number.isNaN(from)&&!Number.isNaN(to)&&from<=now&&now<to;
}
export function isPublicStory(status:unknown,publishedAt:unknown,now:number):boolean{
 return status==='published'&&typeof publishedAt==='string'&&Number.isFinite(Date.parse(publishedAt))&&Date.parse(publishedAt)<=now;
}
export function safeExternalAlertUrl(value:string|null):boolean{
 if(value===null)return true;
 try{const u=new URL(value);return (u.protocol==='https:'||u.protocol==='http:')&&!u.username&&!u.password;}catch{return false;}
}
export function usableHeadshot(asset:{status:string;mimeType:string;rightsStatus:string;licenseExpiresAt:string|null;embargoUntil:string|null;isSuperseded:boolean;trashedAt:string|null},now:number):boolean{
 return asset.status==='approved'&&asset.mimeType.startsWith('image/')&&!['unknown','restricted'].includes(asset.rightsStatus)&&!asset.isSuperseded&&asset.trashedAt===null&&currentPublicWindow(true,asset.embargoUntil,asset.licenseExpiresAt,now);
}
