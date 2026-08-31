/**
 * Simply Raizal — seed script
 *
 * Seeds the Executive Editor (Peter Bent Archbold) and a small set of
 * development users. Run after the database migration is applied.
 *
 * Usage (from the project root):
 *   node scripts/seed.mjs
 *
 * Requires SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment
 * (already provisioned in this project's .env / host environment).
 *
 * Seeded accounts:
 *   peter@simplyraizal.com   / SimplyRaizal2026!   (author + editor, "Executive Editor")
 *   reader@simplyraizal.com  / ReaderDemo2026!     (regular user)
 *   author@simplyraizal.com  / AuthorDemo2026!     (author only)
 *
 * This script is idempotent: re-running it will not duplicate users.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'These are provisioned automatically in Bolt environments.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const SEED_USERS = [
  {
    email: 'peter@simplyraizal.com',
    password: 'SimplyRaizal2026!',
    name: 'Peter Bent Archbold',
    is_author: true,
    is_editor: true,
    editorial_title: 'Executive Editor',
    preferred_locale: 'en',
  },
  {
    email: 'reader@simplyraizal.com',
    password: 'ReaderDemo2026!',
    name: 'Demo Reader',
    is_author: false,
    is_editor: false,
    editorial_title: null,
    preferred_locale: 'en',
  },
  {
    email: 'author@simplyraizal.com',
    password: 'AuthorDemo2026!',
    name: 'Demo Author',
    is_author: true,
    is_editor: false,
    editorial_title: null,
    preferred_locale: 'es',
  },
];

async function seed() {
  console.log('Seeding Simply Raizal users…\n');

  for (const u of SEED_USERS) {
    // Check if the auth user already exists.
    const { data: existing } = await supabase.auth.admin.listUsers();
    const found = existing?.users?.find((x) => x.email === u.email);

    let userId = found?.id;

    if (!userId) {
      const { data, error } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: { name: u.name },
      });
      if (error) {
        console.error(`  ✗ Failed to create ${u.email}: ${error.message}`);
        continue;
      }
      userId = data.user.id;
      console.log(`  + Created auth user: ${u.email}`);
    } else {
      console.log(`  • Already exists:    ${u.email}`);
    }

    // Upsert the profile row (service role bypasses RLS for role columns).
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert(
        {
          id: userId,
          name: u.name,
          email: u.email,
          is_author: u.is_author,
          is_editor: u.is_editor,
          editorial_title: u.editorial_title,
          preferred_locale: u.preferred_locale,
        },
        { onConflict: 'id' }
      );

    if (profileError) {
      console.error(`  ✗ Failed to upsert profile for ${u.email}: ${profileError.message}`);
    } else {
      console.log(
        `  ✓ Profile:           ${u.name} ` +
          `(author=${u.is_author}, editor=${u.is_editor})`
      );
    }
  }

  console.log('\nDone.');
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
