'use client';

import {
  ExternalLink,
  Loader2,
  Plus,
  Power,
  Trash2,
  X,
} from 'lucide-react';

import {
  useMemo,
  useState,
} from 'react';

import type {
  BreakingNewsItem,
  FrontPageStoryOption,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

interface BreakingNewsEditorProps {
  locale: Locale;
  items: BreakingNewsItem[];
  stories: FrontPageStoryOption[];
  onChanged?: () => void;
}

interface DraftState {
  headline: string;
  storyId: string;
  externalUrl: string;
  active: boolean;
}

const EMPTY_DRAFT: DraftState = {
  headline: '',
  storyId: '',
  externalUrl: '',
  active: true,
};

export function BreakingNewsEditor({
  locale,
  items,
  stories,
  onChanged,
}: BreakingNewsEditorProps) {
  const [
    draft,
    setDraft,
  ] = useState<DraftState>(
    EMPTY_DRAFT
  );

  const [
    creating,
    setCreating,
  ] = useState(false);

  const [
    busyId,
    setBusyId,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const publishedStories =
    useMemo(
      () =>
        [...stories].sort(
          (a, b) => {
            const aDate =
              a.publishedAt
                ? new Date(
                    a.publishedAt
                  ).getTime()
                : 0;

            const bDate =
              b.publishedAt
                ? new Date(
                    b.publishedAt
                  ).getTime()
                : 0;

            return (
              bDate -
              aDate
            );
          }
        ),
      [stories]
    );

  async function createItem() {
    if (creating) {
      return;
    }

    const headline =
      draft.headline.trim();

    if (!headline) {
      setError(
        locale === 'es'
          ? 'Escribe un titular.'
          : 'Enter a headline.'
      );

      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response =
        await fetch(
          '/api/front-page/breaking-news',
          {
            method: 'POST',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                {
                  headline,

                  storyId:
                    draft.storyId ||
                    null,

                  externalUrl:
                    draft.externalUrl.trim() ||
                    null,

                  active:
                    draft.active,
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

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (locale === 'es'
              ? 'No se pudo crear la alerta.'
              : 'Unable to create breaking-news alert.')
        );
      }

      setDraft(
        EMPTY_DRAFT
      );

      onChanged?.();
    } catch (
      createError
    ) {
      console.error(
        'Breaking-news create failed:',
        createError
      );

      setError(
        createError instanceof
          Error
          ? createError.message
          : locale === 'es'
            ? 'No se pudo crear la alerta.'
            : 'Unable to create breaking-news alert.'
      );
    } finally {
      setCreating(false);
    }
  }

  async function toggleItem(
    item: BreakingNewsItem
  ) {
    if (busyId) {
      return;
    }

    setBusyId(item.id);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/front-page/breaking-news/${item.id}`,
          {
            method: 'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                {
                  active:
                    !item.active,
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

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (locale === 'es'
              ? 'No se pudo actualizar la alerta.'
              : 'Unable to update breaking-news alert.')
        );
      }

      onChanged?.();
    } catch (
      updateError
    ) {
      console.error(
        'Breaking-news update failed:',
        updateError
      );

      setError(
        updateError instanceof
          Error
          ? updateError.message
          : locale === 'es'
            ? 'No se pudo actualizar la alerta.'
            : 'Unable to update breaking-news alert.'
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteItem(
    item: BreakingNewsItem
  ) {
    if (busyId) {
      return;
    }

    const confirmed =
      window.confirm(
        locale === 'es'
          ? '¿Eliminar esta alerta de última hora?'
          : 'Delete this breaking-news alert?'
      );

    if (!confirmed) {
      return;
    }

    setBusyId(item.id);
    setError(null);

    try {
      const response =
        await fetch(
          `/api/front-page/breaking-news/${item.id}`,
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

      if (!response.ok) {
        throw new Error(
          data?.error ??
            (locale === 'es'
              ? 'No se pudo eliminar la alerta.'
              : 'Unable to delete breaking-news alert.')
        );
      }

      onChanged?.();
    } catch (
      deleteError
    ) {
      console.error(
        'Breaking-news deletion failed:',
        deleteError
      );

      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : locale === 'es'
            ? 'No se pudo eliminar la alerta.'
            : 'Unable to delete breaking-news alert.'
      );
    } finally {
      setBusyId(null);
    }
  }

  function linkedStoryLabel(
    item: BreakingNewsItem
  ) {
    if (!item.story) {
      return null;
    }

    return item.story.headline;
  }

  return (
    <div className="space-y-6">
      <section
        className="
          rounded-xl
          border
          border-border
          bg-white
        "
      >
        <div
          className="
            border-b
            border-border
            px-5
            py-4
          "
        >
          <p
            className="
              text-[10px]
              font-semibold
              uppercase
              tracking-[0.18em]
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Nueva alerta'
              : 'New Alert'}
          </p>

          <h2
            className="
              mt-1
              font-headline
              text-lg
              font-bold
              text-deep
            "
          >
            {locale === 'es'
              ? 'Crear última hora'
              : 'Create Breaking News'}
          </h2>

          <p
            className="
              mt-1
              max-w-2xl
              text-sm
              leading-6
              text-muted-foreground
            "
          >
            {locale === 'es'
              ? 'Publica una alerta breve y enlázala a una historia o a una URL externa.'
              : 'Publish a short alert and link it to a story or an external URL.'}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <div
              role="alert"
              className="
                rounded-lg
                border
                border-breaking/20
                bg-breaking/5
                px-3
                py-2
                text-sm
                text-breaking
              "
            >
              {error}
            </div>
          )}

          <div>
            <label
              htmlFor="breaking-headline"
              className="
                text-xs
                font-semibold
                text-deep
              "
            >
              {locale === 'es'
                ? 'Titular'
                : 'Headline'}
            </label>

            <input
              id="breaking-headline"
              value={
                draft.headline
              }
              onChange={(
                event
              ) =>
                setDraft(
                  (current) => ({
                    ...current,
                    headline:
                      event.target
                        .value,
                  })
                )
              }
              maxLength={240}
              placeholder={
                locale === 'es'
                  ? 'Ej. Última hora: nueva decisión afecta el servicio de ferry'
                  : 'e.g. Breaking: new decision affects ferry service'
              }
              className="
                mt-2
                h-11
                w-full
                rounded-lg
                border
                border-border
                bg-white
                px-3
                text-sm
                text-foreground
                placeholder:text-muted-foreground
                focus:border-primary
                focus:outline-none
                focus:ring-2
                focus:ring-primary/10
              "
            />

            <div
              className="
                mt-1
                flex
                justify-end
                text-[10px]
                text-muted-foreground
              "
            >
              {
                draft.headline
                  .length
              }
              /240
            </div>
          </div>

          <div
            className="
              grid
              gap-4
              lg:grid-cols-2
            "
          >
            <div>
              <label
                htmlFor="breaking-story"
                className="
                  text-xs
                  font-semibold
                  text-deep
                "
              >
                {locale === 'es'
                  ? 'Historia vinculada'
                  : 'Linked Story'}
              </label>

              <select
                id="breaking-story"
                value={
                  draft.storyId
                }
                onChange={(
                  event
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      storyId:
                        event.target
                          .value,
                    })
                  )
                }
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-3
                  text-sm
                  text-foreground
                  focus:border-primary
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/10
                "
              >
                <option value="">
                  {locale === 'es'
                    ? 'Sin historia vinculada'
                    : 'No linked story'}
                </option>

                {publishedStories.map(
                  (
                    story
                  ) => (
                    <option
                      key={
                        story.id
                      }
                      value={
                        story.id
                      }
                    >
                      {
                        story.headline
                      }
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="breaking-url"
                className="
                  text-xs
                  font-semibold
                  text-deep
                "
              >
                {locale === 'es'
                  ? 'URL externa'
                  : 'External URL'}
              </label>

              <input
                id="breaking-url"
                type="url"
                value={
                  draft.externalUrl
                }
                onChange={(
                  event
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      externalUrl:
                        event.target
                          .value,
                    })
                  )
                }
                placeholder="https://"
                className="
                  mt-2
                  h-11
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-3
                  text-sm
                  text-foreground
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:outline-none
                  focus:ring-2
                  focus:ring-primary/10
                "
              />
            </div>
          </div>

          <div
            className="
              flex
              flex-col
              gap-4
              border-t
              border-border
              pt-4
              sm:flex-row
              sm:items-center
              sm:justify-between
            "
          >
            <label
              className="
                inline-flex
                cursor-pointer
                items-center
                gap-3
              "
            >
              <input
                type="checkbox"
                checked={
                  draft.active
                }
                onChange={(
                  event
                ) =>
                  setDraft(
                    (current) => ({
                      ...current,
                      active:
                        event.target
                          .checked,
                    })
                  )
                }
                className="
                  h-4
                  w-4
                  rounded
                  border-border
                  text-primary
                  focus:ring-primary
                "
              />

              <span>
                <span
                  className="
                    block
                    text-xs
                    font-semibold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'Activar inmediatamente'
                    : 'Activate immediately'}
                </span>

                <span
                  className="
                    block
                    text-[11px]
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'La alerta será visible cuando la portada pública use este módulo.'
                    : 'The alert will be visible when the public homepage uses this module.'}
                </span>
              </span>
            </label>

            <button
              type="button"
              disabled={
                creating
              }
              onClick={
                createItem
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-primary
                px-4
                text-sm
                font-semibold
                text-white
                transition-opacity
                hover:opacity-90
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-primary/30
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              {creating ? (
                <Loader2
                  className="
                    h-4
                    w-4
                    animate-spin
                  "
                  aria-hidden
                />
              ) : (
                <Plus
                  className="h-4 w-4"
                  aria-hidden
                />
              )}

              {locale === 'es'
                ? 'Crear alerta'
                : 'Create Alert'}
            </button>
          </div>
        </div>
      </section>

      <section
        className="
          rounded-xl
          border
          border-border
          bg-white
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-4
            border-b
            border-border
            px-5
            py-4
          "
        >
          <div>
            <h2
              className="
                font-headline
                text-lg
                font-bold
                text-deep
              "
            >
              {locale === 'es'
                ? 'Alertas existentes'
                : 'Existing Alerts'}
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              {items.length}{' '}
              {locale === 'es'
                ? items.length ===
                  1
                  ? 'alerta'
                  : 'alertas'
                : items.length ===
                    1
                  ? 'alert'
                  : 'alerts'}
            </p>
          </div>
        </div>

        {items.length >
        0 ? (
          <div className="divide-y divide-border">
            {items.map(
              (item) => {
                const busy =
                  busyId ===
                  item.id;

                return (
                  <article
                    key={
                      item.id
                    }
                    className="
                      px-5
                      py-4
                    "
                  >
                    <div
                      className="
                        flex
                        flex-col
                        gap-4
                        lg:flex-row
                        lg:items-start
                        lg:justify-between
                      "
                    >
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
                          <span
                            className={`
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              px-2
                              py-1
                              text-[10px]
                              font-bold
                              uppercase
                              tracking-[0.12em]

                              ${
                                item.active
                                  ? 'bg-breaking/10 text-breaking'
                                  : 'bg-surface-muted text-muted-foreground'
                              }
                            `}
                          >
                            <span
                              className={`
                                h-1.5
                                w-1.5
                                rounded-full

                                ${
                                  item.active
                                    ? 'bg-breaking'
                                    : 'bg-muted-foreground/40'
                                }
                              `}
                            />

                            {item.active
                              ? locale ===
                                'es'
                                ? 'Activa'
                                : 'Active'
                              : locale ===
                                  'es'
                                ? 'Inactiva'
                                : 'Inactive'}
                          </span>

                          {item.story && (
                            <span
                              className="
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.1em]
                                text-primary
                              "
                            >
                              {locale === 'es'
                                ? 'Historia'
                                : 'Story'}
                            </span>
                          )}

                          {item.externalUrl && (
                            <span
                              className="
                                text-[10px]
                                font-semibold
                                uppercase
                                tracking-[0.1em]
                                text-muted-foreground
                              "
                            >
                              {locale === 'es'
                                ? 'Enlace externo'
                                : 'External link'}
                            </span>
                          )}
                        </div>

                        <h3
                          className="
                            mt-2
                            font-headline
                            text-lg
                            font-bold
                            leading-6
                            text-deep
                          "
                        >
                          {
                            item.headline
                          }
                        </h3>

                        <div
                          className="
                            mt-2
                            space-y-1
                            text-xs
                            text-muted-foreground
                          "
                        >
                          {linkedStoryLabel(
                            item
                          ) && (
                            <p>
                              {locale ===
                              'es'
                                ? 'Vinculada a: '
                                : 'Linked to: '}
                              <span
                                className="
                                  font-medium
                                  text-deep
                                "
                              >
                                {linkedStoryLabel(
                                  item
                                )}
                              </span>
                            </p>
                          )}

                          {item.externalUrl && (
                            <a
                              href={
                                item.externalUrl
                              }
                              target="_blank"
                              rel="noreferrer"
                              className="
                                inline-flex
                                items-center
                                gap-1
                                text-primary
                                hover:underline
                              "
                            >
                              {
                                item.externalUrl
                              }

                              <ExternalLink
                                className="h-3 w-3"
                                aria-hidden
                              />
                            </a>
                          )}
                        </div>
                      </div>

                      <div
                        className="
                          flex
                          shrink-0
                          flex-wrap
                          gap-2
                        "
                      >
                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            toggleItem(
                              item
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
                          {busy ? (
                            <Loader2
                              className="
                                h-3.5
                                w-3.5
                                animate-spin
                              "
                            />
                          ) : item.active ? (
                            <X
                              className="h-3.5 w-3.5"
                              aria-hidden
                            />
                          ) : (
                            <Power
                              className="h-3.5 w-3.5"
                              aria-hidden
                            />
                          )}

                          {item.active
                            ? locale ===
                              'es'
                              ? 'Desactivar'
                              : 'Deactivate'
                            : locale ===
                                'es'
                              ? 'Activar'
                              : 'Activate'}
                        </button>

                        <button
                          type="button"
                          disabled={
                            busy
                          }
                          onClick={() =>
                            deleteItem(
                              item
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
                            ? 'Eliminar'
                            : 'Delete'}
                        </button>
                      </div>
                    </div>
                  </article>
                );
              }
            )}
          </div>
        ) : (
          <div
            className="
              px-5
              py-10
              text-center
            "
          >
            <p
              className="
                font-semibold
                text-deep
              "
            >
              {locale === 'es'
                ? 'No hay alertas todavía'
                : 'No alerts yet'}
            </p>

            <p
              className="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              {locale === 'es'
                ? 'Crea la primera alerta usando el formulario de arriba.'
                : 'Create the first alert using the form above.'}
            </p>
          </div>
        )}
      </section>
    </div>
  );
}