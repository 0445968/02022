'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  EditorContent,
  useEditor,
} from '@tiptap/react';

import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';

import {
  Bold,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo,
  Underline as UnderlineIcon,
  Undo,
  X,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaPicker,
} from '@/components/editorial/media-picker';

import {
  cn,
} from '@/lib/utils';

/**
 * Extends TipTap's regular image node with
 * story-specific editorial metadata.
 *
 * These values are stored directly inside the
 * story body JSON:
 *
 * {
 *   type: 'image',
 *   attrs: {
 *     src: '...',
 *     alt: '...',
 *     description: '...',
 *     credit: '...'
 *   }
 * }
 */
const StoryImage =
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),

        description: {
          default: null,

          parseHTML: (
            element
          ) =>
            element.getAttribute(
              'data-description'
            ),

          renderHTML: (
            attributes
          ) => {
            if (
              !attributes.description
            ) {
              return {};
            }

            return {
              'data-description':
                attributes.description,
            };
          },
        },

        credit: {
          default: null,

          parseHTML: (
            element
          ) =>
            element.getAttribute(
              'data-credit'
            ),

          renderHTML: (
            attributes
          ) => {
            if (
              !attributes.credit
            ) {
              return {};
            }

            return {
              'data-credit':
                attributes.credit,
            };
          },
        },
      };
    },
  }).configure({
    inline: false,

    allowBase64: false,

    HTMLAttributes: {
      class:
        'story-inline-image',
    },
  });

interface RichTextEditorProps {
  content: Record<
    string,
    unknown
  >;

  onChange: (
    json: Record<
      string,
      unknown
    >
  ) => void;

  placeholder?: string;

  dict: Dictionary;

  userId: string;
}

export function RichTextEditor({
  content,
  onChange,
  placeholder,
  dict,
  userId,
}: RichTextEditorProps) {
  const [
    mediaPickerOpen,
    setMediaPickerOpen,
  ] = useState(false);

  const [
    selectedImage,
    setSelectedImage,
  ] =
    useState<MediaAsset | null>(
      null
    );

  const [
    imageDescription,
    setImageDescription,
  ] = useState('');

  const [
    imageCredit,
    setImageCredit,
  ] = useState('');

  /**
   * Remember where the cursor was before
   * the Media Library/modal opens.
   */
  const imageInsertPositionRef =
    useRef<number | null>(
      null
    );

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [2, 3],
        },
      }),

      Underline,

      Link.configure({
        openOnClick: false,

        HTMLAttributes: {
          class:
            'text-primary underline',
        },
      }),

      StoryImage,

      Placeholder.configure({
        placeholder:
          placeholder ??
          'Begin writing your story…',

        emptyEditorClass:
          'before:text-muted-foreground before:content-[attr(data-placeholder)] before:float-left before:h-0 before:pointer-events-none',
      }),
    ],

    content:
      content &&
      Object.keys(content)
        .length > 0
        ? content
        : {
            type: 'doc',

            content: [
              {
                type:
                  'paragraph',
              },
            ],
          },

    editorProps: {
      attributes: {
        class:
          'prose-editor focus:outline-none min-h-[400px] font-interface text-base leading-relaxed text-foreground',
      },
    },

    onUpdate: ({
      editor:
        updatedEditor,
    }) => {
      onChange(
        updatedEditor.getJSON() as Record<
          string,
          unknown
        >
      );
    },
  });

  /**
   * Keep TipTap synchronized if the body is
   * replaced externally, for example after
   * restoring a saved version.
   *
   * emitUpdate=false prevents this synchronization
   * from being treated as a user edit.
   */
  useEffect(() => {
    if (!editor) {
      return;
    }

    const currentJson =
      JSON.stringify(
        editor.getJSON()
      );

    const nextContent =
      content &&
      Object.keys(content)
        .length > 0
        ? content
        : {
            type: 'doc',

            content: [
              {
                type:
                  'paragraph',
              },
            ],
          };

    const nextJson =
      JSON.stringify(
        nextContent
      );

    if (
      currentJson !==
      nextJson
    ) {
      editor.commands.setContent(
        nextContent,
        false
      );
    }
  }, [
    content,
    editor,
  ]);

  if (!editor) {
    return (
      <div className="min-h-[400px] bg-surface-muted" />
    );
  }

  /**
   * TypeScript will not preserve the non-null
   * editor narrowing inside nested callbacks.
   */
  const ed = editor;

  // --------------------------------------------------
  // Links
  // --------------------------------------------------

  function setLink() {
    const previousUrl =
      ed.getAttributes(
        'link'
      ).href as
        | string
        | undefined;

    const url =
      window.prompt(
        'URL',
        previousUrl ??
          'https://'
      );

    if (url === null) {
      return;
    }

    if (url === '') {
      ed
        .chain()
        .focus()
        .extendMarkRange(
          'link'
        )
        .unsetLink()
        .run();

      return;
    }

    ed
      .chain()
      .focus()
      .extendMarkRange(
        'link'
      )
      .setLink({
        href: url,
      })
      .run();
  }

  // --------------------------------------------------
  // Media Library
  // --------------------------------------------------

  function openImagePicker() {
    imageInsertPositionRef.current =
      ed.state.selection.from;

    setSelectedImage(
      null
    );

    setImageDescription(
      ''
    );

    setImageCredit(
      ''
    );

    setMediaPickerOpen(
      true
    );
  }

  /**
   * Selecting an image no longer inserts it
   * immediately.
   *
   * Instead, we close the media library and
   * open the image metadata step.
   */
  function handleImageSelected(
    media: MediaAsset
  ) {
    setSelectedImage(
      media
    );

    /*
     * Use the Media Library metadata as defaults.
     * The author can override these for this
     * particular story without altering the
     * original media record.
     */
    setImageDescription(
      media.caption ?? ''
    );

    setImageCredit(
      media.credit ?? ''
    );

    setMediaPickerOpen(
      false
    );
  }

  function cancelImageInsert() {
    setSelectedImage(
      null
    );

    setImageDescription(
      ''
    );

    setImageCredit(
      ''
    );

    imageInsertPositionRef.current =
      null;

    ed
      .chain()
      .focus()
      .run();
  }

  function insertSelectedImage() {
    if (!selectedImage) {
      return;
    }

    const position =
      imageInsertPositionRef.current;

    let chain =
      ed
        .chain()
        .focus();

    /**
     * Restore the cursor position that existed before
     * the Media Library opened.
     */
    if (
      position !== null
    ) {
      const maxPosition =
        ed.state.doc
          .content.size;

      const safePosition =
        Math.min(
          position,
          maxPosition
        );

      chain =
        chain.setTextSelection(
          safePosition
        );
    }

    /**
     * Use insertContent instead of setImage so
     * our custom image attributes can be stored
     * directly in the TipTap document JSON.
     */
    chain
      .insertContent({
        type: 'image',

        attrs: {
          src:
            selectedImage.url,

          alt:
            selectedImage.altText ||
            selectedImage.fileName,

          title:
            selectedImage.fileName,

          description:
            imageDescription.trim() ||
            null,

          credit:
            imageCredit.trim() ||
            null,
        },
      })
      .run();

    imageInsertPositionRef.current =
      null;

    setSelectedImage(
      null
    );

    setImageDescription(
      ''
    );

    setImageCredit(
      ''
    );
  }

  return (
    <>
      <div className="border border-border bg-white">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-surface-muted px-2 py-1.5">
          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleBold()
                .run()
            }
            active={ed.isActive(
              'bold'
            )}
            label="Bold"
            icon={Bold}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleItalic()
                .run()
            }
            active={ed.isActive(
              'italic'
            )}
            label="Italic"
            icon={Italic}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleUnderline()
                .run()
            }
            active={ed.isActive(
              'underline'
            )}
            label="Underline"
            icon={
              UnderlineIcon
            }
          />

          <Divider />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleHeading({
                  level: 2,
                })
                .run()
            }
            active={ed.isActive(
              'heading',
              {
                level: 2,
              }
            )}
            label="Heading 2"
            icon={Heading2}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleHeading({
                  level: 3,
                })
                .run()
            }
            active={ed.isActive(
              'heading',
              {
                level: 3,
              }
            )}
            label="Heading 3"
            icon={Heading3}
          />

          <Divider />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleBulletList()
                .run()
            }
            active={ed.isActive(
              'bulletList'
            )}
            label="Bullet list"
            icon={List}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleOrderedList()
                .run()
            }
            active={ed.isActive(
              'orderedList'
            )}
            label="Numbered list"
            icon={ListOrdered}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .toggleBlockquote()
                .run()
            }
            active={ed.isActive(
              'blockquote'
            )}
            label="Block quote"
            icon={Quote}
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .setHorizontalRule()
                .run()
            }
            active={false}
            label="Divider"
            icon={Minus}
          />

          <Divider />

          <ToolbarButton
            onClick={
              setLink
            }
            active={ed.isActive(
              'link'
            )}
            label="Link"
            icon={LinkIcon}
          />

          <ToolbarButton
            onClick={
              openImagePicker
            }
            active={false}
            label={
              dict.story
                .selectFromMedia
            }
            icon={ImageIcon}
          />

          <Divider />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .undo()
                .run()
            }
            active={false}
            label="Undo"
            icon={Undo}
            disabled={
              !ed
                .can()
                .undo()
            }
          />

          <ToolbarButton
            onClick={() =>
              ed
                .chain()
                .focus()
                .redo()
                .run()
            }
            active={false}
            label="Redo"
            icon={Redo}
            disabled={
              !ed
                .can()
                .redo()
            }
          />
        </div>

        {/* Editor */}
        <div className="px-6 py-5">
          <EditorContent
            editor={ed}
          />
        </div>

        <style jsx global>{`
          .prose-editor h2 {
            font-family:
              var(--font-headline),
              Georgia,
              serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            line-height: 1.25;
            color: hsl(
              var(--color-deep)
            );
          }

          .prose-editor h3 {
            font-family:
              var(--font-headline),
              Georgia,
              serif;
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            line-height: 1.3;
            color: hsl(
              var(--color-deep)
            );
          }

          .prose-editor p {
            margin-bottom: 1rem;
            line-height: 1.75;
          }

          .prose-editor ul {
            list-style-type: disc;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }

          .prose-editor ol {
            list-style-type: decimal;
            padding-left: 1.5rem;
            margin-bottom: 1rem;
          }

          .prose-editor li {
            margin-bottom: 0.5rem;
            line-height: 1.75;
          }

          .prose-editor blockquote {
            border-left: 3px solid
              hsl(
                var(
                  --color-primary
                )
              );
            padding-left: 1rem;
            font-style: italic;
            color: hsl(
              var(
                --color-muted-foreground
              )
            );
            margin: 1.5rem 0;
          }

          .prose-editor hr {
            border: none;
            border-top: 1px solid
              hsl(
                var(
                  --color-border
                )
              );
            margin: 2rem 0;
          }

          .prose-editor img,
          .prose-editor
            .story-inline-image {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
            margin: 1.5rem 0;
          }

          .prose-editor a {
            color: hsl(
              var(
                --color-primary
              )
            );
            text-decoration: underline;
          }

          .prose-editor:focus {
            outline: none;
          }
        `}</style>
      </div>

      {/* Inline image Media Library */}
      {mediaPickerOpen && (
        <MediaPicker
          dict={dict}
          userId={userId}
          onSelect={
            handleImageSelected
          }
          onClose={() => {
            imageInsertPositionRef.current =
              null;

            setMediaPickerOpen(
              false
            );

            ed
              .chain()
              .focus()
              .run();
          }}
        />
      )}

      {/* Inline image metadata */}
      {selectedImage && (
        <div
          className="
            fixed
            inset-0
            z-[80]
            flex
            items-center
            justify-center
            bg-black/40
            p-4
          "
          role="dialog"
          aria-modal="true"
          aria-labelledby="image-details-title"
        >
          <div
            className="
              w-full
              max-w-lg
              rounded-xl
              border
              border-border
              bg-white
              shadow-xl
            "
          >
            {/* Header */}
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-border
                px-5
                py-4
              "
            >
              <div>
                <h2
                  id="image-details-title"
                  className="
                    font-headline
                    text-lg
                    font-semibold
                    text-deep
                  "
                >
                  {dict.story.imageCaption}
                </h2>

                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add the description and credit that should appear beneath this image.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cancelImageInsert
                }
                className="
                  inline-flex
                  h-8
                  w-8
                  items-center
                  justify-center
                  rounded-lg
                  text-muted-foreground
                  transition-colors
                  hover:bg-surface-muted
                  hover:text-foreground
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
                aria-label="Close"
              >
                <X
                  className="h-4 w-4"
                  aria-hidden
                />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Selected image preview */}
              <img
                src={
                  selectedImage.url
                }
                alt={
                  selectedImage.altText ||
                  selectedImage.fileName
                }
                className="
                  aspect-video
                  w-full
                  rounded-lg
                  bg-surface-muted
                  object-cover
                "
              />

              {/* Description */}
              <div>
                <label
                  htmlFor="inline-image-description"
                  className="text-xs font-semibold text-foreground"
                >
                  Description
                </label>

                <textarea
                  id="inline-image-description"
                  value={
                    imageDescription
                  }
                  onChange={(
                    event
                  ) =>
                    setImageDescription(
                      event.target
                        .value
                    )
                  }
                  rows={3}
                  placeholder="Describe what is shown in the image…"
                  className="
                    mt-1
                    w-full
                    resize-y
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-3
                    py-2
                    text-sm
                    text-foreground
                    placeholder:text-muted-foreground
                    focus:border-primary
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                />
              </div>

              {/* Credit */}
              <div>
                <label
                  htmlFor="inline-image-credit"
                  className="text-xs font-semibold text-foreground"
                >
                  Credit
                </label>

                <input
                  id="inline-image-credit"
                  type="text"
                  value={
                    imageCredit
                  }
                  onChange={(
                    event
                  ) =>
                    setImageCredit(
                      event.target
                        .value
                    )
                  }
                  placeholder="Photographer / Agency / Source"
                  className="
                    mt-1
                    h-9
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
                    focus-visible:outline-none
                    focus-visible:ring-2
                    focus-visible:ring-ring
                  "
                />
              </div>

              {/* Caption preview */}
              {(imageDescription ||
                imageCredit) && (
                <div
                  className="
                    border-t
                    border-border
                    pt-4
                  "
                >
                  <p className="mb-1 text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Preview
                  </p>

                  <p
                    className="
                      font-headline
                      text-sm
                      leading-relaxed
                      text-muted-foreground
                    "
                  >
                    {imageDescription}

                    {imageDescription &&
                      imageCredit &&
                      ' '}

                    {imageCredit && (
                      <em>
                        (
                        {
                          imageCredit
                        }
                        )
                      </em>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div
              className="
                flex
                items-center
                justify-end
                gap-2
                border-t
                border-border
                px-5
                py-4
              "
            >
              <button
                type="button"
                onClick={
                  cancelImageInsert
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-4
                  text-sm
                  font-medium
                  text-foreground
                  transition-colors
                  hover:bg-surface-muted
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                {dict.common.cancel}
              </button>

              <button
                type="button"
                onClick={
                  insertSelectedImage
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  justify-center
                  rounded-lg
                  bg-primary
                  px-4
                  text-sm
                  font-semibold
                  text-white
                  transition-colors
                  hover:bg-primary/90
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                <ImageIcon
                  className="mr-1.5 h-4 w-4"
                  aria-hidden
                />

                Insert image
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ToolbarButton({
  onClick,
  active,
  label,
  icon: Icon,
  disabled,
}: {
  onClick: () => void;
  active: boolean;
  label: string;
  icon: React.ElementType;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        `
          inline-flex
          h-8
          w-8
          items-center
          justify-center
          transition-colors
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
          disabled:opacity-30
        `,
        active
          ? 'bg-deep text-white'
          : 'text-foreground hover:bg-surface-subtle'
      )}
      aria-label={label}
      aria-pressed={active}
      title={label}
    >
      <Icon
        className="h-4 w-4"
        aria-hidden
      />
    </button>
  );
}

function Divider() {
  return (
    <span
      className="mx-1 h-5 w-px bg-border"
      aria-hidden
    />
  );
}