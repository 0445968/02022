/**
 * Opt-in, unauthenticated HTTP route smoke test.
 * Requires SMOKE_BASE_URL pointing at an approved preview/local target.
 * Never sends credentials or mutates remote data.
 */
import assert from 'node:assert/strict';

const base = process.env.SMOKE_BASE_URL;
if (!base) {
  console.error('Set SMOKE_BASE_URL to the approved preview/local origin.');
  process.exit(2);
}
const origin = new URL(base);
assert.ok(['http:', 'https:'].includes(origin.protocol));
for (const path of ['/en', '/es']) {
  const res = await fetch(new URL(path, origin), { redirect: 'manual' });
  assert.ok(res.status >= 200 && res.status < 400, `${path} returned ${res.status}`);
  console.log(`${path}: ${res.status}`);
}
const denied = await fetch(new URL('/newsroom/stories', origin), { redirect: 'manual' });
const location = denied.headers.get('location') || '';
assert.ok([301, 302, 303, 307, 308].includes(denied.status), `Newsroom returned ${denied.status}`);
assert.ok(location.includes('/auth/sign-in'), `Expected sign-in redirect, got ${location}`);
console.log('Signed-out newsroom: denied via sign-in redirect');
