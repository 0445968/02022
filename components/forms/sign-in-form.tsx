'use client';

import {
  useState,
} from 'react';

import Link from 'next/link';

import {
  useRouter,
  useSearchParams,
} from 'next/navigation';

import {
  useForm,
} from 'react-hook-form';

import {
  ArrowRight,
  Lock,
  Mail,
} from 'lucide-react';

import {
  createClient,
} from '@/lib/db/supabase-client';

import {
  localizedPath,
} from '@/lib/i18n/config';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import {
  makeLocalizedResolver,
} from '@/lib/validation/resolver';

import {
  signInSchema,
  type SignInValues,
} from '@/lib/validation/schemas';

import type {
  Locale,
} from '@/types';

interface SignInFormProps {
  dict: Dictionary;
  locale: Locale;
}

function resolveSafeNextPath(
  value: string | null,
  fallback: string
): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return fallback;
  }

  try {
    const baseUrl =
      'https://west-island-times.local';

    const destination =
      new URL(
        value,
        baseUrl
      );

    if (
      destination.origin !==
      baseUrl
    ) {
      return fallback;
    }

    /*
     * Authentication redirects should never navigate
     * directly into API or framework-internal routes.
     */
    if (
      destination.pathname ===
        '/api' ||
      destination.pathname.startsWith(
        '/api/'
      ) ||
      destination.pathname.startsWith(
        '/_next/'
      )
    ) {
      return fallback;
    }

    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return fallback;
  }
}

export function SignInForm({
  dict,
  locale,
}: SignInFormProps) {
  const router =
    useRouter();

  const searchParams =
    useSearchParams();

  const [
    serverError,
    setServerError,
  ] = useState<string | null>(
    null
  );

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const {
    register,
    handleSubmit,
    formState: {
      errors,
    },
  } = useForm<SignInValues>({
    resolver:
      makeLocalizedResolver(
        signInSchema,
        dict.auth.errors
      ),
  });

  async function onSubmit(
    values: SignInValues
  ) {
    setServerError(null);
    setIsSubmitting(true);

    try {
      const supabase =
        createClient();

      const {
        error,
      } =
        await supabase.auth.signInWithPassword(
          {
            email:
              values.email,

            password:
              values.password,
          }
        );

      if (error) {
        const normalizedMessage =
          error.message.toLowerCase();

        const message =
          normalizedMessage.includes(
            'invalid'
          ) ||
          normalizedMessage.includes(
            'credentials'
          )
            ? dict.auth.errors
                .invalidCredentials
            : dict.auth.errors
                .generic;

        setServerError(
          message
        );

        setIsSubmitting(
          false
        );

        return;
      }

      const fallback =
        localizedPath(
          locale,
          '/'
        );

      const destination =
        resolveSafeNextPath(
          searchParams.get(
            'next'
          ),
          fallback
        );

      router.replace(
        destination
      );

      router.refresh();
    } catch {
      setServerError(
        dict.auth.errors.generic
      );

      setIsSubmitting(
        false
      );
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit(
          onSubmit
        )
      }
      className="space-y-5"
      noValidate
    >
      {serverError ? (
        <div
          role="alert"
          className="rounded-md border border-breaking/30 bg-breaking/5 px-4 py-3 text-sm text-breaking"
        >
          {serverError}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="email"
          className="text-sm font-semibold text-deep"
        >
          {dict.auth.email}
        </label>

        <div className="relative">
          <Mail
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />

          <input
            id="email"
            type="email"
            autoComplete="email"
            {...register(
              'email'
            )}
            className="h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="you@example.com"
            aria-invalid={
              Boolean(
                errors.email
              )
            }
            aria-describedby={
              errors.email
                ? 'email-error'
                : undefined
            }
          />
        </div>

        {errors.email ? (
          <p
            id="email-error"
            className="text-xs text-breaking"
          >
            {
              errors.email
                .message
            }
          </p>
        ) : null}
      </div>

      <div className="space-y-1.5">
        <label
          htmlFor="password"
          className="text-sm font-semibold text-deep"
        >
          {dict.auth.password}
        </label>

        <div className="relative">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />

          <input
            id="password"
            type="password"
            autoComplete="current-password"
            {...register(
              'password'
            )}
            className="h-11 w-full rounded-md border border-border bg-white pl-10 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="••••••••"
            aria-invalid={
              Boolean(
                errors.password
              )
            }
            aria-describedby={
              errors.password
                ? 'password-error'
                : undefined
            }
          />
        </div>

        {errors.password ? (
          <p
            id="password-error"
            className="text-xs text-breaking"
          >
            {
              errors.password
                .message
            }
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={
          isSubmitting
        }
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-primary text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting
          ? dict.auth.signingIn
          : dict.auth
              .signInButton}

        {!isSubmitting ? (
          <ArrowRight
            aria-hidden="true"
            className="h-4 w-4"
          />
        ) : null}
      </button>

      <p className="text-center text-sm text-muted-foreground">
        {dict.auth.noAccount}{' '}

        <Link
          href={localizedPath(
            locale,
            '/auth/sign-up'
          )}
          className="font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:underline"
        >
          {
            dict.auth
              .createOne
          }
        </Link>
      </p>
    </form>
  );
}