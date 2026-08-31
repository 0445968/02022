'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/db/supabase-client';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale, CurrentUser } from '@/types';
import { resolveRoleLabel } from '@/lib/permissions';

interface AccountSettingsProps {
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser;
}

export function AccountSettings({ dict, locale, user }: AccountSettingsProps) {
  const router = useRouter();
  const [selectedLocale, setSelectedLocale] = useState<Locale>(
    user.profile?.preferredLocale ?? locale
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_locale: selectedLocale })
        .eq('id', user.id);
      if (error) throw error;
      setSaved(true);
      // Navigate to the chosen locale so the UI updates immediately.
      router.push(localizedPath(selectedLocale, '/account'));
      router.refresh();
    } catch {
      setError(dict.common.error);
    } finally {
      setSaving(false);
    }
  }

  const roleKey = resolveRoleLabel(user);
  const roleText =
    roleKey === 'author-editor'
      ? dict.account.roleAuthorEditor
      : roleKey === 'author'
      ? dict.account.roleAuthor
      : roleKey === 'editor'
      ? dict.account.roleEditor
      : dict.account.roleUser;

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="font-headline text-3xl font-bold text-deep">{dict.account.profile}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{dict.account.signedInAs} {user.profile?.name ?? user.email}</p>

      <div className="mt-8 space-y-6">
        {/* Read-only identity */}
        <section className="border border-border bg-white p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-deep">{dict.account.role}</h2>
          <p className="mt-2 text-sm font-medium text-foreground">{roleText}</p>
          {user.profile?.editorialTitle && (
            <>
              <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-deep">{dict.account.editorialTitle}</h3>
              <p className="mt-2 text-sm font-medium text-foreground">{user.profile.editorialTitle}</p>
            </>
          )}
        </section>

        {/* Language preference */}
        <section className="border border-border bg-white p-6">
          <h2 className="text-xs font-bold uppercase tracking-wide text-deep">{dict.account.language}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{dict.home.comingSoonDesc}</p>

          <fieldset className="mt-4 space-y-2" disabled={saving}>
            <legend className="sr-only">{dict.account.language}</legend>
            {(['en', 'es'] as Locale[]).map((l) => (
              <label
                key={l}
                className="flex cursor-pointer items-center gap-3 border border-border p-3 transition-colors hover:bg-surface-muted has-[:checked]:border-primary has-[:checked]:bg-primary/5"
              >
                <input
                  type="radio"
                  name="locale"
                  value={l}
                  checked={selectedLocale === l}
                  onChange={() => setSelectedLocale(l)}
                  className="h-4 w-4 accent-primary"
                />
                <span className="text-sm font-medium text-foreground">
                  {l === 'en' ? dict.account.english : dict.account.spanish}
                </span>
              </label>
            ))}
          </fieldset>

          {saved && (
            <p role="status" className="mt-3 text-sm text-live">
              {dict.account.languageSaved}
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-breaking">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedLocale === (user.profile?.preferredLocale ?? locale)}
            className="mt-4 inline-flex h-10 items-center bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          >
            {saving ? dict.common.loading : dict.account.saveLanguage}
          </button>
        </section>
      </div>
    </div>
  );
}
