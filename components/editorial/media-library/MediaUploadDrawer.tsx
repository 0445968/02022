'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AlertCircle,
  CheckCircle2,
  CloudUpload,
  FilePlus2,
  Info,
  Loader2,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';

import type {
  MediaAsset,
  MediaRightsStatus,
} from '@/types/editorial';

import {
  MediaUploadQueue,
} from './MediaUploadQueue';

import type {
  MediaUploadItem,
} from './MediaUploadQueue';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface MediaUploadDrawerProps {
  open: boolean;

  onClose: () => void;

  onUploaded?: (
    assets: MediaAsset[]
  ) => void;
}

interface UploadDefaults {
  photographer: string;

  credit: string;

  copyrightHolder: string;

  sourceName: string;

  rightsStatus:
    MediaRightsStatus;

  island: string;

  language: string;

  displayCaption: boolean;

  displayCredit: boolean;
}

/* ========================================================= */
/* DEFAULTS */
/* ========================================================= */

const DEFAULT_UPLOAD_VALUES: UploadDefaults = {
  photographer: '',

  credit: '',

  copyrightHolder: '',

  sourceName: '',

  rightsStatus: 'unknown',

  island: '',

  language: '',

  displayCaption: true,

  displayCredit: true,
};

const ACCEPTED_TYPES = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'text/plain',
  'text/csv',
].join(',');

/* ========================================================= */
/* HELPERS */
/* ========================================================= */

function createQueueId() {
  if (
    typeof crypto !== 'undefined' &&
    'randomUUID' in crypto
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createPreviewUrl(
  file: File
): string | null {
  if (
    file.type.startsWith(
      'image/'
    )
  ) {
    return URL.createObjectURL(
      file
    );
  }

  return null;
}

function stripExtension(
  fileName: string
): string {
  const lastDot =
    fileName.lastIndexOf(
      '.'
    );

  if (
    lastDot <= 0
  ) {
    return fileName;
  }

  return fileName.slice(
    0,
    lastDot
  );
}

function isSupportedFile(
  file: File
): boolean {
  if (
    file.type.startsWith(
      'image/'
    ) ||
    file.type.startsWith(
      'video/'
    ) ||
    file.type.startsWith(
      'audio/'
    )
  ) {
    return true;
  }

  return [
    'application/pdf',
    'text/plain',
    'text/csv',
  ].includes(
    file.type
  );
}

function parseUploadError(
  responseText: string
): string {
  try {
    const parsed =
      JSON.parse(
        responseText
      );

    if (
      typeof parsed?.error ===
      'string'
    ) {
      return parsed.error;
    }
  } catch {
    // Ignore invalid JSON and use fallback.
  }

  return 'Upload failed.';
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaUploadDrawer({
  open,
  onClose,
  onUploaded,
}: MediaUploadDrawerProps) {
  const inputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const queueRef =
    useRef<MediaUploadItem[]>(
      []
    );

  const [
    items,
    setItems,
  ] = useState<
    MediaUploadItem[]
  >([]);

  const [
    defaults,
    setDefaults,
  ] =
    useState<UploadDefaults>({
      ...DEFAULT_UPLOAD_VALUES,
    });

  const [
    dragging,
    setDragging,
  ] = useState(false);

  const [
    uploading,
    setUploading,
  ] = useState(false);

  const [
    batchError,
    setBatchError,
  ] = useState<
    string | null
  >(null);

  const [
    uploadComplete,
    setUploadComplete,
  ] = useState(false);

  /* ======================================================= */
  /* KEEP QUEUE REF CURRENT */
  /* ======================================================= */

  useEffect(
    () => {
      queueRef.current =
        items;
    },
    [
      items,
    ]
  );

  /* ======================================================= */
  /* CLEAN PREVIEW URLS ON UNMOUNT */
  /* ======================================================= */

  useEffect(
    () => {
      return () => {
        queueRef.current.forEach(
          (
            item
          ) => {
            if (
              item.previewUrl
            ) {
              URL.revokeObjectURL(
                item.previewUrl
              );
            }
          }
        );
      };
    },
    []
  );

  /* ======================================================= */
  /* ESCAPE TO CLOSE */
  /* ======================================================= */

  useEffect(
    () => {
      if (!open) {
        return;
      }

      function handleKeyDown(
        event: KeyboardEvent
      ) {
        if (
          event.key ===
            'Escape' &&
          !uploading
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
      open,
      onClose,
      uploading,
    ]
  );

  if (!open) {
    return null;
  }

  /* ======================================================= */
  /* QUEUE FILES */
  /* ======================================================= */

  function addFiles(
    incomingFiles:
      FileList | File[]
  ) {
    const files =
      Array.from(
        incomingFiles
      );

    if (
      files.length === 0
    ) {
      return;
    }

    setBatchError(
      null
    );

    setUploadComplete(
      false
    );

    const unsupported =
      files.filter(
        (
          file
        ) =>
          !isSupportedFile(
            file
          )
      );

    const supported =
      files.filter(
        isSupportedFile
      );

    if (
      unsupported.length >
      0
    ) {
      setBatchError(
        `${unsupported.length} ${
          unsupported.length ===
          1
            ? 'file was'
            : 'files were'
        } skipped because the file type is not currently supported.`
      );
    }

    if (
      supported.length ===
      0
    ) {
      return;
    }

    setItems(
      (
        current
      ) => {
        const existing =
          new Set(
            current.map(
              (
                item
              ) =>
                `${item.file.name}:${item.file.size}:${item.file.lastModified}`
            )
          );

        const additions =
          supported
            .filter(
              (
                file
              ) =>
                !existing.has(
                  `${file.name}:${file.size}:${file.lastModified}`
                )
            )
            .map(
              (
                file
              ): MediaUploadItem => ({
                id:
                  createQueueId(),

                file,

                previewUrl:
                  createPreviewUrl(
                    file
                  ),

                status:
                  'queued',

                progress:
                  0,

                error:
                  null,
              })
            );

        return [
          ...current,
          ...additions,
        ];
      }
    );
  }

  /* ======================================================= */
  /* REMOVE */
  /* ======================================================= */

  function removeItem(
    id: string
  ) {
    setItems(
      (
        current
      ) => {
        const target =
          current.find(
            (
              item
            ) =>
              item.id ===
              id
          );

        if (
          target?.previewUrl
        ) {
          URL.revokeObjectURL(
            target.previewUrl
          );
        }

        return current.filter(
          (
            item
          ) =>
            item.id !==
            id
        );
      }
    );
  }

  /* ======================================================= */
  /* CLEAR COMPLETED */
  /* ======================================================= */

  function clearCompleted() {
    setItems(
      (
        current
      ) => {
        current.forEach(
          (
            item
          ) => {
            if (
              item.status ===
                'success' &&
              item.previewUrl
            ) {
              URL.revokeObjectURL(
                item.previewUrl
              );
            }
          }
        );

        return current.filter(
          (
            item
          ) =>
            item.status !==
            'success'
        );
      }
    );

    setUploadComplete(
      false
    );
  }

  /* ======================================================= */
  /* UPDATE ITEM */
  /* ======================================================= */

  function patchQueueItem(
    id: string,
    patch:
      Partial<MediaUploadItem>
  ) {
    setItems(
      (
        current
      ) =>
        current.map(
          (
            item
          ) =>
            item.id === id
              ? {
                  ...item,
                  ...patch,
                }
              : item
        )
    );
  }

  /* ======================================================= */
  /* UPLOAD ONE FILE */
  /* ======================================================= */

  function uploadSingleFile(
    item:
      MediaUploadItem
  ): Promise<MediaAsset> {
    return new Promise(
      (
        resolve,
        reject
      ) => {
        const formData =
          new FormData();

        formData.append(
          'file',
          item.file
        );

        formData.append(
          'title',
          stripExtension(
            item.file.name
          )
        );

        if (
          defaults.photographer.trim()
        ) {
          formData.append(
            'photographer',
            defaults.photographer.trim()
          );
        }

        if (
          defaults.credit.trim()
        ) {
          formData.append(
            'credit',
            defaults.credit.trim()
          );
        }

        if (
          defaults.copyrightHolder.trim()
        ) {
          formData.append(
            'copyrightHolder',
            defaults.copyrightHolder.trim()
          );
        }

        if (
          defaults.sourceName.trim()
        ) {
          formData.append(
            'sourceName',
            defaults.sourceName.trim()
          );
        }

        formData.append(
          'rightsStatus',
          defaults.rightsStatus
        );

        if (
          defaults.island
        ) {
          formData.append(
            'island',
            defaults.island
          );
        }

        if (
          defaults.language
        ) {
          formData.append(
            'language',
            defaults.language
          );
        }

        formData.append(
          'displayCaption',
          String(
            defaults.displayCaption
          )
        );

        formData.append(
          'displayCredit',
          String(
            defaults.displayCredit
          )
        );

        const xhr =
          new XMLHttpRequest();

        xhr.open(
          'POST',
          '/api/media/upload'
        );

        xhr.upload.addEventListener(
          'progress',
          (
            event
          ) => {
            if (
              !event.lengthComputable
            ) {
              return;
            }

            const progress =
              (event.loaded /
                event.total) *
              100;

            patchQueueItem(
              item.id,
              {
                progress,
              }
            );
          }
        );

        xhr.addEventListener(
          'load',
          () => {
            if (
              xhr.status <
                200 ||
              xhr.status >=
                300
            ) {
              reject(
                new Error(
                  parseUploadError(
                    xhr.responseText
                  )
                )
              );

              return;
            }

            try {
              const result =
                JSON.parse(
                  xhr.responseText
                );

              const asset =
                result?.item ??
                result;

              if (
                !asset?.id
              ) {
                reject(
                  new Error(
                    'Upload completed but the media record was not returned.'
                  )
                );

                return;
              }

              resolve(
                asset as MediaAsset
              );
            } catch {
              reject(
                new Error(
                  'Upload completed but the server response could not be read.'
                )
              );
            }
          }
        );

        xhr.addEventListener(
          'error',
          () => {
            reject(
              new Error(
                'Network error while uploading.'
              )
            );
          }
        );

        xhr.addEventListener(
          'abort',
          () => {
            reject(
              new Error(
                'Upload was cancelled.'
              )
            );
          }
        );

        xhr.send(
          formData
        );
      }
    );
  }

  /* ======================================================= */
  /* UPLOAD BATCH */
  /* ======================================================= */

  async function uploadQueuedItems() {
    const queued =
      items.filter(
        (
          item
        ) =>
          item.status ===
            'queued' ||
          item.status ===
            'error'
      );

    if (
      queued.length ===
      0 ||
      uploading
    ) {
      return;
    }

    setUploading(
      true
    );

    setBatchError(
      null
    );

    setUploadComplete(
      false
    );

    const uploadedAssets:
      MediaAsset[] = [];

    for (
      const item of queued
    ) {
      patchQueueItem(
        item.id,
        {
          status:
            'uploading',

          progress:
            0,

          error:
            null,
        }
      );

      try {
        const asset =
          await uploadSingleFile(
            item
          );

        uploadedAssets.push(
          asset
        );

        patchQueueItem(
          item.id,
          {
            status:
              'success',

            progress:
              100,

            error:
              null,
          }
        );
      } catch (
        uploadError
      ) {
        patchQueueItem(
          item.id,
          {
            status:
              'error',

            progress:
              0,

            error:
              uploadError instanceof
                Error
                ? uploadError.message
                : 'Upload failed.',
          }
        );
      }
    }

    setUploading(
      false
    );

    if (
      uploadedAssets.length >
      0
    ) {
      onUploaded?.(
        uploadedAssets
      );
    }

    const failedCount =
      queueRef.current.filter(
        (
          item
        ) =>
          item.status ===
          'error'
      ).length;

    if (
      failedCount === 0
    ) {
      setUploadComplete(
        true
      );
    }
  }

  /* ======================================================= */
  /* RETRY */
  /* ======================================================= */

  async function retryItem(
    id: string
  ) {
    if (
      uploading
    ) {
      return;
    }

    const item =
      items.find(
        (
          candidate
        ) =>
          candidate.id ===
          id
      );

    if (!item) {
      return;
    }

    setUploading(
      true
    );

    patchQueueItem(
      id,
      {
        status:
          'uploading',

        progress:
          0,

        error:
          null,
      }
    );

    try {
      const asset =
        await uploadSingleFile(
          item
        );

      patchQueueItem(
        id,
        {
          status:
            'success',

          progress:
            100,

          error:
            null,
        }
      );

      onUploaded?.([
        asset,
      ]);
    } catch (
      retryError
    ) {
      patchQueueItem(
        id,
        {
          status:
            'error',

          progress:
            0,

          error:
            retryError instanceof
              Error
              ? retryError.message
              : 'Upload failed.',
        }
      );
    } finally {
      setUploading(
        false
      );
    }
  }

  /* ======================================================= */
  /* DRAG AND DROP */
  /* ======================================================= */

  function handleDragOver(
    event:
      React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    event.dataTransfer.dropEffect =
      'copy';

    setDragging(
      true
    );
  }

  function handleDragLeave(
    event:
      React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    if (
      event.currentTarget.contains(
        event.relatedTarget as Node
      )
    ) {
      return;
    }

    setDragging(
      false
    );
  }

  function handleDrop(
    event:
      React.DragEvent<HTMLDivElement>
  ) {
    event.preventDefault();

    setDragging(
      false
    );

    addFiles(
      event.dataTransfer.files
    );
  }

  /* ======================================================= */
  /* COUNTS */
  /* ======================================================= */

  const pendingCount =
    items.filter(
      (
        item
      ) =>
        item.status ===
          'queued' ||
        item.status ===
          'error'
    ).length;

  const successfulCount =
    items.filter(
      (
        item
      ) =>
        item.status ===
        'success'
    ).length;

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
          !uploading
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
          max-w-2xl
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
          <div>
            <p
              className="
                text-[10px]
                font-black
                uppercase
                tracking-[0.14em]
                text-primary
              "
            >
              Media Library
            </p>

            <h2
              className="
                mt-1
                font-headline
                text-2xl
                font-bold
                tracking-tight
                text-deep
              "
            >
              Upload media
            </h2>

            <p
              className="
                mt-1
                text-sm
                text-muted-foreground
              "
            >
              Add multiple newsroom assets and apply shared metadata before upload.
            </p>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            disabled={
              uploading
            }
            aria-label="Close upload panel"
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
              disabled:cursor-not-allowed
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
        {/* SCROLLABLE BODY */}
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
            {/* DROP ZONE */}
            {/* ============================================= */}

            <div
              onDragEnter={
                handleDragOver
              }
              onDragOver={
                handleDragOver
              }
              onDragLeave={
                handleDragLeave
              }
              onDrop={
                handleDrop
              }
              className={cn(
                `
                  flex
                  min-h-[220px]
                  flex-col
                  items-center
                  justify-center
                  rounded-xl
                  border-2
                  border-dashed
                  px-6
                  text-center
                  transition
                `,
                dragging
                  ? `
                    border-primary
                    bg-primary/5
                  `
                  : `
                    border-border
                    bg-surface-muted/35
                  `
              )}
            >
              <div
                className={cn(
                  `
                    flex
                    h-12
                    w-12
                    items-center
                    justify-center
                    rounded-xl
                  `,
                  dragging
                    ? `
                      bg-primary
                      text-white
                    `
                    : `
                      bg-white
                      text-primary
                      shadow-sm
                    `
                )}
              >
                <CloudUpload
                  className="
                    h-6
                    w-6
                  "
                  aria-hidden
                />
              </div>

              <h3
                className="
                  mt-4
                  text-base
                  font-bold
                  text-foreground
                "
              >
                {dragging
                  ? 'Drop files here'
                  : 'Drag and drop media'}
              </h3>

              <p
                className="
                  mt-1
                  max-w-md
                  text-sm
                  leading-6
                  text-muted-foreground
                "
              >
                Add images, video, audio, PDFs, or other supported newsroom files.
              </p>

              <button
                type="button"
                onClick={() =>
                  inputRef.current?.click()
                }
                disabled={
                  uploading
                }
                className="
                  mt-4
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-4
                  text-sm
                  font-bold
                  text-foreground
                  transition
                  hover:bg-surface-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                "
              >
                <FilePlus2
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />

                Choose files
              </button>

              <input
                ref={
                  inputRef
                }
                type="file"
                multiple
                accept={
                  ACCEPTED_TYPES
                }
                className="hidden"
                onChange={(
                  event
                ) => {
                  if (
                    event.target.files
                  ) {
                    addFiles(
                      event.target.files
                    );
                  }

                  event.target.value =
                    '';
                }}
              />
            </div>

            {/* ============================================= */}
            {/* ERROR */}
            {/* ============================================= */}

            {batchError && (
              <div
                className="
                  flex
                  gap-3
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
                <AlertCircle
                  className="
                    mt-0.5
                    h-4
                    w-4
                    shrink-0
                  "
                  aria-hidden
                />

                <p>
                  {
                    batchError
                  }
                </p>
              </div>
            )}

            {/* ============================================= */}
            {/* SUCCESS */}
            {/* ============================================= */}

            {uploadComplete &&
              successfulCount >
                0 && (
                <div
                  className="
                    flex
                    items-start
                    gap-3
                    rounded-xl
                    border
                    border-live/20
                    bg-live/5
                    px-4
                    py-3
                    text-sm
                    text-green-700
                  "
                >
                  <CheckCircle2
                    className="
                      mt-0.5
                      h-4
                      w-4
                      shrink-0
                    "
                    aria-hidden
                  />

                  <div>
                    <p
                      className="
                        font-semibold
                      "
                    >
                      Upload complete
                    </p>

                    <p
                      className="
                        mt-0.5
                      "
                    >
                      {successfulCount}{' '}
                      {successfulCount ===
                      1
                        ? 'asset was'
                        : 'assets were'}{' '}
                      added to the Media Library.
                    </p>
                  </div>
                </div>
              )}

            {/* ============================================= */}
            {/* SHARED METADATA */}
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
                  border-b
                  border-border
                  px-4
                  py-3
                "
              >
                <h3
                  className="
                    text-sm
                    font-bold
                    text-foreground
                  "
                >
                  Shared metadata
                </h3>

                <p
                  className="
                    mt-0.5
                    text-xs
                    leading-5
                    text-muted-foreground
                  "
                >
                  These values are applied to every queued file. Individual metadata can be edited later in the asset inspector.
                </p>
              </div>

              <div
                className="
                  grid
                  gap-4
                  p-4
                  sm:grid-cols-2
                "
              >
                <UploadField
                  label="Photographer"
                >
                  <input
                    value={
                      defaults.photographer
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          photographer:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Photographer or contributor"
                    className={
                      inputClassName
                    }
                  />
                </UploadField>

                <UploadField
                  label="Credit"
                >
                  <input
                    value={
                      defaults.credit
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          credit:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Photo: Name / WIT"
                    className={
                      inputClassName
                    }
                  />
                </UploadField>

                <UploadField
                  label="Copyright holder"
                >
                  <input
                    value={
                      defaults.copyrightHolder
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          copyrightHolder:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Rights holder"
                    className={
                      inputClassName
                    }
                  />
                </UploadField>

                <UploadField
                  label="Source"
                >
                  <input
                    value={
                      defaults.sourceName
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          sourceName:
                            event.target
                              .value,
                        })
                      )
                    }
                    placeholder="Agency, archive, institution..."
                    className={
                      inputClassName
                    }
                  />
                </UploadField>

                <UploadField
                  label="Rights"
                >
                  <select
                    value={
                      defaults.rightsStatus
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          rightsStatus:
                            event.target
                              .value as MediaRightsStatus,
                        })
                      )
                    }
                    className={
                      inputClassName
                    }
                  >
                    <option value="unknown">
                      Unknown
                    </option>

                    <option value="owned">
                      Owned by West Island Times
                    </option>

                    <option value="staff_created">
                      Staff created
                    </option>

                    <option value="freelancer">
                      Freelancer
                    </option>

                    <option value="licensed">
                      Licensed
                    </option>

                    <option value="wire_service">
                      Wire / agency
                    </option>

                    <option value="government">
                      Government
                    </option>

                    <option value="public_domain">
                      Public domain
                    </option>

                    <option value="creative_commons">
                      Creative Commons
                    </option>

                    <option value="reader_submitted">
                      Reader submitted
                    </option>

                    <option value="restricted">
                      Restricted
                    </option>
                  </select>
                </UploadField>

                <UploadField
                  label="Island / scope"
                >
                  <select
                    value={
                      defaults.island
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          island:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={
                      inputClassName
                    }
                  >
                    <option value="">
                      No location
                    </option>

                    <option value="san_andres">
                      San Andrés
                    </option>

                    <option value="old_providence">
                      Old Providence
                    </option>

                    <option value="saint_catalina">
                      Saint Catalina
                    </option>

                    <option value="archipelago">
                      Archipelago-wide
                    </option>

                    <option value="none">
                      Not location-specific
                    </option>
                  </select>
                </UploadField>

                <UploadField
                  label="Content language"
                >
                  <select
                    value={
                      defaults.language
                    }
                    onChange={(
                      event
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          language:
                            event.target
                              .value,
                        })
                      )
                    }
                    className={
                      inputClassName
                    }
                  >
                    <option value="">
                      Not specified
                    </option>

                    <option value="en">
                      English
                    </option>

                    <option value="es">
                      Spanish
                    </option>
                  </select>
                </UploadField>

                <div
                  className="
                    flex
                    flex-col
                    gap-3
                    sm:pt-6
                  "
                >
                  <ToggleField
                    checked={
                      defaults.displayCaption
                    }
                    onChange={(
                      checked
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          displayCaption:
                            checked,
                        })
                      )
                    }
                    label="Display caption by default"
                  />

                  <ToggleField
                    checked={
                      defaults.displayCredit
                    }
                    onChange={(
                      checked
                    ) =>
                      setDefaults(
                        (
                          current
                        ) => ({
                          ...current,
                          displayCredit:
                            checked,
                        })
                      )
                    }
                    label="Display credit by default"
                  />
                </div>
              </div>
            </section>

            {/* ============================================= */}
            {/* QUEUE */}
            {/* ============================================= */}

            <MediaUploadQueue
              items={
                items
              }
              onRemove={
                removeItem
              }
              onRetry={
                retryItem
              }
              onClearCompleted={
                clearCompleted
              }
            />

            {/* ============================================= */}
            {/* NOTE */}
            {/* ============================================= */}

            <div
              className="
                flex
                gap-3
                rounded-xl
                bg-surface-muted
                px-4
                py-3
                text-xs
                leading-5
                text-muted-foreground
              "
            >
              <Info
                className="
                  mt-0.5
                  h-4
                  w-4
                  shrink-0
                "
                aria-hidden
              />

              <p>
                Uploaded assets enter the Media Library with the workflow status configured by the server. Detailed captions, alt text, dates, rights restrictions, location, focal point, and archive metadata can be completed in the asset inspector.
              </p>
            </div>
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
            gap-4
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
            {items.length ===
            0 ? (
              'No files selected'
            ) : (
              <>
                {items.length}{' '}
                {items.length ===
                1
                  ? 'file'
                  : 'files'}{' '}
                in queue
              </>
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
              onClick={
                onClose
              }
              disabled={
                uploading
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
              {successfulCount >
                0 &&
              pendingCount ===
                0
                ? 'Done'
                : 'Cancel'}
            </button>

            <button
              type="button"
              onClick={
                uploadQueuedItems
              }
              disabled={
                pendingCount ===
                  0 ||
                uploading
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
              {uploading ? (
                <>
                  <Loader2
                    className="
                      h-4
                      w-4
                      animate-spin
                    "
                    aria-hidden
                  />

                  Uploading
                </>
              ) : (
                <>
                  <CloudUpload
                    className="
                      h-4
                      w-4
                    "
                    aria-hidden
                  />

                  Upload{' '}
                  {pendingCount >
                  0
                    ? `(${pendingCount})`
                    : ''}
                </>
              )}
            </button>
          </div>
        </div>
      </aside>
    </div>
  );
}

/* ========================================================= */
/* FIELD */
/* ========================================================= */

function UploadField({
  label,
  children,
}: {
  label: string;

  children:
    React.ReactNode;
}) {
  return (
    <label
      className="
        block
      "
    >
      <span
        className="
          mb-1.5
          block
          text-xs
          font-bold
          text-foreground
        "
      >
        {label}
      </span>

      {children}
    </label>
  );
}

/* ========================================================= */
/* TOGGLE */
/* ========================================================= */

function ToggleField({
  checked,
  onChange,
  label,
}: {
  checked: boolean;

  onChange: (
    checked: boolean
  ) => void;

  label: string;
}) {
  return (
    <label
      className="
        flex
        cursor-pointer
        items-center
        gap-2
        text-xs
        font-medium
        text-foreground
      "
    >
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .checked
          )
        }
        className="
          h-4
          w-4
          rounded
        "
      />

      {label}
    </label>
  );
}

/* ========================================================= */
/* STYLES */
/* ========================================================= */

const inputClassName = `
  h-10
  w-full
  rounded-lg
  border
  border-border
  bg-white
  px-3
  text-sm
  text-foreground
  outline-none
  transition
  placeholder:text-muted-foreground
  focus:border-primary
  focus:ring-2
  focus:ring-primary/10
`;