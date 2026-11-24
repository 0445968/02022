export type StaffOnboardingInput={
  expectedRevision:number;displayName:string;locale:'en'|'es';
  bylineRequested:boolean;acknowledgedVersion:1;confirmed:true;
};
export function validateStaffOnboarding(raw:unknown):StaffOnboardingInput{
  if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid profile');
  const obj=raw as Record<string,unknown>;
  const keys=['expectedRevision','displayName','locale','bylineRequested','acknowledgedVersion','confirmed'];
  if(Object.keys(obj).length!==keys.length||!keys.every(k=>Object.prototype.hasOwnProperty.call(obj,k)))
    throw Error('Invalid fields');
  const {expectedRevision,displayName,locale,bylineRequested,acknowledgedVersion,confirmed}=obj;
  if(typeof expectedRevision!=='number'||!Number.isSafeInteger(expectedRevision)||expectedRevision<0||
    expectedRevision>=2147483647||typeof displayName!=='string'||displayName.trim().length<2||
    displayName.trim().length>120||/[\u0000-\u001f\u007f-\u009f]/.test(displayName)||
    (locale!=='en'&&locale!=='es')||typeof bylineRequested!=='boolean'||acknowledgedVersion!==1||
    confirmed!==true)throw Error('Invalid profile');
  return {expectedRevision,displayName:displayName.trim(),locale,bylineRequested,acknowledgedVersion,confirmed};
}
