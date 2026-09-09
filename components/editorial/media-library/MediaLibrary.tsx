'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { Dictionary } from '@/lib/i18n/dictionaries';

import type {
  MediaAsset,
  MediaAssetType,
  MediaRightsStatus,
  MediaStatus,
} from '@/types/editorial';

import {
  MediaBulkActions,
} from './MediaBulkActions';

import type {
  MediaCardAction,
} from './MediaCard';

import {
  MediaEmptyState,
} from './MediaEmptyState';

import {
  MediaErrorState,
} from './MediaErrorState';

import {
  MediaFilters,
} from './MediaFilters';

import {
  MediaGrid,
} from './MediaGrid';

import {
  MediaInspector,
} from './MediaInspector';

import {
  MediaLibraryHeader,
} from './MediaLibraryHeader';

import {
  MediaLoadingState,
} from './MediaLoadingState';

import {
  MediaPagination,
} from './MediaPagination';

import {
  MediaSearchBar,
} from './MediaSearchBar';

import {
  MediaUploadDrawer,
} from './MediaUploadDrawer';

import {
    useMediaFavorites,
  } from './useMediaFavorites';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

export type MediaViewMode =
  | 'grid'
  | 'compact'
  | 'list';

export type MediaLibrarySection =
  | 'library'
  | 'recent'
  | 'mine'
  | 'favorites'
  | 'unused'
  | 'archived'
  | 'trash';

export type MediaSortOption =
  | 'newest'
  | 'oldest'
  | 'updated'
  | 'filename_asc'
  | 'filename_desc'
  | 'largest'
  | 'smallest';

export interface MediaLibraryFilters {
  status:
    | MediaStatus
    | 'all';

  assetType:
    | MediaAssetType
    | 'all';

  rightsStatus:
    | MediaRightsStatus
    | 'all';

  island: string;

  categoryId: string;

  photographer: string;

  source: string;
}

interface MediaLibraryProps {
  dict: Dictionary;

  userId: string;
}

type BulkAction =
  | 'approve'
  | 'archive'
  | 'trash'
  | 'restore'
  | 'favorite';

/* ========================================================= */
/* DEFAULTS */
/* ========================================================= */

const DEFAULT_FILTERS: MediaLibraryFilters = {
  status: 'all',

  assetType: 'all',

  rightsStatus: 'all',

  island: '',

  categoryId: '',

  photographer: '',

  source: '',
};

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function hasFilters(
  filters: MediaLibraryFilters
): boolean {
  return (
    filters.status !==
      'all' ||
    filters.assetType !==
      'all' ||
    filters.rightsStatus !==
      'all' ||
    Boolean(
      filters.island
    ) ||
    Boolean(
      filters.categoryId
    ) ||
    Boolean(
      filters.photographer
    ) ||
    Boolean(
      filters.source
    )
  );
}

function getBulkMode(
  section: MediaLibrarySection
):
  | 'library'
  | 'archived'
  | 'trash' {
  if (
    section ===
    'archived'
  ) {
    return 'archived';
  }

  if (
    section ===
    'trash'
  ) {
    return 'trash';
  }

  return 'library';
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaLibrary({
  dict,
  userId,
}: MediaLibraryProps) {
  /* ======================================================= */
  /* DATA */
  /* ======================================================= */

  const [
    media,
    setMedia,
  ] = useState<
    MediaAsset[]
  >([]);

  const [
    total,
    setTotal,
  ] = useState(0);

  const [
    totalPages,
    setTotalPages,
  ] = useState(0);

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

  /* ======================================================= */
  /* LIBRARY STATE */
  /* ======================================================= */

  const [
    section,
    setSection,
  ] =
    useState<MediaLibrarySection>(
      'library'
    );

  const [
    viewMode,
    setViewMode,
  ] =
    useState<MediaViewMode>(
      'grid'
    );

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    sort,
    setSort,
  ] =
    useState<MediaSortOption>(
      'newest'
    );

  const [
    filters,
    setFilters,
  ] =
    useState<MediaLibraryFilters>({
      ...DEFAULT_FILTERS,
    });

  const [
    page,
    setPage,
  ] = useState(1);

  const [
    perPage,
    setPerPage,
  ] = useState(24);

  /* ======================================================= */
  /* DRAWERS */
  /* ======================================================= */

  const [
    filtersOpen,
    setFiltersOpen,
  ] = useState(false);

  const [
    uploadOpen,
    setUploadOpen,
  ] = useState(false);

  const [
    selectedAsset,
    setSelectedAsset,
  ] =
    useState<MediaAsset | null>(
      null
    );

  /* ======================================================= */
  /* SELECTION */
  /* ======================================================= */

  const [
    selectedIds,
    setSelectedIds,
  ] = useState<Set<string>>(
    new Set()
  );

  /* ======================================================= */
  /* ACTION STATE */
  /* ======================================================= */

  const [
    loadingAssetId,
    setLoadingAssetId,
  ] = useState<
    string | null
  >(null);

  const [
    loadingAssetAction,
    setLoadingAssetAction,
  ] =
    useState<
      MediaCardAction | null
    >(null);

  const [
    bulkLoadingAction,
    setBulkLoadingAction,
  ] =
    useState<
      BulkAction | null
    >(null);

    const {
        loadingAssetId:
          favoriteLoadingAssetId,
      
        toggleFavorite,
      } =
        useMediaFavorites({
          onUpdated: (
            assetId,
            isFavorite
          ) => {
            setMedia(
              (
                current
              ) => {
                if (
                  section ===
                    'favorites' &&
                  !isFavorite
                ) {
                  return current.filter(
                    (
                      asset
                    ) =>
                      asset.id !==
                      assetId
                  );
                }
      
                return current.map(
                  (
                    asset
                  ) =>
                    asset.id ===
                    assetId
                      ? {
                          ...asset,
                          isFavorite,
                        }
                      : asset
                );
              }
            );
      
            setSelectedAsset(
              (
                current
              ) =>
                current?.id ===
                assetId
                  ? {
                      ...current,
                      isFavorite,
                    }
                  : current
            );
      
            if (
              section ===
                'favorites' &&
              !isFavorite
            ) {
              setTotal(
                (
                  current
                ) =>
                  Math.max(
                    0,
                    current - 1
                  )
              );
            }
          },
      
          onError: (
            message
          ) => {
            setError(
              message
            );
          },
        });

  /* ======================================================= */
  /* COMPUTED */
  /* ======================================================= */

  const hasSearchOrFilters =
    useMemo(
      () =>
        search.trim().length >
          0 ||
        hasFilters(
          filters
        ),
      [
        filters,
        search,
      ]
    );

  const bulkMode =
    getBulkMode(
      section
    );

  /* ======================================================= */
  /* QUERY */
  /* ======================================================= */

  const buildQuery =
    useCallback(() => {
      const params =
        new URLSearchParams();

      params.set(
        'page',
        String(page)
      );

      params.set(
        'perPage',
        String(perPage)
      );

      params.set(
        'sort',
        sort
      );

      if (
        search.trim()
      ) {
        params.set(
          'search',
          search.trim()
        );
      }

      if (
        filters.status !==
        'all'
      ) {
        params.set(
          'status',
          filters.status
        );
      }

      if (
        filters.assetType !==
        'all'
      ) {
        params.set(
          'type',
          filters.assetType
        );
      }

      if (
        filters.rightsStatus !==
        'all'
      ) {
        params.set(
          'rights',
          filters.rightsStatus
        );
      }

      if (
        filters.island
      ) {
        params.set(
          'island',
          filters.island
        );
      }

      if (
        filters.categoryId
      ) {
        params.set(
          'categoryId',
          filters.categoryId
        );
      }

      if (
        filters.photographer.trim()
      ) {
        params.set(
          'photographer',
          filters.photographer.trim()
        );
      }

      if (
        filters.source.trim()
      ) {
        params.set(
          'source',
          filters.source.trim()
        );
      }

      switch (
        section
      ) {
        case 'mine':
          params.set(
            'uploadedBy',
            userId
          );
          break;

        case 'favorites':
          params.set(
            'favorite',
            'true'
          );
          break;

        case 'archived':
          params.set(
            'status',
            'archived'
          );
          break;

        case 'trash':
          params.set(
            'status',
            'trashed'
          );
          break;

        case 'recent':
          params.set(
            'sort',
            'newest'
          );
          break;

        case 'unused':
          /*
           * media_usage filtering is added
           * in the next backend phase.
           */
          break;

        case 'library':
        default:
          break;
      }

      return params;
    }, [
      filters,
      page,
      perPage,
      search,
      section,
      sort,
      userId,
    ]);

  /* ======================================================= */
  /* FETCH */
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
            buildQuery();

          const response =
            await fetch(
              `/api/media?${params.toString()}`,
              {
                cache:
                  'no-store',
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
                'Unable to load media library.'
            );
          }

          const items:
  MediaAsset[] =
  Array.isArray(
    result?.items
  )
    ? result.items
    : [];

          setMedia(
            items
          );

          setTotal(
            typeof result?.total ===
              'number'
              ? result.total
              : items.length
          );
          
          setTotalPages(
            typeof result?.totalPages ===
              'number'
              ? result.totalPages
              : 0
          );

          /*
           * Keep the open inspector synchronized
           * with fresh list data where possible.
           */
          setSelectedAsset(
            (
              current
            ) => {
              if (
                !current
              ) {
                return null;
              }

              return (
                items.find(
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

          /*
           * Remove selected IDs that are no longer
           * present in the current page.
           */
          setSelectedIds(
            (
              current
            ) => {
              if (
                current.size ===
                0
              ) {
                return current;
              }

              const available =
                new Set(
                  items.map(
                    (
                      asset
                    ) =>
                      asset.id
                  )
                );

              return new Set(
                Array.from(
                  current
                ).filter(
                  (
                    id
                  ) =>
                    available.has(
                      id
                    )
                )
              );
            }
          );
        } catch (
          fetchError
        ) {
          console.error(
            'Failed to load media:',
            fetchError
          );

          setMedia(
            []
          );

          setTotal(
            0
          );

          setTotalPages(
            0
          );

          setError(
            fetchError instanceof
              Error
              ? fetchError.message
              : 'Unable to load media library.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      [
        buildQuery,
        section,
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
  /* RESET PAGE WHEN QUERY CHANGES */
  /* ======================================================= */

  useEffect(
    () => {
      setPage(
        1
      );
    },
    [
      filters,
      search,
      section,
      sort,
      perPage,
    ]
  );

  /* ======================================================= */
  /* SECTION */
  /* ======================================================= */

  function handleSectionChange(
    nextSection:
      MediaLibrarySection
  ) {
    setSection(
      nextSection
    );

    setPage(
      1
    );

    setSelectedIds(
      new Set()
    );

    setSelectedAsset(
      null
    );

    setError(
      null
    );
  }

  /* ======================================================= */
  /* VIEW MODE */
  /* ======================================================= */

  function handleViewModeChange(
    mode: MediaViewMode
  ) {
    setViewMode(
      mode
    );

    setPerPage(
      mode ===
        'compact'
        ? 48
        : 24
    );
  }

  /* ======================================================= */
  /* FILTERS */
  /* ======================================================= */

  function resetFilters() {
    setSearch(
      ''
    );

    setFilters({
      ...DEFAULT_FILTERS,
    });

    setPage(
      1
    );
  }

  /* ======================================================= */
  /* SELECTION */
  /* ======================================================= */

  function handleToggleSelected(
    id: string
  ) {
    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        if (
          next.has(
            id
          )
        ) {
          next.delete(
            id
          );
        } else {
          next.add(
            id
          );
        }

        return next;
      }
    );
  }

  function clearSelection() {
    setSelectedIds(
      new Set()
    );
  }

  /* ======================================================= */
  /* LOCAL ASSET UPDATE */
  /* ======================================================= */

  function replaceAsset(
    updated:
      MediaAsset
  ) {
    setMedia(
      (
        current
      ) =>
        current.map(
          (
            asset
          ) =>
            asset.id ===
            updated.id
              ? updated
              : asset
        )
    );

    setSelectedAsset(
      (
        current
      ) =>
        current?.id ===
        updated.id
          ? updated
          : current
    );
  }

  function removeAsset(
    id: string
  ) {
    setMedia(
      (
        current
      ) =>
        current.filter(
          (
            asset
          ) =>
            asset.id !==
            id
        )
    );

    setSelectedIds(
      (
        current
      ) => {
        const next =
          new Set(
            current
          );

        next.delete(
          id
        );

        return next;
      }
    );

    setSelectedAsset(
      (
        current
      ) =>
        current?.id ===
        id
          ? null
          : current
    );
  }

  /* ======================================================= */
  /* SINGLE WORKFLOW ACTION */
  /* ======================================================= */

  async function runAssetWorkflow(
    asset: MediaAsset,
    action:
      | 'approve'
      | 'archive'
      | 'trash'
      | 'restore'
  ) {
    if (
      loadingAssetId
    ) {
      return;
    }

    if (
      action ===
      'trash'
    ) {
      const confirmed =
        window.confirm(
          `Move "${
            asset.title ||
            asset.fileName
          }" to trash?`
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    setLoadingAssetId(
      asset.id
    );

    setLoadingAssetAction(
      action
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/media/${asset.id}`,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify({
                action,
              }),
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
            `Unable to ${action} media asset.`
        );
      }

      const updated =
        result?.item ??
        result;

      if (
        !updated?.id
      ) {
        throw new Error(
          'The media action completed but the updated asset was not returned.'
        );
      }

      const updatedAsset =
        updated as MediaAsset;

      /*
       * If the workflow action moves the asset
       * outside the currently visible section,
       * simply refresh instead of leaving stale
       * content behind.
       */
      if (
        action ===
          'archive' ||
        action ===
          'trash' ||
        action ===
          'restore'
      ) {
        await fetchMedia();

        return;
      }

      replaceAsset(
        updatedAsset
      );
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : `Unable to ${action} media asset.`
      );
    } finally {
      setLoadingAssetId(
        null
      );

      setLoadingAssetAction(
        null
      );
    }
  }

  /* ======================================================= */
  /* FAVORITE */
  /* ======================================================= */

  async function handleFavorite(
    asset: MediaAsset
  ) {
    setError(
      null
    );
  
    await toggleFavorite(
      asset
    );
  }

  /* ======================================================= */
  /* BULK WORKFLOW */
  /* ======================================================= */

  async function runBulkWorkflow(
    action:
      | 'approve'
      | 'archive'
      | 'trash'
      | 'restore'
  ) {
    if (
      selectedIds.size ===
        0 ||
      bulkLoadingAction
    ) {
      return;
    }

    if (
      action ===
      'trash'
    ) {
      const confirmed =
        window.confirm(
          `Move ${selectedIds.size} selected ${
            selectedIds.size ===
            1
              ? 'asset'
              : 'assets'
          } to trash?`
        );

      if (
        !confirmed
      ) {
        return;
      }
    }

    setBulkLoadingAction(
      action
    );

    setError(
      null
    );

    const ids =
      Array.from(
        selectedIds
      );

    try {
      const results =
        await Promise.all(
          ids.map(
            async (
              id
            ) => {
              const response =
                await fetch(
                  `/api/media/${id}`,
                  {
                    method:
                      'PATCH',

                    headers: {
                      'Content-Type':
                        'application/json',
                    },

                    body:
                      JSON.stringify({
                        action,
                      }),
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
                    `Unable to ${action} one or more selected assets.`
                );
              }

              return (
                result?.item ??
                result
              ) as MediaAsset;
            }
          )
        );

      if (
        action ===
        'approve'
      ) {
        const updatedMap =
          new Map(
            results.map(
              (
                asset
              ) => [
                asset.id,
                asset,
              ]
            )
          );

        setMedia(
          (
            current
          ) =>
            current.map(
              (
                asset
              ) =>
                updatedMap.get(
                  asset.id
                ) ??
                asset
            )
        );
      } else {
        await fetchMedia();
      }

      setSelectedIds(
        new Set()
      );
    } catch (
      bulkError
    ) {
      setError(
        bulkError instanceof
          Error
          ? bulkError.message
          : `Unable to ${action} selected media.`
      );

      /*
       * Refresh because some requests may have
       * succeeded before another request failed.
       */
      await fetchMedia();
    } finally {
      setBulkLoadingAction(
        null
      );
    }
  }

  async function handleBulkFavorite() {
    if (
      selectedIds.size === 0 ||
      bulkLoadingAction
    ) {
      return;
    }
  
    setBulkLoadingAction(
      'favorite'
    );
  
    setError(
      null
    );
  
    const selectedAssets =
      media.filter(
        (
          asset
        ) =>
          selectedIds.has(
            asset.id
          )
      );
  
    try {
      const results =
        await Promise.all(
          selectedAssets.map(
            async (
              asset
            ) => {
              /*
               * Bulk Favorite means "make all selected
               * assets favorites", rather than toggling
               * each one independently.
               */
              if (
                asset.isFavorite
              ) {
                return {
                  id: asset.id,
                  isFavorite: true,
                };
              }
  
              const response =
                await fetch(
                  `/api/media/${asset.id}/favorite`,
                  {
                    method:
                      'POST',
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
                    `Unable to favorite "${asset.title || asset.fileName}".`
                );
              }
  
              return {
                id: asset.id,
                isFavorite: true,
              };
            }
          )
        );
  
      const updatedIds =
        new Set(
          results.map(
            (
              result
            ) =>
              result.id
          )
        );
  
      setMedia(
        (
          current
        ) =>
          current.map(
            (
              asset
            ) =>
              updatedIds.has(
                asset.id
              )
                ? {
                    ...asset,
                    isFavorite:
                      true,
                  }
                : asset
          )
      );
  
      setSelectedAsset(
        (
          current
        ) =>
          current &&
          updatedIds.has(
            current.id
          )
            ? {
                ...current,
                isFavorite:
                  true,
              }
            : current
      );
  
      setSelectedIds(
        new Set()
      );
    } catch (
      favoriteError
    ) {
      setError(
        favoriteError instanceof
          Error
          ? favoriteError.message
          : 'Unable to favorite the selected media.'
      );
  
      /*
       * Some requests may have succeeded before
       * another request failed, so refresh from
       * the server to restore accurate state.
       */
      await fetchMedia();
    } finally {
      setBulkLoadingAction(
        null
      );
    }
  }

  /* ======================================================= */
  /* UPLOAD CALLBACK */
  /* ======================================================= */

  async function handleUploaded(
    assets: MediaAsset[]
  ) {
    if (
      assets.length ===
      0
    ) {
      return;
    }

    /*
     * Server remains authoritative because the
     * current filters/status may exclude a newly
     * uploaded asset.
     */
    await fetchMedia();
  }

  /* ======================================================= */
  /* INSPECTOR UPDATE */
  /* ======================================================= */

  function handleInspectorUpdated(
    updated:
      MediaAsset
  ) {
    replaceAsset(
      updated
    );

    /*
     * A metadata edit may change filters/status,
     * so refresh shortly afterward from server.
     */
    void fetchMedia();
  }

  function handleInspectorDeleted(
    id: string
  ) {
    removeAsset(
      id
    );

    void fetchMedia();
  }

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-background
      "
    >
      <div
        className="
          mx-auto
          w-full
          max-w-[1600px]
          px-5
          py-6
          sm:px-6
          lg:px-8
        "
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <MediaLibraryHeader
          total={
            total
          }
          section={
            section
          }
          viewMode={
            viewMode
          }
          selectedCount={
            selectedIds.size
          }
          onSectionChange={
            handleSectionChange
          }
          onViewModeChange={
            handleViewModeChange
          }
          onUpload={() =>
            setUploadOpen(
              true
            )
          }
        />

        {/* ================================================= */}
        {/* SEARCH */}
        {/* ================================================= */}

        <MediaSearchBar
          search={
            search
          }
          sort={
            sort
          }
          filters={
            filters
          }
          onSearchChange={
            setSearch
          }
          onSortChange={
            setSort
          }
          onFiltersClick={() =>
            setFiltersOpen(
              true
            )
          }
          onClearFilters={
            resetFilters
          }
        />

        {/* ================================================= */}
        {/* ERROR */}
        {/* ================================================= */}

        {error && (
          <MediaErrorState
            message={
              error
            }
            onRetry={
              fetchMedia
            }
          />
        )}

        {/* ================================================= */}
        {/* CONTENT */}
        {/* ================================================= */}

        {loading ? (
          <MediaLoadingState
            label={
              dict.common
                .loading
            }
          />
        ) : media.length ===
          0 ? (
          <MediaEmptyState
            section={
              section
            }
            hasSearchOrFilters={
              hasSearchOrFilters
            }
            onClearFilters={
              resetFilters
            }
            onUpload={() =>
              setUploadOpen(
                true
              )
            }
          />
        ) : (
          <>
            <MediaGrid
              items={
                media
              }
              viewMode={
                viewMode
              }
              selectedIds={
                selectedIds
              }
              loadingAssetId={
                favoriteLoadingAssetId ??
                loadingAssetId
              }
              loadingAction={
                favoriteLoadingAssetId
                  ? 'favorite'
                  : loadingAssetAction
              }
              onOpen={
                setSelectedAsset
              }
              onToggleSelected={
                handleToggleSelected
              }
              onFavorite={
                handleFavorite
              }
              onApprove={(
                asset
              ) =>
                void runAssetWorkflow(
                  asset,
                  'approve'
                )
              }
              onArchive={(
                asset
              ) =>
                void runAssetWorkflow(
                  asset,
                  'archive'
                )
              }
              onTrash={(
                asset
              ) =>
                void runAssetWorkflow(
                  asset,
                  'trash'
                )
              }
              onRestore={(
                asset
              ) =>
                void runAssetWorkflow(
                  asset,
                  'restore'
                )
              }
            />

            <MediaPagination
              page={
                page
              }
              totalPages={
                totalPages
              }
              total={
                total
              }
              perPage={
                perPage
              }
              onPageChange={
                setPage
              }
            />
          </>
        )}

        {/* ================================================= */}
        {/* FILTER DRAWER */}
        {/* ================================================= */}

        <MediaFilters
          open={
            filtersOpen
          }
          filters={
            filters
          }
          onChange={
            setFilters
          }
          onReset={
            resetFilters
          }
          onClose={() =>
            setFiltersOpen(
              false
            )
          }
        />

        {/* ================================================= */}
        {/* UPLOAD DRAWER */}
        {/* ================================================= */}

        <MediaUploadDrawer
          open={
            uploadOpen
          }
          onClose={() =>
            setUploadOpen(
              false
            )
          }
          onUploaded={
            handleUploaded
          }
        />

        {/* ================================================= */}
        {/* INSPECTOR */}
        {/* ================================================= */}

        <MediaInspector
          asset={
            selectedAsset
          }
          open={Boolean(
            selectedAsset
          )}
          onClose={() =>
            setSelectedAsset(
              null
            )
          }
          onUpdated={
            handleInspectorUpdated
          }
          onDeleted={
            handleInspectorDeleted
          }
        />

        {/* ================================================= */}
        {/* BULK ACTIONS */}
        {/* ================================================= */}

        <MediaBulkActions
          selectedCount={
            selectedIds.size
          }
          mode={
            bulkMode
          }
          loadingAction={
            bulkLoadingAction
          }
          onApprove={() =>
            void runBulkWorkflow(
              'approve'
            )
          }
          onArchive={() =>
            void runBulkWorkflow(
              'archive'
            )
          }
          onTrash={() =>
            void runBulkWorkflow(
              'trash'
            )
          }
          onRestore={() =>
            void runBulkWorkflow(
              'restore'
            )
          }
          onFavorite={
            handleBulkFavorite
          }
          onClear={
            clearSelection
          }
        />
      </div>
    </div>
  );
}