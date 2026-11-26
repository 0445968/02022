/**
 * Explicit user-operated, synthetic REVIEW ONLY Auth setup. Never run in CI.
 * Reads the isolated project's legacy service_role JWT from a local environment
 * variable. Does not log tokens or credentials; writes passwords only to a
 * new owner-readable file outside the repository. No production identities.
 */
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {openSync,closeSync,writeFileSync} from 'node:fs';
import {homedir} from 'node:os';
import {join} from 'node:path';
const ref='mfyxyyclygeeklvbhawi';
const origin='https://'+ref+'.supabase.co';
assert.equal(process.argv[2],'--create-review-users','Explicit review-only confirmation required');
assert.ok(!process.env.CI,'Interactive local execution only');
const secret=process.env.CT15_REVIEW_SERVICE_ROLE_KEY;
assert.ok(secret,'Set CT15_REVIEW_SERVICE_ROLE_KEY locally');
const pieces=secret.split('.');
assert.equal(pieces.length,3,'Use the review project legacy service_role JWT');
let payload;
try{payload=JSON.parse(Buffer.from(pieces[1],'base64url').toString('utf8'));}catch{throw Error('Invalid review service-role credential');}
assert.ok(payload.role==='service_role'&&payload.ref===ref,'Credential must belong to Clear Talks Review, never production');
const roles=['owner','editor','staff_writer','freelancer','moderator','reader','legacy'];
const accounts=roles.map(role=>({role,email:'ct15-'+role+'@example.test',password:'Ct15!'+randomBytes(24).toString('hex')}));
const headers={'apikey':secret,'Authorization':'Bearer '+secret,'Content-Type':'application/json'};
const list=await fetch(origin+'/auth/v1/admin/users?page=1&per_page=50',{headers,signal:AbortSignal.timeout(15000)});
assert.ok(list.ok,'Review Auth admin access unavailable (HTTP '+list.status+')');
const existing=await list.json();
assert.ok(Array.isArray(existing.users)&&existing.users.length===0,'Review project must have zero existing Auth users; do not overwrite identities');
const filename=join(homedir(),'clear-talks-review-credentials.json');
const fd=openSync(filename,'wx',0o600);
try{writeFileSync(fd,JSON.stringify({project:ref,accounts},null,2)+'\n');}finally{closeSync(fd);}
let created=0;
for(const account of accounts){
 const response=await fetch(origin+'/auth/v1/admin/users',{method:'POST',headers,signal:AbortSignal.timeout(20000),body:JSON.stringify({email:account.email,password:account.password,email_confirm:true})});
 if(!response.ok)throw Error('Review Auth creation stopped after '+created+' successful accounts; HTTP '+response.status+'. Credentials already stored locally. Do not rerun or delete accounts without inspecting.');
 const user=await response.json();
 assert.ok(user.id&&user.email===account.email&&user.email_confirmed_at,'Expected confirmed synthetic review account');
 created++;
 console.log('Created review account '+account.role+' ('+created+'/'+accounts.length+')');
}
console.log('Created '+created+' disposable verified users. Local credentials: '+filename);
console.log('Do not upload this file, paste its contents, or commit it. Tell ChatGPT only that the script succeeded.');
