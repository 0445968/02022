import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../supabase/migrations/20261124150021_ct04a_staff_invitations.sql',import.meta.url),'utf8');

test('CT04a lifecycle RLS and server-only RPC privileges',()=>{
  assert.match(source,/alter table public\.staff_invitations enable row level security/);
  assert.match(source,/revoke all on public\.staff_invitations from public,anon,authenticated,service_role/);
  assert.match(source,/staff_list_invitations\(uuid,integer\) from public,anon,authenticated/);
  assert.doesNotMatch(source,/security definer/i);
  assert.match(source,/grant select \(id,email,email_confirmed_at,is_anonymous,deleted_at,banned_until\)/);
});
test('CT04a role fingerprint, verified Auth state and deny-first issuer checks',()=>{
  for(const term of ['email_confirmed_at','u.is_anonymous=false','u.deleted_at is null',
    'u.banned_until','staff_invite_owner_allowed','staff_preset_grant_allowed',
    'g.capability_key=\'team.invite\'','o.effect=\'deny\'','preset_fingerprint','sha256',
    "p.role_key<>'owner'"]) assert.ok(source.includes(term),term);
});
test('CT04a activation serializes, rejects reuse and activates only one membership/role',()=>{
  assert.match(source,/pg_advisory_xact_lock\(202611,2302\)/);
  assert.match(source,/where i\.token_hash=p_token_hash for update/);
  assert.match(source,/v_inv\.canceled_at is not null or v_inv\.redeemed_at is not null/);
  assert.match(source,/v_email is distinct from v_inv\.email_normalized/);
  assert.match(source,/insert into public\.staff_memberships/);
  assert.match(source,/insert into public\.staff_member_roles/);
  assert.match(source,/update public\.staff_invitations set redeemed_by/);
});
test('CT04a database invite list and audit never return token hash or full email',()=>{
  const list=source.slice(source.indexOf('create function public.staff_list_invitations'),source.indexOf('revoke all on function public.staff_issue_invitation'));
  assert.match(list,/email_hint text/);
  assert.doesNotMatch(list,/token_hash/);
  assert.match(list,/limit 26/);
  const audit=source.slice(source.indexOf('insert into public.staff_access_audit'),source.indexOf('return new;'));
  assert.doesNotMatch(audit,/email_normalized|token_hash/);
  assert.match(audit,/'approved_by',v_actor/);
});
