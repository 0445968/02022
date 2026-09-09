
'use client';

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Search,
  Upload,
  X,
} from 'lucide-react';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import {
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from '@/lib/services/media-config';

import {
  getStoryMediaMetadata,
} from '@/lib/editorial/media-selection';

import {
  cn,
} from '@/lib/utils';

import type {
  MediaAsset,
} from '@/types/editorial';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaPickerProps {
  dict: Dictionary;

  userId: string;

  onSelect: (
    media: MediaAsset
  ) => void;

  onClose: () => void;
}

interface MediaListResponse {
  items: MediaAsset[];

  total: number;

  page: number;

  perPage: number;

  totalPages: number;
}

/* ========================================================= */
/* CONSTANTS */
/* ========================================================= */

const PER_PAGE = 24;

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function formatFileSize(
  bytes: number | null
): string {
  if (
    bytes === null ||
    bytes < 0
  ) {
    return '—';
  }

  if (
    bytes < 1024
  ) {
    return `${bytes} B`;
  }

  const kb =
    bytes / 1024;

  if (
    kb < 1024
  ) {
    return `${kb.toFixed(
      1
    )} KB`;
  }

  const mb =
    kb / 1024;

  return `${mb.toFixed(
    1
  )} MB`;
}

function isUsableImage(
  asset: MediaAsset
): boolean {
  return (
    asset.assetType ===
      'image' ||
    asset.assetType ===
      'graphic' ||
    asset.assetType ===
      'logo' ||
    asset.assetType ===
      'social'
  );
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaPicker({
  dict,
  userId: _userId,
  onSelect,
  onClose,
}: MediaPickerProps) {
  const [
    media,
    setMedia,
  ] = useState<
    MediaAsset[]
  >([]);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    debouncedSearch,
    setDebouncedSearch,
  ] = useState('');

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    uploadError,
    setUploadError,
  ] = useState<
    string | null
  >(null);

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    totalPages,
    setTotalPages,
  ] = useState(1);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    selected,
    setSelected,
  ] = useState<
    MediaAsset | null
  >(null);

  const [
    favoriteLoadingId,
    setFavoriteLoadingId,
  ] = useState<
    string | null
  >(null);

  /* ======================================================= */
  /* SEARCH DEBOUNCE */
  /* ======================================================= */

  useEffect(
    () => {
      const timeout =
        window.setTimeout(
          () => {
            setDebouncedSearch(
              search.trim()
            );

            setPage(
              1
            );
          },
          250
        );

      return () => {
        window.clearTimeout(
          timeout
        );
      };
    },
    [
      search,
    ]
  );

  /* ======================================================= */
  /* FETCH MEDIA */
  /* ======================================================= */

  const fetchMedia =
    useCallback(
      async () => {
        setLoading(
          true
        );

        setError(
          null
        );

        try {
          const params =
            new URLSearchParams();

          params.set(
            'page',
            String(page)
          );

          params.set(
            'perPage',
            String(PER_PAGE)
          );

          params.set(
            'sort',
            'newest'
          );

          if (
            debouncedSearch
          ) {
            params.set(
              'search',
              debouncedSearch
            );
          }

          const response =
            await fetch(
              `/api/media?${params.toString()}`,
              {
                cache:
                  'no-store',
              }
            );

          const result:
            | MediaListResponse
            | {
                error?: string;
              }
            | null =
            await response
              .json()
              .catch(
                () =>
                  null
              );

          if (
            !response.ok
          ) {
            throw new Error(
              result &&
              'error' in
                result
                ? result.error ||
                    'Unable to load media.'
                : 'Unable to load media.'
            );
          }

          const responseData =
            result as MediaListResponse;

          /*
           * The shared library can contain video,
           * audio and documents. This picker is
           * specifically for story images.
           */
          const imageItems =
            (
              responseData.items ??
              []
            ).filter(
              isUsableImage
            );

          setMedia(
            imageItems
          );

          setTotal(
            responseData.total ??
              imageItems.length
          );

          setTotalPages(
            Math.max(
              1,
              responseData.totalPages ??
                1
            )
          );

          setSelected(
            (
              current
            ) => {
              if (
                !current
              ) {
                return null;
              }

              return (
                imageItems.find(
                  (
                    asset
                  ) =>
                    asset.id ===
                    current.id
                ) ??
                current
              );
            }
          );
        } catch (
          fetchError
        ) {
          setMedia(
            []
          );

          setError(
            fetchError instanceof
              Error
              ? fetchError.message
              : 'Unable to load media.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        debouncedSearch,
        page,
      ]
    );

  useEffect(
    () => {
      void fetchMedia();
    },
    [
      fetchMedia,
    ]
  );

  /* ======================================================= */
  /* ESCAPE */
  /* ======================================================= */

  useEffect(
    () => {
      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key ===
          'Escape'
        ) {
          onClose();
        }
      }

      window.addEventListener(
        'keydown',
        handleKeyDown
      );

      return () => {
        window.removeEventListener(
          'keydown',
          handleKeyDown
        );
      };
    },
    [
      onClose,
    ]
  );

  /* ======================================================= */
  /* UPLOAD */
  /* ======================================================= */

  async function handleUpload(
    event:
      React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (
      !file
    ) {
      return;
    }

    setUploadError(
      null
    );

    if (
      !file.type.startsWith(
        'image/'
      )
    ) {
      setUploadError(
        dict.media.invalidType
      );

      event.target.value =
        '';

      return;
    }

    if (
      !ALLOWED_MIME_TYPES.includes(
        file.type as typeof ALLOWED_MIME_TYPES[number]
      )
    ) {
      setUploadError(
        dict.media.invalidType
      );

      event.target.value =
        '';

      return;
    }

    if (
      file.size >
      MAX_FILE_SIZE
    ) {
      setUploadError(
        dict.media.fileTooLarge
      );

      event.target.value =
        '';

      return;
    }

    setUploading(
      true
    );

    try {
      const formData =
        new FormData();

      formData.append(
        'file',
        file
      );

      formData.append(
        'altText',
        ''
      );

      const response =
        await fetch(
          '/api/media/upload',
          {
            method:
              'POST',

            body:
              formData,
          }
        );

      const result =
        await response
          .json()
          .catch(
            () =>
              null
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result?.error ??
            dict.media.uploadError
        );
      }

      const uploaded:
        MediaAsset | null =
        result?.item?.id
          ? result.item
          : result?.id
            ? result
            : null;

      await fetchMedia();

      /*
       * Immediately select the newly uploaded
       * asset when the server returned it.
       */
      if (
        uploaded &&
        isUsableImage(
          uploaded
        )
      ) {
        setSelected(
          uploaded
        );
      }
    } catch (
      uploadFailure
    ) {
      setUploadError(
        uploadFailure instanceof
          Error
          ? uploadFailure.message
          : dict.media.uploadError
      );
    } finally {
      setUploading(
        false
      );

      event.target.value =
        '';
    }
  }

  /* ======================================================= */
  /* FAVORITE */
  /* ======================================================= */

  async function toggleFavorite(
    asset: MediaAsset
  ) {
    if (
      favoriteLoadingId
    ) {
      return;
    }

    setFavoriteLoadingId(
      asset.id
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/media/${asset.id}/favorite`,
          {
            method:
              'PATCH',
          }
        );

      const result =
        await response
          .json()
          .catch(
            () =>
              null
          );

      if (
        !response.ok
      ) {
        throw new Error(
          result?.error ??
            'Unable to update favorite.'
        );
      }

      const isFavorite =
        Boolean(
          result?.isFavorite
        );

      setMedia(
        (
          current
        ) =>
          current.map(
            (
              item
            ) =>
              item.id ===
              asset.id
                ? {
                    ...item,
                    isFavorite,
                  }
                : item
          )
      );

      setSelected(
        (
          current
        ) =>
          current?.id ===
          asset.id
            ? {
                ...current,
                isFavorite,
              }
            : current
      );
    } catch (
      favoriteError
    ) {
      setError(
        favoriteError instanceof
          Error
          ? favoriteError.message
          : 'Unable to update favorite.'
      );
    } finally {
      setFavoriteLoadingId(
        null
      );
    }
  }

  /* ======================================================= */
  /* SELECTED METADATA */
  /* ======================================================= */

  const selectedMetadata =
    useMemo(
      () =>
        selected
          ? getStoryMediaMetadata(
              selected
            )
          : null,
      [
        selected,
      ]
    );

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-center
        justify-center
        bg-deep/70
        p-4
        backdrop-blur-sm
      "
      role="dialog"
      aria-modal="true"
      aria-label={
        dict.media.title
      }
    >
      <div
        className="
          flex
          h-[88vh]
          w-full
          max-w-6xl
          overflow-hidden
          rounded-2xl
          border
          border-white/10
          bg-white
          shadow-2xl
        "
      >
        {/* ================================================= */}
        {/* MAIN LIBRARY */}
        {/* ================================================= */}

        <div
          className="
            flex
            min-w-0
            flex-1
            flex-col
          "
        >
          {/* =============================================== */}
          {/* HEADER */}
          {/* =============================================== */}

          <div
            className="
              flex
              min-h-[64px]
              items-center
              justify-between
              gap-4
              border-b
              border-border
              px-5
              py-3
            "
          >
            <div
              className="
                min-w-0
              "
            >
              <h2
                className="
                  font-headline
                  text-xl
                  font-bold
                  text-deep
                "
              >
                {
                  dict.media.title
                }
              </h2>

              <p
                className="
                  mt-0.5
                  text-xs
                  text-muted-foreground
                "
              >
                Select an image from the newsroom library
              </p>
            </div>

            <button
              type="button"
              onClick={
                onClose
              }
              className="
                inline-flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-border
                bg-white
                text-muted-foreground
                transition
                hover:bg-surface-muted
                hover:text-foreground
              "
              aria-label={
                dict.nav.close
              }
            >
              <X
                className="
                  h-4
                  w-4
                "
                aria-hidden
              />
            </button>
          </div>

          {/* =============================================== */}
          {/* SEARCH + UPLOAD */}
          {/* =============================================== */}

          <div
            className="
              flex
              flex-col
              gap-3
              border-b
              border-border
              px-5
              py-3
              sm:flex-row
              sm:items-center
            "
          >
            <div
              className="
                relative
                min-w-0
                flex-1
              "
            >
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
                    event.target
                      .value
                  )
                }
                placeholder={
                  dict.media
                    .searchPlaceholder
                }
                className="
                  h-10
                  w-full
                  rounded-lg
                  border
                  border-border
                  bg-white
                  pl-10
                  pr-3
                  text-sm
                  text-foreground
                  placeholder:text-muted-foreground/60
                  focus:border-primary
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              />
            </div>

            <label
              className={cn(
                `
                  inline-flex
                  h-10
                  shrink-0
                  cursor-pointer
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  bg-primary
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  transition
                  hover:bg-primary/90
                `,
                uploading &&
                  `
                    pointer-events-none
                    opacity-60
                  `
              )}
            >
              <Upload
                className="
                  h-4
                  w-4
                "
                aria-hidden
              />

              {uploading
                ? 'Uploading…'
                : dict.media
                    .upload}

              <input
                type="file"
                accept="image/*"
                onChange={
                  handleUpload
                }
                disabled={
                  uploading
                }
                className="
                  hidden
                "
              />
            </label>
          </div>

          {/* =============================================== */}
          {/* ERRORS */}
          {/* =============================================== */}

          {(error ||
            uploadError) && (
            <div
              role="alert"
              className="
                border-b
                border-breaking/20
                bg-breaking/5
                px-5
                py-2.5
                text-sm
                text-breaking
              "
            >
              {uploadError ||
                error}
            </div>
          )}

          {/* =============================================== */}
          {/* GRID */}
          {/* =============================================== */}

          <div
            className="
              min-h-0
              flex-1
              overflow-y-auto
              p-5
            "
          >
            {loading ? (
              <div
                className="
                  flex
                  h-full
                  min-h-[300px]
                  items-center
                  justify-center
                "
              >
                <p
                  className="
                    text-sm
                    text-muted-foreground
                  "
                >
                  {
                    dict.common
                      .loading
                  }
                </p>
              </div>
            ) : media.length ===
              0 ? (
              <div
                className="
                  flex
                  h-full
                  min-h-[300px]
                  flex-col
                  items-center
                  justify-center
                  text-center
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                    bg-surface-muted
                    text-muted-foreground
                  "
                >
                  <ImageIcon
                    className="
                      h-5
                      w-5
                    "
                    aria-hidden
                  />
                </div>

                <p
                  className="
                    mt-4
                    font-headline
                    text-lg
                    font-semibold
                    text-deep
                  "
                >
                  {
                    dict.media
                      .noMedia
                  }
                </p>

                <p
                  className="
                    mt-1
                    max-w-sm
                    text-sm
                    text-muted-foreground
                  "
                >
                  {
                    dict.media
                      .noMediaDesc
                  }
                </p>
              </div>
            ) : (
              <div
                className="
                  grid
                  grid-cols-2
                  gap-3
                  sm:grid-cols-3
                  md:grid-cols-4
                "
              >
                {media.map(
                  (
                    item
                  ) => {
                    const active =
                      selected?.id ===
                      item.id;

                    return (
                      <div
                        key={
                          item.id
                        }
                        className={cn(
                          `
                            group
                            relative
                            overflow-hidden
                            rounded-xl
                            border
                            bg-white
                            transition
                          `,
                          active
                            ? `
                              border-primary
                              ring-2
                              ring-primary/10
                            `
                            : `
                              border-border
                              hover:border-primary/30
                              hover:shadow-sm
                            `
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setSelected(
                              item
                            )
                          }
                          className="
                            block
                            w-full
                            text-left
                          "
                        >
                          <div
                            className="
                              relative
                              aspect-square
                              overflow-hidden
                              bg-surface-subtle
                            "
                          >
                            <img
                              src={
                                item.url
                              }
                              alt={
                                item.altText ||
                                ''
                              }
                              className="
                                h-full
                                w-full
                                object-cover
                              "
                            />

                            {active && (
                              <span
                                className="
                                  absolute
                                  left-2
                                  top-2
                                  inline-flex
                                  h-7
                                  w-7
                                  items-center
                                  justify-center
                                  rounded-full
                                  bg-primary
                                  text-white
                                  shadow
                                "
                              >
                                <Check
                                  className="
                                    h-4
                                    w-4
                                  "
                                  aria-hidden
                                />
                              </span>
                            )}
                          </div>

                          <div
                            className="
                              p-2.5
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
                              {item.title ||
                                item.fileName}
                            </p>

                            <p
                              className="
                                mt-1
                                truncate
                                text-xs
                                text-muted-foreground
                              "
                            >
                              {item.credit ||
                                item.photographer ||
                                'No credit'}
                            </p>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={(
                            event
                          ) => {
                            event.stopPropagation();

                            void toggleFavorite(
                              item
                            );
                          }}
                          disabled={
                            favoriteLoadingId ===
                            item.id
                          }
                          title={
                            item.isFavorite
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                          aria-label={
                            item.isFavorite
                              ? 'Remove from favorites'
                              : 'Add to favorites'
                          }
                          className={cn(
                            `
                              absolute
                              right-2
                              top-2
                              inline-flex
                              h-8
                              w-8
                              items-center
                              justify-center
                              rounded-full
                              border
                              border-black/10
                              bg-white/95
                              shadow-sm
                              backdrop-blur
                              transition
                              disabled:opacity-50
                            `,
                            item.isFavorite
                              ? `
                                text-breaking
                              `
                              : `
                                text-muted-foreground
                                hover:text-breaking
                              `
                          )}
                        >
                          <Heart
                            className={cn(
                              `
                                h-4
                                w-4
                              `,
                              item.isFavorite &&
                                'fill-current'
                            )}
                            aria-hidden
                          />
                        </button>
                      </div>
                    );
                  }
                )}
              </div>
            )}
          </div>

          {/* =============================================== */}
          {/* PAGINATION */}
          {/* =============================================== */}

          <div
            className="
              flex
              min-h-[58px]
              items-center
              justify-between
              gap-4
              border-t
              border-border
              px-5
              py-3
            "
          >
            <p
              className="
                text-xs
                text-muted-foreground
              "
            >
              {total > 0
                ? `${total} media assets`
                : 'No media'}
            </p>

            <div
              className="
                flex
                items-center
                gap-2
              "
            >
              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.max(
                        1,
                        current -
                          1
                      )
                  )
                }
                disabled={
                  page <= 1 ||
                  loading
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-white
                  text-muted-foreground
                  transition
                  hover:bg-surface-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Previous page"
              >
                <ChevronLeft
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>

              <span
                className="
                  min-w-[72px]
                  text-center
                  text-xs
                  font-medium
                  text-foreground
                "
              >
                {page} /{' '}
                {totalPages}
              </span>

              <button
                type="button"
                onClick={() =>
                  setPage(
                    (
                      current
                    ) =>
                      Math.min(
                        totalPages,
                        current +
                          1
                      )
                  )
                }
                disabled={
                  page >=
                    totalPages ||
                  loading
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-white
                  text-muted-foreground
                  transition
                  hover:bg-surface-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
                aria-label="Next page"
              >
                <ChevronRight
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>
            </div>
          </div>
        </div>

        {/* ================================================= */}
        {/* INSPECTOR */}
        {/* ================================================= */}

        <aside
          className="
            hidden
            w-[320px]
            shrink-0
            border-l
            border-border
            bg-surface-muted/40
            lg:flex
            lg:flex-col
          "
        >
          {!selected ? (
            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                px-6
                text-center
              "
            >
              <div
                className="
                  flex
                  h-12
                  w-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-white
                  text-muted-foreground
                  shadow-sm
                "
              >
                <ImageIcon
                  className="
                    h-5
                    w-5
                  "
                  aria-hidden
                />
              </div>

              <p
                className="
                  mt-4
                  text-sm
                  font-semibold
                  text-foreground
                "
              >
                Select an image
              </p>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                Image metadata will appear here before you add it to the story.
              </p>
            </div>
          ) : (
            <>
              <div
                className="
                  min-h-0
                  flex-1
                  overflow-y-auto
                "
              >
                <div
                  className="
                    aspect-[16/10]
                    overflow-hidden
                    bg-surface-subtle
                  "
                >
                  <img
                    src={
                      selected.url
                    }
                    alt={
                      selected.altText ||
                      ''
                    }
                    className="
                      h-full
                      w-full
                      object-cover
                    "
                  />
                </div>

                <div
                  className="
                    space-y-5
                    p-5
                  "
                >
                  <div>
                    <p
                      className="
                        text-xs
                        font-bold
                        uppercase
                        tracking-[0.08em]
                        text-muted-foreground
                      "
                    >
                      Selected image
                    </p>

                    <h3
                      className="
                        mt-1
                        font-headline
                        text-lg
                        font-bold
                        leading-tight
                        text-deep
                      "
                    >
                      {selected.title ||
                        selected.fileName}
                    </h3>

                    <p
                      className="
                        mt-2
                        text-xs
                        text-muted-foreground
                      "
                    >
                      {formatFileSize(
                        selected.fileSize
                      )}

                      {selected.width &&
                      selected.height
                        ? ` · ${selected.width} × ${selected.height}`
                        : ''}
                    </p>
                  </div>

                  <MetadataItem
                    label="Description"
                    value={
                      selectedMetadata?.description ||
                      'No description'
                    }
                  />

                  <MetadataItem
                    label="Caption"
                    value={
                      selectedMetadata?.caption ||
                      'No caption'
                    }
                  />

                  <MetadataItem
                    label="Credit"
                    value={
                      selectedMetadata?.credit ||
                      'No credit'
                    }
                  />

                  <MetadataItem
                    label="Alt text"
                    value={
                      selectedMetadata?.altText ||
                      'No alt text'
                    }
                  />

                  {selected.rightsStatus && (
                    <MetadataItem
                      label="Rights"
                      value={
                        selected.rightsStatus.replace(
                          /_/g,
                          ' '
                        )
                      }
                    />
                  )}
                </div>
              </div>

              <div
                className="
                  border-t
                  border-border
                  bg-white
                  p-4
                "
              >
                <button
                  type="button"
                  onClick={() =>
                    onSelect(
                      selected
                    )
                  }
                  className="
                    inline-flex
                    h-10
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-lg
                    bg-primary
                    px-4
                    text-sm
                    font-semibold
                    text-white
                    transition
                    hover:bg-primary/90
                  "
                >
                  <Check
                    className="
                      h-4
                      w-4
                    "
                    aria-hidden
                  />

                  {
                    dict.media
                      .useImage
                  }
                </button>
              </div>
            </>
          )}
        </aside>

        {/* ================================================= */}
        {/* MOBILE SELECTION FOOTER */}
        {/* ================================================= */}

        {selected && (
          <div
            className="
              fixed
              inset-x-4
              bottom-4
              z-[60]
              flex
              items-center
              gap-3
              rounded-xl
              border
              border-border
              bg-white
              p-3
              shadow-xl
              lg:hidden
            "
          >
            <div
              className="
                h-12
                w-12
                shrink-0
                overflow-hidden
                rounded-lg
                bg-surface-subtle
              "
            >
              <img
                src={
                  selected.url
                }
                alt=""
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
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
                {selected.title ||
                  selected.fileName}
              </p>

              <p
                className="
                  truncate
                  text-xs
                  text-muted-foreground
                "
              >
                {selectedMetadata?.credit ||
                  'No credit'}
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                onSelect(
                  selected
                )
              }
              className="
                inline-flex
                h-9
                shrink-0
                items-center
                rounded-lg
                bg-primary
                px-3
                text-sm
                font-semibold
                text-white
              "
            >
              {
                dict.media
                  .useImage
              }
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========================================================= */
/* METADATA ITEM */
/* ========================================================= */

function MetadataItem({
  label,
  value,
}: {
  label: string;

  value: string;
}) {
  return (
    <div>
      <p
        className="
          text-[10px]
          font-black
          uppercase
          tracking-[0.1em]
          text-muted-foreground
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          whitespace-pre-wrap
          text-sm
          leading-5
          text-foreground
        "
      >
        {value}
      </p>
    </div>
  );
}

