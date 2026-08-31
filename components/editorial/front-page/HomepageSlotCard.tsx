'use client';

import {
  Loader2,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

import {
  useState,
} from 'react';

import type {
  HomepageSlotType,
} from '@/lib/db/database.types';

import type {
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

import {
  StoryPicker,
} from './StoryPicker';

interface HomepageSlotCardProps {
  locale: Locale;

  slot: HomepageSlotType;

  label: string;

  description?: string;

  stories: FrontPageStoryOption[];

  placement?: HomepagePlacement | null;

  position?: number;

  categoryId?: string | null;

  userId?: string | null;

  onChanged?: () => void;
}

export function HomepageSlotCard({
  locale,
  slot,
  label,
  description,
  stories,
  placement = null,
  position = 0,
  categoryId = null,
  userId = null,
  onChanged,
}: HomepageSlotCardProps) {
  const [
    pickerOpen,
    setPickerOpen,
  ] = useState(false);

  const [
    currentPlacement,
    setCurrentPlacement,
  ] =
    useState<HomepagePlacement | null>(
      placement
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  async function handleSelect(
    story: FrontPageStoryOption
  ) {
    if (saving) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response =
        await fetch(
          '/api/front-page/placements',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body: JSON.stringify(
              {
                slot,
                storyId:
                  story.id,
                position,
                categoryId,
                userId,
              }
            ),
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok ||
        !data?.placement
      ) {
        throw new Error(
          data?.error ??
            (locale ===
            'es'
              ? 'No se pudo guardar la posición.'
              : 'Unable to save homepage placement.')
        );
      }

      setCurrentPlacement(
        data.placement
      );

      onChanged?.();
    } catch (
      saveError
    ) {
      console.error(
        'Homepage slot save failed:',
        saveError
      );

      setError(
        saveError instanceof
          Error
          ? saveError.message
          : locale ===
              'es'
            ? 'No se pudo guardar la posición.'
            : 'Unable to save homepage placement.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove() {
    if (
      !currentPlacement ||
      saving
    ) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/front-page/placements/${currentPlacement.id}`,
          {
            method:
              'DELETE',
          }
        );

      const data =
        await response
          .json()
          .catch(
            () => null
          );

      if (
        !response.ok
      ) {
        throw new Error(
          data?.error ??
            (locale ===
            'es'
              ? 'No se pudo eliminar la posición.'
              : 'Unable to remove homepage placement.')
        );
      }

      setCurrentPlacement(
        null
      );

      onChanged?.();
    } catch (
      removeError
    ) {
      console.error(
        'Homepage slot removal failed:',
        removeError
      );

      setError(
        removeError instanceof
          Error
          ? removeError.message
          : locale ===
              'es'
            ? 'No se pudo eliminar la posición.'
            : 'Unable to remove homepage placement.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div
        className="
          flex
          h-full
          min-h-[150px]
          flex-col
          rounded-xl
          border
          border-border
          bg-white
          p-4
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-4
          "
        >
          <div>
            <p
              className="
                text-[10px]
                font-semibold
                uppercase
                tracking-[0.16em]
                text-muted-foreground
              "
            >
              {label}
            </p>

            {description && (
              <p
                className="
                  mt-1
                  max-w-sm
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                {
                  description
                }
              </p>
            )}
          </div>

          {saving && (
            <Loader2
              className="
                h-4
                w-4
                shrink-0
                animate-spin
                text-primary
              "
              aria-label={
                locale === 'es'
                  ? 'Guardando'
                  : 'Saving'
              }
            />
          )}
        </div>

        {error && (
          <div
            role="alert"
            className="
              mt-3
              rounded-lg
              border
              border-breaking/20
              bg-breaking/5
              px-3
              py-2
              text-xs
              leading-5
              text-breaking
            "
          >
            {error}
          </div>
        )}

        {currentPlacement ? (
          <div
            className="
              mt-4
              flex
              flex-1
              flex-col
            "
          >
            <div
              className="
                flex
                gap-3
              "
            >
              <div
                className="
                  h-[74px]
                  w-[108px]
                  shrink-0
                  overflow-hidden
                  rounded-lg
                  bg-surface-muted
                "
              >
                {currentPlacement
                  .story
                  .featuredImage ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={
                      currentPlacement
                        .story
                        .featuredImage
                        .url
                    }
                    alt={
                      currentPlacement
                        .story
                        .featuredImage
                        .altText
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                ) : (
                  <div
                    className="
                      flex
                      h-full
                      items-center
                      justify-center
                      px-2
                      text-center
                      text-[9px]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                  >
                    {locale ===
                    'es'
                      ? 'Sin imagen'
                      : 'No image'}
                  </div>
                )}
              </div>

              <div
                className="
                  min-w-0
                  flex-1
                "
              >
                <div
                  className="
                    flex
                    flex-wrap
                    items-center
                    gap-2
                  "
                >
                  {currentPlacement
                    .story
                    .primaryCategory && (
                    <span
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.12em]
                        text-primary
                      "
                    >
                      {locale ===
                      'es'
                        ? currentPlacement
                            .story
                            .primaryCategory
                            .nameEs
                        : currentPlacement
                            .story
                            .primaryCategory
                            .nameEn}
                    </span>
                  )}

                  <span
                    className="
                      text-[10px]
                      font-semibold
                      uppercase
                      tracking-[0.1em]
                      text-muted-foreground
                    "
                  >
                    {currentPlacement.story.language.toUpperCase()}
                  </span>

                  {!currentPlacement.active && (
                    <span
                      className="
                        text-[10px]
                        font-semibold
                        uppercase
                        tracking-[0.1em]
                        text-breaking
                      "
                    >
                      {locale ===
                      'es'
                        ? 'Inactiva'
                        : 'Inactive'}
                    </span>
                  )}
                </div>

                <h3
                  className="
                    mt-1
                    line-clamp-3
                    font-headline
                    text-base
                    font-bold
                    leading-5
                    text-deep
                  "
                >
                  {
                    currentPlacement
                      .story
                      .headline
                  }
                </h3>
              </div>
            </div>

            <div
              className="
                mt-auto
                flex
                flex-wrap
                items-center
                gap-2
                pt-4
              "
            >
              <button
                type="button"
                disabled={
                  saving
                }
                onClick={() =>
                  setPickerOpen(
                    true
                  )
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-3
                  text-xs
                  font-semibold
                  text-deep
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Pencil
                  className="h-3.5 w-3.5"
                  aria-hidden
                />

                {locale ===
                'es'
                  ? 'Cambiar'
                  : 'Change'}
              </button>

              <button
                type="button"
                disabled={
                  saving
                }
                onClick={
                  handleRemove
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-breaking/20
                  bg-white
                  px-3
                  text-xs
                  font-semibold
                  text-breaking
                  transition-colors
                  hover:bg-breaking/5
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-breaking/30
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <Trash2
                  className="h-3.5 w-3.5"
                  aria-hidden
                />

                {locale ===
                'es'
                  ? 'Quitar'
                  : 'Remove'}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={
              saving
            }
            onClick={() =>
              setPickerOpen(
                true
              )
            }
            className="
              mt-4
              flex
              min-h-[96px]
              flex-1
              flex-col
              items-center
              justify-center
              rounded-lg
              border
              border-dashed
              border-border
              px-4
              py-5
              text-center
              transition-colors
              hover:border-primary/50
              hover:bg-primary/[0.025]
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
          >
            <span
              className="
                inline-flex
                h-8
                w-8
                items-center
                justify-center
                rounded-full
                bg-primary/10
                text-primary
              "
            >
              <Plus
                className="h-4 w-4"
                aria-hidden
              />
            </span>

            <span
              className="
                mt-2
                text-xs
                font-semibold
                text-deep
              "
            >
              {locale === 'es'
                ? 'Asignar historia'
                : 'Assign story'}
            </span>

            <span
              className="
                mt-1
                text-[11px]
                leading-4
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Selecciona una historia publicada.'
                : 'Choose a published story.'}
            </span>
          </button>
        )}
      </div>

      <StoryPicker
        open={pickerOpen}
        locale={locale}
        stories={stories}
        selectedStoryId={
          currentPlacement
            ?.story.id ??
          null
        }
        title={label}
        onSelect={
          handleSelect
        }
        onClose={() =>
          setPickerOpen(
            false
          )
        }
      />
    </>
  );
}