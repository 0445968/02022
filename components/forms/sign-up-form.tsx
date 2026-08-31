'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { Mail, Lock, User, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/db/supabase-client';
import { signUpSchema, type SignUpValues } from '@/lib/validation/schemas';
import { makeLocalizedResolver } from '@/lib/validation/resolver';
import { localizedPath } from '@/lib/i18n/config';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { Locale } from '@/types';

interface SignUpFormProps {
  dict: Dictionary;
  locale: Locale;
}

export function SignUpForm({ dict, locale }: SignUpFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: makeLocalizedResolver(signUpSchema, dict.auth.errors),
  });

  async function onSubmit(values: SignUpValues) {
    setServerError(null);
    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: { name: values.name },
        },
      });
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('already') || msg.includes('exists') || msg.includes('registered')) {
          setServerError(dict.auth.errors.emailExists);
        } else if (msg.includes('password')) {
          setServerError(dict.auth.errors.weakPassword);
        } else {
          setServerError(dict.auth.errors.generic);
        }
        setIsSubmitting(false);
        return;
      }
      // After signup, update the profile name (the trigger created the row).
      const { data: userData } = await supabase.auth.getUser();
      if (userData.user) {
        await supabase
          .from('profiles')
          .update({ name: values.name })
          .eq('id', userData.user.id);
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
        <label htmlFor="name" className="text-sm font-semibold text-deep">
          {dict.auth.name}
        </label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="name"
            type="text"
            autoComplete="name"
            {...register('name')}
            className="h-11 w-full border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
          />
        </div>
        {errors.name && (
          <p id="name-error" className="text-xs text-breaking">
            {errors.name.message}
          </p>
        )}
      </div>

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
            autoComplete="new-password"
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

      <div className="space-y-1.5">
        <label htmlFor="confirmPassword" className="text-sm font-semibold text-deep">
          {dict.auth.confirmPassword}
        </label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <input
            id="confirmPassword"
            type="password"
            autoComplete="new-password"
            {...register('confirmPassword')}
            className="h-11 w-full border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
            aria-invalid={!!errors.confirmPassword}
            aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
          />
        </div>
        {errors.confirmPassword && (
          <p id="confirm-error" className="text-xs text-breaking">
            {errors.confirmPassword.message}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex h-11 w-full items-center justify-center gap-2 bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        {isSubmitting ? dict.auth.signingUp : dict.auth.signUpButton}
        {!isSubmitting && <ArrowRight className="h-4 w-4" aria-hidden />}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.haveAccount}{' '}
        <Link
          href={localizedPath(locale, '/auth/sign-in')}
          className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {dict.auth.signInLink}
        </Link>
      </p>
    </form>
  );
}
