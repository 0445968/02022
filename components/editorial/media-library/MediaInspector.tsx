'use client';

import {
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Archive,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaMetadataForm,
  mediaAssetToMetadataValues,
} from './MediaMetadataForm';

import type {
  MediaMetadataValues,
} from './MediaMetadataForm';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaInspectorProps {
  asset: MediaAsset | null;

  open: boolean;

  onClose: () => void;

  onUpdated?: (
    asset: MediaAsset
  ) => void;

  onDeleted?: (
    id: string
  ) => void;
}

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
    return 'Unknown';
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
    return `${kb.toFixed(1)} KB`;
  }

  const mb =
    kb / 1024;

  if (
    mb < 1024
  ) {
    return `${mb.toFixed(1)} MB`;
  }

  return `${(
    mb / 1024
  ).toFixed(1)} GB`;
}

function formatDate(
  value:
    | string
    | null
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'en',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  ).format(date);
}

function formatDimensions(
  asset: MediaAsset
): string {
  if (
    asset.width === null ||
    asset.height === null
  ) {
    return '—';
  }

  return `${asset.width} × ${asset.height}`;
}

function nullableString(
  value: string
): string | null {
  const trimmed =
    value.trim();

  return trimmed
    ? trimmed
    : null;
}

function nullableNumber(
  value: string
): number | null {
  const trimmed =
    value.trim();

  if (!trimmed) {
    return null;
  }

  const parsed =
    Number(trimmed);

  return Number.isFinite(
    parsed
  )
    ? parsed
    : null;
}

function dateTimeToIso(
  value: string
): string | null {
  if (!value) {
    return null;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date.toISOString();
}

function buildUpdatePayload(
  values:
    MediaMetadataValues
) {
  return {
    title:
      nullableString(
        values.title
      ),

    altText:
      values.altText,

    caption:
      nullableString(
        values.caption
      ),

    description:
      nullableString(
        values.description
      ),

    credit:
      nullableString(
        values.credit
      ),

    photographer:
      nullableString(
        values.photographer
      ),

    creatorName:
      nullableString(
        values.creatorName
      ),

    copyrightHolder:
      nullableString(
        values.copyrightHolder
      ),

    sourceName:
      nullableString(
        values.sourceName
      ),

    sourceUrl:
      nullableString(
        values.sourceUrl
      ),

    status:
      values.status,

    rightsStatus:
      values.rightsStatus,

    licenseName:
      nullableString(
        values.licenseName
      ),

    rightsNotes:
      nullableString(
        values.rightsNotes
      ),

    allowedUses:
      values.allowedUses,

    restrictions:
      values.restrictions,

    licenseExpiresAt:
      dateTimeToIso(
        values.licenseExpiresAt
      ),

    embargoUntil:
      dateTimeToIso(
        values.embargoUntil
      ),

    dateCreated:
      values.dateCreated ||
      null,

    approximateDate:
      nullableString(
        values.approximateDate
      ),

    island:
      values.island ||
      null,

    country:
      nullableString(
        values.country
      ),

    region:
      nullableString(
        values.region
      ),

    city:
      nullableString(
        values.city
      ),

    neighborhood:
      nullableString(
        values.neighborhood
      ),

    locationName:
      nullableString(
        values.locationName
      ),

    latitude:
      nullableNumber(
        values.latitude
      ),

    longitude:
      nullableNumber(
        values.longitude
      ),

    language:
      nullableString(
        values.language
      ),

    categoryId:
      nullableString(
        values.categoryId
      ),

    focalPointX:
      nullableNumber(
        values.focalPointX
      ),

    focalPointY:
      nullableNumber(
        values.focalPointY
      ),

    displayCaption:
      values.displayCaption,

    displayCredit:
      values.displayCredit,

    decorative:
      values.decorative,

    sensitiveLevel:
      values.sensitiveLevel,

    internalNotes:
      nullableString(
        values.internalNotes
      ),
  };
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaInspector({
  asset,
  open,
  onClose,
  onUpdated,
  onDeleted,
}: MediaInspectorProps) {
  const [
    values,
    setValues,
  ] =
    useState<MediaMetadataValues | null>(
      null
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    actionLoading,
    setActionLoading,
  ] = useState<
    string | null
  >(null);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    saved,
    setSaved,
  ] = useState(false);

  useEffect(
    () => {
      if (!asset) {
        setValues(
          null
        );

        return;
      }

      setValues(
        mediaAssetToMetadataValues(
          asset
        )
      );

      setError(
        null
      );

      setSaved(
        false
      );
    },
    [
      asset,
    ]
  );

  const dirty =
    useMemo(
      () => {
        if (
          !asset ||
          !values
        ) {
          return false;
        }

        return (
          JSON.stringify(
            values
          ) !==
          JSON.stringify(
            mediaAssetToMetadataValues(
              asset
            )
          )
        );
      },
      [
        asset,
        values,
      ]
    );

  if (
    !open ||
    !asset ||
    !values
  ) {
    return null;
  }

  /* ======================================================= */
  /* SAVE */
  /* ======================================================= */

  async function handleSave() {
    if (
      saving ||
      !dirty
    ) {
      return;
    }

    setSaving(
      true
    );

    setError(
      null
    );

    setSaved(
      false
    );

    try {
      const response =
        await fetch(
          `/api/media/${asset?.id}`,
          {
            method:
              'PATCH',

            headers: {
              'Content-Type':
                'application/json',
            },

            body:
              JSON.stringify(
                buildUpdatePayload(
                  values
                )
              ),
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
            'Unable to save media metadata.'
        );
      }

      const updated =
        result?.item ??
        result;

      if (
        !updated?.id
      ) {
        throw new Error(
          'The media record was saved but the updated asset was not returned.'
        );
      }

      onUpdated?.(
        updated as MediaAsset
      );

      setValues(
        mediaAssetToMetadataValues(
          updated as MediaAsset
        )
      );

      setSaved(
        true
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof
          Error
          ? saveError.message
          : 'Unable to save media metadata.'
      );
    } finally {
      setSaving(
        false
      );
    }
  }

  /* ======================================================= */
  /* WORKFLOW ACTION */
  /* ======================================================= */

  async function runAction(
    action:
      | 'approve'
      | 'archive'
      | 'trash'
      | 'restore'
  ) {
    if (
      actionLoading
    ) {
      return;
    }

    setActionLoading(
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
            `Unable to ${action} asset.`
        );
      }

      const updated =
        result?.item ??
        result;

      if (
        !updated?.id
      ) {
        throw new Error(
          'The workflow action completed but the updated asset was not returned.'
        );
      }

      onUpdated?.(
        updated as MediaAsset
      );

      setValues(
        mediaAssetToMetadataValues(
          updated as MediaAsset
        )
      );
    } catch (
      actionError
    ) {
      setError(
        actionError instanceof
          Error
          ? actionError.message
          : `Unable to ${action} asset.`
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  /* ======================================================= */
  /* PERMANENT DELETE */
  /* ======================================================= */

  async function handlePermanentDelete() {
    if (
      actionLoading
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        'Permanently delete this media asset and its stored file? This cannot be undone.'
      );

    if (
      !confirmed
    ) {
      return;
    }

    setActionLoading(
      'delete'
    );

    setError(
      null
    );

    try {
      const response =
        await fetch(
          `/api/media/${asset.id}?permanent=true`,
          {
            method:
              'DELETE',
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
            'Unable to permanently delete media.'
        );
      }

      onDeleted?.(
        asset.id
      );

      onClose();
    } catch (
      deleteError
    ) {
      setError(
        deleteError instanceof
          Error
          ? deleteError.message
          : 'Unable to permanently delete media.'
      );
    } finally {
      setActionLoading(
        null
      );
    }
  }

  /* ======================================================= */
  /* COPY URL */
  /* ======================================================= */

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(
        asset.url
      );
    } catch {
      setError(
        'Unable to copy the media URL.'
      );
    }
  }

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
        justify-end
        bg-black/30
        backdrop-blur-[1px]
      "
      onMouseDown={() => {
        if (
          !saving &&
          !actionLoading
        ) {
          onClose();
        }
      }}
    >
      <aside
        className="
          flex
          h-full
          w-full
          max-w-3xl
          flex-col
          border-l
          border-border
          bg-background
          shadow-2xl
        "
        onMouseDown={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* ================================================= */}
        {/* HEADER */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-start
            justify-between
            gap-4
            border-b
            border-border
            bg-white
            px-5
            py-4
          "
        >
          <div
            className="
              min-w-0
            "
          >
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-primary
              "
            >
              Media asset
            </p>

            <h2
              className="
                mt-1
                truncate
                font-headline
                text-xl
                font-bold
                text-deep
              "
            >
              {asset.title ||
                asset.fileName}
            </h2>

            <p
              className="
                mt-1
                truncate
                text-xs
                text-muted-foreground
              "
            >
              {
                asset.fileName
              }
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              saving ||
              Boolean(
                actionLoading
              )
            }
            aria-label="Close media inspector"
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
              disabled:opacity-40
            "
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

        {/* ================================================= */}
        {/* BODY */}
        {/* ================================================= */}

        <div
          className="
            flex-1
            overflow-y-auto
          "
        >
          <div
            className="
              space-y-5
              p-5
            "
          >
            {/* ============================================= */}
            {/* PREVIEW */}
            {/* ============================================= */}

            <section
              className="
                overflow-hidden
                rounded-xl
                border
                border-border
                bg-white
              "
            >
              <div
                className="
                  aspect-video
                  overflow-hidden
                  bg-surface-muted
                "
              >
                <InspectorPreview
                  asset={
                    asset
                  }
                />
              </div>

              <div
                className="
                  grid
                  gap-3
                  border-t
                  border-border
                  p-4
                  sm:grid-cols-2
                  lg:grid-cols-4
                "
              >
                <InfoItem
                  label="Type"
                  value={
                    asset.assetType
                  }
                />

                <InfoItem
                  label="Dimensions"
                  value={formatDimensions(
                    asset
                  )}
                />

                <InfoItem
                  label="File size"
                  value={formatFileSize(
                    asset.fileSize
                  )}
                />

                <InfoItem
                  label="Uploaded"
                  value={formatDate(
                    asset.createdAt
                  )}
                />
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                  border-t
                  border-border
                  px-4
                  py-3
                "
              >
                <button
                  type="button"
                  onClick={
                    copyUrl
                  }
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-3
                    text-xs
                    font-semibold
                    text-foreground
                    transition
                    hover:bg-surface-muted
                  "
                >
                  <Copy
                    className="
                      h-3.5
                      w-3.5
                    "
                    aria-hidden
                  />

                  Copy URL
                </button>

                <a
                  href={
                    asset.url
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-3
                    text-xs
                    font-semibold
                    text-foreground
                    transition
                    hover:bg-surface-muted
                  "
                >
                  <ExternalLink
                    className="
                      h-3.5
                      w-3.5
                    "
                    aria-hidden
                  />

                  Open original
                </a>
              </div>
            </section>

            {/* ============================================= */}
            {/* ERROR */}
            {/* ============================================= */}

            {error && (
              <div
                className="
                  rounded-xl
                  border
                  border-breaking/20
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

            {/* ============================================= */}
            {/* METADATA */}
            {/* ============================================= */}

            <MediaMetadataForm
              values={
                values
              }
              onChange={
                setValues
              }
              disabled={
                saving ||
                Boolean(
                  actionLoading
                )
              }
            />

            {/* ============================================= */}
            {/* WORKFLOW */}
            {/* ============================================= */}

            <section
              className="
                rounded-xl
                border
                border-border
                bg-white
                p-4
              "
            >
              <h3
                className="
                  text-sm
                  font-bold
                  text-foreground
                "
              >
                Asset workflow
              </h3>

              <p
                className="
                  mt-1
                  text-xs
                  leading-5
                  text-muted-foreground
                "
              >
                Approval, archive, trash, and permanent deletion are handled separately from metadata edits.
              </p>

              <div
                className="
                  mt-4
                  flex
                  flex-wrap
                  gap-2
                "
              >
                {asset.status !==
                  'approved' &&
                  asset.status !==
                    'trashed' && (
                    <WorkflowButton
                      label="Approve"
                      icon={
                        CheckCircle2
                      }
                      loading={
                        actionLoading ===
                        'approve'
                      }
                      onClick={() =>
                        runAction(
                          'approve'
                        )
                      }
                    />
                  )}

                {asset.status !==
                  'archived' &&
                  asset.status !==
                    'trashed' && (
                    <WorkflowButton
                      label="Archive"
                      icon={
                        Archive
                      }
                      loading={
                        actionLoading ===
                        'archive'
                      }
                      onClick={() =>
                        runAction(
                          'archive'
                        )
                      }
                    />
                  )}

                {asset.status !==
                  'trashed' && (
                    <WorkflowButton
                      label="Move to trash"
                      icon={
                        Trash2
                      }
                      danger
                      loading={
                        actionLoading ===
                        'trash'
                      }
                      onClick={() =>
                        runAction(
                          'trash'
                        )
                      }
                    />
                  )}

                {asset.status ===
                  'trashed' && (
                  <>
                    <WorkflowButton
                      label="Restore"
                      icon={
                        RotateCcw
                      }
                      loading={
                        actionLoading ===
                        'restore'
                      }
                      onClick={() =>
                        runAction(
                          'restore'
                        )
                      }
                    />

                    <WorkflowButton
                      label="Delete permanently"
                      icon={
                        Trash2
                      }
                      danger
                      loading={
                        actionLoading ===
                        'delete'
                      }
                      onClick={
                        handlePermanentDelete
                      }
                    />
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* ================================================= */}
        {/* FOOTER */}
        {/* ================================================= */}

        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-t
            border-border
            bg-white
            px-5
            py-4
          "
        >
          <div
            className="
              min-w-0
              text-xs
              text-muted-foreground
            "
          >
            {saved ? (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  text-green-700
                "
              >
                <CheckCircle2
                  className="
                    h-3.5
                    w-3.5
                  "
                  aria-hidden
                />

                Saved
              </span>
            ) : dirty ? (
              'Unsaved changes'
            ) : (
              'No changes'
            )}
          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={() =>
                setValues(
                  mediaAssetToMetadataValues(
                    asset
                  )
                )
              }
              disabled={
                !dirty ||
                saving ||
                Boolean(
                  actionLoading
                )
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                rounded-lg
                border
                border-border
                bg-white
                px-4
                text-sm
                font-semibold
                text-foreground
                transition
                hover:bg-surface-muted
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              Revert
            </button>

            <button
              type="button"
              onClick={
                handleSave
              }
              disabled={
                !dirty ||
                saving ||
                Boolean(
                  actionLoading
                )
              }
              className="
                inline-flex
                h-10
                items-center
                justify-center
                gap-2
                rounded-lg
                bg-deep
                px-5
                text-sm
                font-bold
                text-white
                transition
                hover:opacity-90
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              {saving && (
                <Loader2
                  className="
                    h-4
                    w-4
                    animate-spin
                  "
                  aria-hidden
                />
              )}

              Save changes
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ========================================================= */
/* PREVIEW */
/* ========================================================= */

function InspectorPreview({
  asset,
}: {
  asset: MediaAsset;
}) {
  if (
    asset.assetType ===
      'image' ||
    asset.assetType ===
      'graphic' ||
    asset.assetType ===
      'logo' ||
    asset.assetType ===
      'social'
  ) {
    return (
      <img
        src={
          asset.url
        }
        alt={
          asset.altText
        }
        className="
          h-full
          w-full
          object-contain
        "
      />
    );
  }

  if (
    asset.assetType ===
      'video' ||
    asset.assetType ===
      'broadcast'
  ) {
    return (
      <PreviewFallback
        icon={
          FileVideo
        }
        label="Video"
      />
    );
  }

  if (
    asset.assetType ===
    'audio'
  ) {
    return (
      <PreviewFallback
        icon={
          FileAudio
        }
        label="Audio"
      />
    );
  }

  if (
    asset.assetType ===
    'document'
  ) {
    return (
      <PreviewFallback
        icon={
          FileText
        }
        label="Document"
      />
    );
  }

  return (
    <PreviewFallback
      icon={
        ImageIcon
      }
      label="Media"
    />
  );
}

function PreviewFallback({
  icon: Icon,
  label,
}: {
  icon: typeof ImageIcon;

  label: string;
}) {
  return (
    <div
      className="
        flex
        h-full
        w-full
        flex-col
        items-center
        justify-center
        gap-3
        text-muted-foreground
      "
    >
      <Icon
        className="
          h-10
          w-10
        "
        aria-hidden
      />

      <span
        className="
          text-sm
          font-semibold
        "
      >
        {label}
      </span>
    </div>
  );
}

/* ========================================================= */
/* INFO ITEM */
/* ========================================================= */

function InfoItem({
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
          truncate
          text-sm
          font-semibold
          text-foreground
        "
      >
        {value}
      </p>
    </div>
  );
}

/* ========================================================= */
/* WORKFLOW BUTTON */
/* ========================================================= */

function WorkflowButton({
  label,
  icon: Icon,
  loading,
  danger = false,
  onClick,
}: {
  label: string;

  icon: typeof Archive;

  loading?: boolean;

  danger?: boolean;

  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        loading
      }
      className={cn(
        `
          inline-flex
          h-9
          items-center
          justify-center
          gap-2
          rounded-lg
          border
          px-3
          text-xs
          font-bold
          transition
          disabled:cursor-not-allowed
          disabled:opacity-50
        `,
        danger
          ? `
            border-breaking/20
            bg-breaking/5
            text-breaking
            hover:bg-breaking/10
          `
          : `
            border-border
            bg-white
            text-foreground
            hover:bg-surface-muted
          `
      )}
    >
      {loading ? (
        <Loader2
          className="
            h-3.5
            w-3.5
            animate-spin
          "
          aria-hidden
        />
      ) : (
        <Icon
          className="
            h-3.5
            w-3.5
          "
          aria-hidden
        />
      )}

      {label}
    </button>
  );
}