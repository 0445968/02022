'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-client';
import { signInSchema, type SignInValues } from '@/lib/validation/schemas';
import { makeLocalizedResolver } from '@/lib/validation/resolver';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/types';

interface SignInFormProps {
  dict: Dictionary;
  locale: Locale;
}

export function SignInForm({ dict, locale }: SignInFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: makeLocalizedResolver(signInSchema, dict.auth.errors),
  });

  async function onSubmit(values: SignInValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });
      if (error) {
        const message =
          error.message.toLowerCase().includes('invalid') ||
          error.message.toLowerCase().includes('credentials')
            ? dict.auth.errors.invalidCredentials
            : dict.auth.errors.generic;
        setServerError(message);
        setIsSubmitting(false);
        return;
      }
      router.push(localizedPath(locale, '/'));
      router.refresh();
    } catch {
      setServerError(dict.auth.errors.generic);
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      {serverError && (
        <div
          role="alert"
          className="border border-breaking/30 bg-breaking/5 px-4 py-3 text-sm text-breaking"
        >
          {serverError}
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="email" className="text-sm font-semibold text-deep">
          {dict.auth.email}
        </label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register('email')}
            className="h-11 w-full border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'email-error' : undefined}
          />
        </div>
        {errors.email && (
          <p id="email-error" className="text-xs text-breaking">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="password" className="text-sm font-semibold text-deep">
          {dict.auth.password}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register('password')}
            className="h-11 w-full border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
            aria-describedby={errors.password ? 'password-error' : undefined}
          />
        </div>
        {errors.password && (
          <p id="password-error" className="text-xs text-breaking">
            {errors.password.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {isSubmitting ? dict.auth.signingIn : dict.auth.signInButton}
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden />}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.noAccount}{' '}
        <Link
          href={localizedPath(locale, '/auth/sign-up')}
          className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {dict.auth.createOne}
        </Link>
      </p>
    </form>
  );
}
