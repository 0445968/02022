'use client';

import {
  useMemo,
  useState,
} from 'react';

import {
  Search,
  UserRound,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  EditorialProfile,
  MediaAsset,
} from '@/types/editorial';

import {
  AuthorProfileForm,
  type AuthorProfileFormValues,
} from './AuthorProfileForm';

import {
  AuthorHeadshotPicker,
} from './AuthorHeadshotPicker';

interface AuthorManagerProps {
  authors: EditorialProfile[];
  dict: Dictionary;
  userId: string;
}

function getInitials(
  name: string
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0)
    )
    .join('')
    .toUpperCase();
}

export function AuthorManager({
  authors,
  dict,
  userId,
}: AuthorManagerProps) {
  const [
    authorList,
    setAuthorList,
  ] = useState<
    EditorialProfile[]
  >(authors);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    selectedAuthorId,
    setSelectedAuthorId,
  ] = useState<
    string | null
  >(
    authors[0]?.id ??
      null
  );

  const [
    pickerOpen,
    setPickerOpen,
  ] = useState(false);

  /*
   * null means there is no
   * replacement photo waiting
   * to be saved.
   */
  const [
    selectedHeadshot,
    setSelectedHeadshot,
  ] = useState<
    MediaAsset | null
  >(null);

  /*
   * Tracks an intentional
   * removal of the existing
   * headshot.
   */
  const [
    headshotRemoved,
    setHeadshotRemoved,
  ] = useState(false);

  const filteredAuthors =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return authorList;
      }

      return authorList.filter(
        (author) =>
          author.bylineName
            .toLowerCase()
            .includes(
              query
            ) ||
          author.editorialTitle
            ?.toLowerCase()
            .includes(
              query
            ) ||
          author.bio
            ?.toLowerCase()
            .includes(
              query
            )
      );
    }, [
      authorList,
      search,
    ]);

  const selectedAuthor =
    authorList.find(
      (author) =>
        author.id ===
        selectedAuthorId
    ) ?? null;

  const displayedHeadshot =
    headshotRemoved
      ? null
      : selectedHeadshot ??
        selectedAuthor
          ?.headshot ??
        null;

  function handleSelectAuthor(
    authorId: string
  ) {
    setSelectedAuthorId(
      authorId
    );

    setSelectedHeadshot(
      null
    );

    setHeadshotRemoved(
      false
    );

    setPickerOpen(
      false
    );
  }

  function handleSelectHeadshot(
    media: MediaAsset
  ) {
    setSelectedHeadshot(
      media
    );

    setHeadshotRemoved(
      false
    );

    setPickerOpen(
      false
    );
  }

  function handleRemoveHeadshot() {
    setSelectedHeadshot(
      null
    );

    setHeadshotRemoved(
      true
    );
  }

  async function handleSave(
    values: AuthorProfileFormValues
  ) {
    if (!selectedAuthor) {
      return;
    }

    const payload = {
      ...values,

      headshotMediaId:
        headshotRemoved
          ? null
          : displayedHeadshot
              ?.id ??
            null,
    };

    const response =
      await fetch(
        `/api/editorial-profiles/${selectedAuthor.id}`,
        {
          method: 'PATCH',

          headers: {
            'Content-Type':
              'application/json',
          },

          body:
            JSON.stringify(
              payload
            ),
        }
      );

    const result =
      await response
        .json()
        .catch(
          () => ({})
        );

    if (!response.ok) {
      throw new Error(
        result.error ??
          'Unable to save author profile.'
      );
    }

    /*
     * Update local state immediately,
     * avoiding a full page reload.
     */
    setAuthorList(
      (currentAuthors) =>
        currentAuthors.map(
          (author) => {
            if (
              author.id !==
              selectedAuthor.id
            ) {
              return author;
            }

            return {
              ...author,

              bylineName:
                values.bylineName,

              editorialTitle:
                values
                  .editorialTitle
                  .trim() ||
                null,

              bio:
                values.bio
                  .trim() ||
                null,

              bylineStatus:
                values.bylineStatus,

              headshot:
                headshotRemoved
                  ? null
                  : displayedHeadshot,
            };
          }
        )
    );

    setSelectedHeadshot(
      null
    );

    setHeadshotRemoved(
      false
    );
  }

  return (
    <>
      <div
        className="
          mt-6
          grid
          gap-6
          lg:grid-cols-[280px_minmax(0,1fr)]
        "
      >
        {/* =====================================================
            AUTHOR LIST
        ===================================================== */}

        <aside
          className="
            min-w-0
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
              p-4
            "
          >
            <div className="relative">
              <Search
                className="
                  pointer-events-none
                  absolute
                  left-3
                  top-1/2
                  h-4
                  w-4
                  -translate-y-1/2
                  text-muted-foreground
                "
                aria-hidden
              />

              <input
                type="search"
                value={
                  search
                }
                onChange={(
                  event
                ) =>
                  setSearch(
                    event
                      .target
                      .value
                  )
                }
                placeholder="Search authors"
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-input
                  bg-background
                  pl-9
                  pr-3
                  text-sm
                  text-foreground
                  outline-none
                  transition-colors
                  placeholder:text-muted-foreground
                  focus:border-primary
                  focus:ring-2
                  focus:ring-primary/15
                "
              />
            </div>
          </div>

          <div
            className="
              max-h-[680px]
              overflow-y-auto
              p-2
            "
          >
            {filteredAuthors.length >
            0 ? (
              <div className="space-y-1">
                {filteredAuthors.map(
                  (author) => {
                    const selected =
                      selectedAuthorId ===
                      author.id;

                    return (
                      <button
                        key={
                          author.id
                        }
                        type="button"
                        onClick={() =>
                          handleSelectAuthor(
                            author.id
                          )
                        }
                        className={`
                          flex
                          w-full
                          items-center
                          gap-3
                          rounded-lg
                          px-3
                          py-2.5
                          text-left
                          transition-colors
                          ${
                            selected
                              ? 'bg-primary/10 text-deep'
                              : 'hover:bg-surface-muted'
                          }
                        `}
                      >
                        <div
                          className="
                            flex
                            h-10
                            w-10
                            shrink-0
                            items-center
                            justify-center
                            overflow-hidden
                            rounded-full
                            bg-surface-subtle
                          "
                        >
                          {author.headshot
                            ?.url ? (
                            <img
                              src={
                                author
                                  .headshot
                                  .url
                              }
                              alt=""
                              className="
                                h-full
                                w-full
                                object-cover
                              "
                            />
                          ) : (
                            <span
                              className="
                                font-interface
                                text-xs
                                font-bold
                                text-deep
                              "
                            >
                              {getInitials(
                                author.bylineName
                              )}
                            </span>
                          )}
                        </div>

                        <div
                          className="
                            min-w-0
                            flex-1
                          "
                        >
                          <p
                            className="
                              truncate
                              text-sm
                              font-semibold
                              text-foreground
                            "
                          >
                            {
                              author.bylineName
                            }
                          </p>

                          {author.editorialTitle && (
                            <p
                              className="
                                truncate
                                text-xs
                                text-muted-foreground
                              "
                            >
                              {
                                author.editorialTitle
                              }
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  }
                )}
              </div>
            ) : (
              <div
                className="
                  px-4
                  py-10
                  text-center
                "
              >
                <UserRound
                  className="
                    mx-auto
                    h-6
                    w-6
                    text-muted-foreground
                  "
                  aria-hidden
                />

                <p
                  className="
                    mt-3
                    text-sm
                    font-medium
                    text-foreground
                  "
                >
                  No authors found
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* =====================================================
            AUTHOR EDITOR
        ===================================================== */}

        <section
          className="
            min-w-0
            rounded-xl
            border
            border-border
            bg-white
          "
        >
          {selectedAuthor ? (
            <div className="p-6">
              <div
                className="
                  flex
                  items-center
                  gap-4
                  border-b
                  border-border
                  pb-6
                "
              >
                <div
                  className="
                    flex
                    h-16
                    w-16
                    shrink-0
                    items-center
                    justify-center
                    overflow-hidden
                    rounded-full
                    bg-surface-subtle
                  "
                >
                  {displayedHeadshot
                    ?.url ? (
                    <img
                      src={
                        displayedHeadshot.url
                      }
                      alt=""
                      className="
                        h-full
                        w-full
                        object-cover
                      "
                    />
                  ) : (
                    <span
                      className="
                        font-interface
                        text-lg
                        font-bold
                        text-deep
                      "
                    >
                      {getInitials(
                        selectedAuthor.bylineName
                      )}
                    </span>
                  )}
                </div>

                <div className="min-w-0">
                  <h2
                    className="
                      truncate
                      font-headline
                      text-xl
                      font-bold
                      text-deep
                    "
                  >
                    {
                      selectedAuthor.bylineName
                    }
                  </h2>

                  {selectedAuthor.editorialTitle && (
                    <p
                      className="
                        mt-1
                        text-sm
                        text-muted-foreground
                      "
                    >
                      {
                        selectedAuthor.editorialTitle
                      }
                    </p>
                  )}
                </div>
              </div>

              <div className="pt-6">
                <AuthorProfileForm
                  author={
                    selectedAuthor
                  }
                  headshot={
                    displayedHeadshot
                  }
                  onChooseHeadshot={() =>
                    setPickerOpen(
                      true
                    )
                  }
                  onRemoveHeadshot={
                    handleRemoveHeadshot
                  }
                  onSave={
                    handleSave
                  }
                />
              </div>
            </div>
          ) : (
            <div
              className="
                flex
                min-h-[420px]
                items-center
                justify-center
                p-6
                text-center
              "
            >
              <div>
                <UserRound
                  className="
                    mx-auto
                    h-7
                    w-7
                    text-muted-foreground
                  "
                  aria-hidden
                />

                <p
                  className="
                    mt-3
                    text-sm
                    text-muted-foreground
                  "
                >
                  Select an author to
                  manage their profile.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* =====================================================
          MEDIA PICKER
      ===================================================== */}

      {pickerOpen && (
        <AuthorHeadshotPicker
          dict={dict}
          userId={userId}
          onSelect={
            handleSelectHeadshot
          }
          onClose={() =>
            setPickerOpen(
              false
            )
          }
        />
      )}
    </>
  );
}