'use client';

import {
  AlertCircle,
  CheckCircle2,
  FileAudio,
  FileText,
  FileVideo,
  Image as ImageIcon,
  Loader2,
  RotateCcw,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

export type MediaUploadStatus =
  | 'queued'
  | 'uploading'
  | 'success'
  | 'error';

export interface MediaUploadItem {
  id: string;

  file: File;

  previewUrl: string | null;

  status: MediaUploadStatus;

  progress: number;

  error: string | null;
}

interface MediaUploadQueueProps {
  items: MediaUploadItem[];

  onRemove: (
    id: string
  ) => void;

  onRetry: (
    id: string
  ) => void;

  onClearCompleted: () => void;
}

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function formatFileSize(
  bytes: number
): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  const kb =
    bytes / 1024;

  if (kb < 1024) {
    return `${kb.toFixed(1)} KB`;
  }

  const mb =
    kb / 1024;

  if (mb < 1024) {
    return `${mb.toFixed(1)} MB`;
  }

  const gb =
    mb / 1024;

  return `${gb.toFixed(1)} GB`;
}

function getFileTypeLabel(
  file: File
): string {
  if (
    file.type.startsWith(
      'image/'
    )
  ) {
    return 'Image';
  }

  if (
    file.type.startsWith(
      'video/'
    )
  ) {
    return 'Video';
  }

  if (
    file.type.startsWith(
      'audio/'
    )
  ) {
    return 'Audio';
  }

  if (
    file.type ===
      'application/pdf' ||
    file.type.includes(
      'document'
    ) ||
    file.type.includes(
      'text'
    )
  ) {
    return 'Document';
  }

  return 'File';
}

function getStatusLabel(
  status: MediaUploadStatus
): string {
  switch (status) {
    case 'queued':
      return 'Ready';

    case 'uploading':
      return 'Uploading';

    case 'success':
      return 'Uploaded';

    case 'error':
      return 'Failed';

    default:
      return '';
  }
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaUploadQueue({
  items,
  onRemove,
  onRetry,
  onClearCompleted,
}: MediaUploadQueueProps) {
  if (
    items.length === 0
  ) {
    return null;
  }

  const completedCount =
    items.filter(
      (
        item
      ) =>
        item.status ===
        'success'
    ).length;

  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-white
      "
    >
      {/* ================================================= */}
      {/* HEADER */}
      {/* ================================================= */}

      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-border
          px-4
          py-3
        "
      >
        <div>
          <h3
            className="
              text-sm
              font-bold
              text-foreground
            "
          >
            Upload queue
          </h3>

          <p
            className="
              mt-0.5
              text-xs
              text-muted-foreground
            "
          >
            {items.length}{' '}
            {items.length === 1
              ? 'file'
              : 'files'}
          </p>
        </div>

        {completedCount >
          0 && (
          <button
            type="button"
            onClick={
              onClearCompleted
            }
            className="
              text-xs
              font-semibold
              text-muted-foreground
              transition
              hover:text-foreground
            "
          >
            Clear uploaded
          </button>
        )}
      </div>

      {/* ================================================= */}
      {/* ITEMS */}
      {/* ================================================= */}

      <div
        className="
          divide-y
          divide-border
        "
      >
        {items.map(
          (
            item
          ) => (
            <UploadQueueItem
              key={
                item.id
              }
              item={
                item
              }
              onRemove={
                onRemove
              }
              onRetry={
                onRetry
              }
            />
          )
        )}
      </div>
    </section>
  );
}

/* ========================================================= */
/* QUEUE ITEM */
/* ========================================================= */

function UploadQueueItem({
  item,
  onRemove,
  onRetry,
}: {
  item: MediaUploadItem;

  onRemove: (
    id: string
  ) => void;

  onRetry: (
    id: string
  ) => void;
}) {
  return (
    <div
      className="
        flex
        gap-3
        px-4
        py-3
      "
    >
      {/* ================================================= */}
      {/* PREVIEW */}
      {/* ================================================= */}

      <div
        className="
          h-14
          w-14
          shrink-0
          overflow-hidden
          rounded-lg
          bg-surface-muted
        "
      >
        <UploadPreview
          item={
            item
          }
        />
      </div>

      {/* ================================================= */}
      {/* DETAILS */}
      {/* ================================================= */}

      <div
        className="
          min-w-0
          flex-1
        "
      >
        <div
          className="
            flex
            items-start
            justify-between
            gap-3
          "
        >
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
              title={
                item.file
                  .name
              }
            >
              {
                item.file
                  .name
              }
            </p>

            <div
              className="
                mt-1
                flex
                flex-wrap
                items-center
                gap-x-2
                gap-y-1
                text-[11px]
                text-muted-foreground
              "
            >
              <span>
                {getFileTypeLabel(
                  item.file
                )}
              </span>

              <span
                aria-hidden
              >
                •
              </span>

              <span>
                {formatFileSize(
                  item.file
                    .size
                )}
              </span>
            </div>
          </div>

          <div
            className="
              flex
              shrink-0
              items-center
              gap-1
            "
          >
            {item.status ===
              'error' && (
              <button
                type="button"
                onClick={() =>
                  onRetry(
                    item.id
                  )
                }
                aria-label={`Retry ${item.file.name}`}
                title="Retry"
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  transition
                  hover:bg-surface-muted
                  hover:text-foreground
                "
              >
                <RotateCcw
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>
            )}

            {item.status !==
              'uploading' && (
              <button
                type="button"
                onClick={() =>
                  onRemove(
                    item.id
                  )
                }
                aria-label={`Remove ${item.file.name}`}
                title="Remove"
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  transition
                  hover:bg-breaking/5
                  hover:text-breaking
                "
              >
                <Trash2
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />
              </button>
            )}
          </div>
        </div>

        {/* ================================================= */}
        {/* STATUS */}
        {/* ================================================= */}

        <div
          className="
            mt-2
          "
        >
          <div
            className="
              flex
              items-center
              justify-between
              gap-3
            "
          >
            <StatusLabel
              item={
                item
              }
            />

            {item.status ===
              'uploading' && (
              <span
                className="
                  text-[11px]
                  font-semibold
                  text-muted-foreground
                "
              >
                {Math.round(
                  item.progress
                )}
                %
              </span>
            )}
          </div>

          {item.status ===
            'uploading' && (
            <div
              className="
                mt-2
                h-1.5
                overflow-hidden
                rounded-full
                bg-surface-subtle
              "
            >
              <div
                className="
                  h-full
                  rounded-full
                  bg-primary
                  transition-[width]
                  duration-300
                "
                style={{
                  width: `${Math.max(
                    0,
                    Math.min(
                      100,
                      item.progress
                    )
                  )}%`,
                }}
              />
            </div>
          )}

          {item.status ===
            'error' &&
            item.error && (
              <p
                className="
                  mt-1.5
                  text-xs
                  leading-5
                  text-breaking
                "
              >
                {
                  item.error
                }
              </p>
            )}
        </div>
      </div>
    </div>
  );
}

/* ========================================================= */
/* STATUS */
/* ========================================================= */

function StatusLabel({
  item,
}: {
  item: MediaUploadItem;
}) {
  const baseClass =
    `
      inline-flex
      items-center
      gap-1.5
      text-[11px]
      font-semibold
    `;

  switch (
    item.status
  ) {
    case 'uploading':
      return (
        <span
          className={cn(
            baseClass,
            'text-primary'
          )}
        >
          <Loader2
            className="
              h-3.5
              w-3.5
              animate-spin
            "
            aria-hidden
          />

          {getStatusLabel(
            item.status
          )}
        </span>
      );

    case 'success':
      return (
        <span
          className={cn(
            baseClass,
            'text-green-700'
          )}
        >
          <CheckCircle2
            className="
              h-3.5
              w-3.5
            "
            aria-hidden
          />

          {getStatusLabel(
            item.status
          )}
        </span>
      );

    case 'error':
      return (
        <span
          className={cn(
            baseClass,
            'text-breaking'
          )}
        >
          <AlertCircle
            className="
              h-3.5
              w-3.5
            "
            aria-hidden
          />

          {getStatusLabel(
            item.status
          )}
        </span>
      );

    case 'queued':
    default:
      return (
        <span
          className={cn(
            baseClass,
            'text-muted-foreground'
          )}
        >
          {getStatusLabel(
            item.status
          )}
        </span>
      );
  }
}

/* ========================================================= */
/* PREVIEW */
/* ========================================================= */

function UploadPreview({
  item,
}: {
  item: MediaUploadItem;
}) {
  if (
    item.previewUrl &&
    item.file.type.startsWith(
      'image/'
    )
  ) {
    return (
      <img
        src={
          item.previewUrl
        }
        alt=""
        className="
          h-full
          w-full
          object-cover
        "
      />
    );
  }

  if (
    item.file.type.startsWith(
      'video/'
    )
  ) {
    return (
      <FallbackPreview>
        <FileVideo
          className="
            h-5
            w-5
          "
          aria-hidden
        />
      </FallbackPreview>
    );
  }

  if (
    item.file.type.startsWith(
      'audio/'
    )
  ) {
    return (
      <FallbackPreview>
        <FileAudio
          className="
            h-5
            w-5
          "
          aria-hidden
        />
      </FallbackPreview>
    );
  }

  if (
    item.file.type ===
      'application/pdf' ||
    item.file.type.includes(
      'document'
    ) ||
    item.file.type.includes(
      'text'
    )
  ) {
    return (
      <FallbackPreview>
        <FileText
          className="
            h-5
            w-5
          "
          aria-hidden
        />
      </FallbackPreview>
    );
  }

  return (
    <FallbackPreview>
      <ImageIcon
        className="
          h-5
          w-5
        "
        aria-hidden
      />
    </FallbackPreview>
  );
}

function FallbackPreview({
  children,
}: {
  children:
    React.ReactNode;
}) {
  return (
    <div
      className="
        flex
        h-full
        w-full
        items-center
        justify-center
        text-muted-foreground
      "
    >
      {children}
    </div>
  );
}