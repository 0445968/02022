'use client';

import {
  useState,
} from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Loader2,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  Locale,
} from '@/types';

interface NewStoryFormProps {
  dict: Dictionary;
  locale: Locale;
  defaultAuthorId: string;
}

export function NewStoryForm({
  dict,
  locale,
  defaultAuthorId,
}: NewStoryFormProps) {
  const router = useRouter();

  const [
    headline,
    setHeadline,
  ] = useState('');

  const [
    language,
    setLanguage,
  ] = useState<
    'en' | 'es'
  >('en');

  const [
    isCreating,
    setIsCreating,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleCreate(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedHeadline =
      headline.trim();

    if (!trimmedHeadline) {
      setError(
        locale === 'es'
          ? 'Ingresa un titular antes de crear la historia.'
          : 'Enter a headline before creating the story.'
      );

      return;
    }

    if (isCreating) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const response =
        await fetch(
          '/api/stories/create',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify({
              headline:
                trimmedHeadline,

              language,

              authorId:
                defaultAuthorId,
            }),
          }
        );

      const data =
        await response
          .json()
          .catch(() => null);

      if (
        !response.ok ||
        !data?.id
      ) {
        throw new Error(
          data?.error ??
            'Unable to create story.'
        );
      }

      router.push(
        `/newsroom/stories/${data.id}/edit`
      );
    } catch (
      createError
    ) {
      console.error(
        'Create story failed:',
        createError
      );

      setError(
        createError instanceof
          Error
          ? createError.message
          : dict.common.errorDesc
      );

      setIsCreating(false);
    }
  }

  const canCreate =
    headline.trim().length >
      0 &&
    !isCreating;

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/newsroom/stories"
        className="
          inline-flex
          items-center
          gap-1.5
          text-sm
          font-medium
          text-muted-foreground
          transition-colors
          hover:text-primary
          focus-visible:outline-none
          focus-visible:underline
        "
      >
        <ArrowLeft
          className="h-4 w-4"
          aria-hidden
        />

        {
          dict.story
            .backToStories
        }
      </Link>

      <div className="mt-6">
        <h1
          className="
            font-headline
            text-3xl
            font-bold
            text-deep
          "
        >
          {
            dict.story
              .newStory
          }
        </h1>

        <p
          className="
            mt-2
            max-w-xl
            text-sm
            leading-6
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Define el titular y el idioma antes de crear el borrador. Podrás seguir editando todo dentro del editor.'
            : 'Set the headline and language before creating the draft. You can continue editing everything inside the story editor.'}
        </p>
      </div>

      <form
        onSubmit={
          handleCreate
        }
        className="
          mt-8
          space-y-6
          border
          border-border
          bg-white
          p-6
        "
      >
        {error && (
          <div
            role="alert"
            className="
              border
              border-breaking/30
              bg-breaking/5
              px-4
              py-3
              text-sm
              text-breaking
            "
          >
            {error}
          </div>
        )}

        {/* Headline */}
        <div className="space-y-1.5">
          <label
            htmlFor="headline"
            className="
              text-sm
              font-semibold
              text-deep
            "
          >
            {
              dict.stories
                .columns
                .headline
            }
          </label>

          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(
              event
            ) => {
              setHeadline(
                event.target
                  .value
              );

              if (error) {
                setError(null);
              }
            }}
            placeholder={
              dict.story
                .headlinePlaceholder
            }
            disabled={
              isCreating
            }
            autoFocus
            className="
              h-12
              w-full
              border
              border-border
              bg-white
              px-3
              font-headline
              text-lg
              text-foreground
              placeholder:font-interface
              placeholder:text-base
              placeholder:text-muted-foreground
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:bg-surface-muted
              disabled:opacity-70
            "
          />
        </div>

        {/* Language */}
        <div className="space-y-1.5">
          <label
            htmlFor="language"
            className="
              text-sm
              font-semibold
              text-deep
            "
          >
            {
              dict.story
                .language
            }
          </label>

          <select
            id="language"
            value={language}
            onChange={(
              event
            ) =>
              setLanguage(
                event.target
                  .value as
                  | 'en'
                  | 'es'
              )
            }
            disabled={
              isCreating
            }
            className="
              h-10
              w-full
              border
              border-border
              bg-white
              px-3
              text-sm
              text-foreground
              focus:border-primary
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:bg-surface-muted
              disabled:opacity-70
            "
          >
            <option value="en">
              {
                dict.common
                  .languageEN
              }
            </option>

            <option value="es">
              {
                dict.common
                  .languageES
              }
            </option>
          </select>
        </div>

        {/* Actions */}
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-t
            border-border
            pt-5
          "
        >
          <p className="text-xs leading-5 text-muted-foreground">
            {locale === 'es'
              ? 'El borrador se guardará automáticamente después de crearlo.'
              : 'The draft will autosave once you enter the editor.'}
          </p>

          <button
            type="submit"
            disabled={
              !canCreate
            }
            className="
              inline-flex
              h-10
              shrink-0
              items-center
              justify-center
              gap-2
              bg-primary
              px-5
              text-sm
              font-semibold
              text-white
              transition-colors
              hover:bg-primary/90
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            {isCreating && (
              <Loader2
                className="h-4 w-4 animate-spin"
                aria-hidden
              />
            )}

            {isCreating
              ? locale ===
                  'es'
                ? 'Creando…'
                : 'Creating…'
              : locale ===
                  'es'
                ? 'Crear historia'
                : 'Create Story'}
          </button>
        </div>
      </form>
    </div>
  );
}