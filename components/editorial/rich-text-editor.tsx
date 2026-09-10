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
import Underline from '@tiptap/extension-underline';
import Placeholder from '@tiptap/extension-placeholder';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';

import {
  Image as ImageIcon,
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
  StoryEditorToolbar,
} from '@/components/editorial/story-editor/StoryEditorToolbar';

import {
  StoryImageExtension,
} from '@/components/editorial/story-editor/StoryImageExtension';

import {
  mediaAssetToStoryImageAttributes,
} from '@/components/editorial/story-editor/story-image-metadata';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

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

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

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
  ] = useState<
    MediaAsset | null
  >(null);

  const [
    imageDescription,
    setImageDescription,
  ] = useState('');

  const [
    imageCredit,
    setImageCredit,
  ] = useState('');

  const imageInsertPositionRef =
    useRef<
      number | null
    >(null);

  /* ======================================================= */
  /* TIPTAP */
  /* ======================================================= */

  const editor =
    useEditor({
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [
              2,
              3,
            ],
          },
        }),

        Underline,

        TextStyle,

        Color,

        Highlight.configure({
          multicolor: true,
        }),

        Subscript,

        Superscript,

        TextAlign.configure({
          types: [
            'heading',
            'paragraph',
          ],
        }),

        Link.configure({
          openOnClick:
            false,

          HTMLAttributes: {
            class:
              'text-primary underline',
          },
        }),

        StoryImageExtension,

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
          Object.keys(
            content
          ).length > 0
          ? content
          : {
            type:
              'doc',

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
            'prose-editor min-h-[400px] w-full bg-white pb-8 pt-6 font-interface text-base leading-relaxed text-foreground focus:outline-none',
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

  /* ======================================================= */
  /* EXTERNAL CONTENT SYNC */
  /* ======================================================= */

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
        Object.keys(
          content
        ).length > 0
        ? content
        : {
          type:
            'doc',

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
      <div
        className="
          min-h-[400px]
          bg-white
        "
      />
    );
  }

  const ed =
    editor;

  /* ======================================================= */
  /* LINKS */
  /* ======================================================= */

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

    if (
      url === null
    ) {
      return;
    }

    if (
      url === ''
    ) {
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

  /* ======================================================= */
  /* OPEN MEDIA LIBRARY */
  /* ======================================================= */

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

  /* ======================================================= */
  /* SELECT MEDIA ASSET */
  /* ======================================================= */

  function handleImageSelected(
    media: MediaAsset
  ) {
    const metadata =
      mediaAssetToStoryImageAttributes(
        media
      );

    setSelectedImage(
      media
    );

    setImageDescription(
      metadata.description ??
      ''
    );

    setImageCredit(
      metadata.credit ??
      ''
    );

    setMediaPickerOpen(
      false
    );
  }

  /* ======================================================= */
  /* CANCEL IMAGE INSERT */
  /* ======================================================= */

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

  /* ======================================================= */
  /* INSERT IMAGE */
  /* ======================================================= */

  function insertSelectedImage() {
    if (!selectedImage) {
      return;
    }

    const baseAttributes =
      mediaAssetToStoryImageAttributes(
        selectedImage
      );

    const position =
      imageInsertPositionRef.current;

    let chain =
      ed
        .chain()
        .focus();

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

    chain
      .insertContent({
        type:
          'image',

        attrs: {
          ...baseAttributes,

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

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <>
      <div
        className="
          relative
          w-full
          bg-white
        "
      >
        {/* Formatting toolbar */}

        <StoryEditorToolbar
          editor={ed}
          dict={dict}
          onSetLink={setLink}
          onOpenImagePicker={
            openImagePicker
          }
        />

        {/* Article body */}

        <div
          className="
            w-full
            bg-white
          "
        >
          <div
            className="
              mx-auto
              w-full
              max-w-3xl
              px-6
              lg:px-12
            "
          >
            <EditorContent
              editor={ed}
            />
          </div>
        </div>

        {/* Editor styles */}

        <style
          jsx
          global
        >{`
          .prose-editor {
            width: 100%;
            background: white;
          }

          .prose-editor h2 {
            font-family:
              var(--font-headline),
              Georgia,
              serif;

            font-size:
              1.5rem;

            font-weight:
              700;

            margin-top:
              1.5rem;

            margin-bottom:
              0.75rem;

            line-height:
              1.25;

            color:
              hsl(
                var(
                  --color-deep
                )
              );
          }

          .prose-editor h3 {
            font-family:
              var(--font-headline),
              Georgia,
              serif;

            font-size:
              1.25rem;

            font-weight:
              600;

            margin-top:
              1.25rem;

            margin-bottom:
              0.5rem;

            line-height:
              1.3;

            color:
              hsl(
                var(
                  --color-deep
                )
              );
          }

          .prose-editor p {
            margin-bottom:
              1rem;

            line-height:
              1.75;
          }

          .prose-editor ul {
            list-style-type:
              disc;

            padding-left:
              1.5rem;

            margin-bottom:
              1rem;
          }

          .prose-editor ol {
            list-style-type:
              decimal;

            padding-left:
              1.5rem;

            margin-bottom:
              1rem;
          }

          .prose-editor li {
            margin-bottom:
              0.5rem;

            line-height:
              1.75;
          }

          .prose-editor blockquote {
            border-left:
              3px
              solid
              hsl(
                var(
                  --color-primary
                )
              );

            padding-left:
              1rem;

            font-style:
              italic;

            color:
              hsl(
                var(
                  --color-muted-foreground
                )
              );

            margin:
              1.5rem
              0;
          }

          .prose-editor pre {
            overflow-x:
              auto;

            border-radius:
              0.5rem;

            background:
              hsl(
                var(
                  --color-deep
                )
              );

            color:
              white;

            padding:
              1rem;

            margin:
              1.5rem
              0;

            font-size:
              0.875rem;

            line-height:
              1.6;
          }

          .prose-editor code {
            border-radius:
              0.25rem;

            background:
              hsl(
                var(
                  --color-surface-subtle
                )
              );

            padding:
              0.1rem
              0.3rem;

            font-size:
              0.9em;
          }

          .prose-editor pre code {
            background:
              transparent;

            padding:
              0;
          }

          .prose-editor hr {
            border:
              none;

            border-top:
              1px
              solid
              hsl(
                var(
                  --color-border
                )
              );

            margin:
              2rem
              0;
          }

          .prose-editor img,
          .prose-editor
            .story-inline-image {
            display:
              block;

            width:
              100%;

            max-width:
              100%;

            height:
              auto;

            margin:
              1.5rem
              0;

            border-radius:
              0.75rem;
          }

          .prose-editor a {
            color:
              hsl(
                var(
                  --color-primary
                )
              );

            text-decoration:
              underline;
          }

          .prose-editor:focus {
            outline:
              none;
          }
        `}</style>
      </div>

      {/* Media Library */}

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

      {/* Image metadata modal */}

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
                  {
                    dict.story
                      .imageCaption
                  }
                </h2>

                <p
                  className="
                    mt-0.5
                    text-xs
                    text-muted-foreground
                  "
                >
                  The Media Library description and credit have been added automatically. You can customize them for this story.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  cancelImageInsert
                }
                aria-label="Close"
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

            {/* Content */}

            <div
              className="
                space-y-4
                p-5
              "
            >
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

              <div>
                <label
                  htmlFor="inline-image-description"
                  className="
                    text-xs
                    font-semibold
                    text-foreground
                  "
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
                      event.target.value
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

              <div>
                <label
                  htmlFor="inline-image-credit"
                  className="
                    text-xs
                    font-semibold
                    text-foreground
                  "
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
                      event.target.value
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

              {(imageDescription ||
                imageCredit) && (
                  <div
                    className="
                    border-t
                    border-border
                    pt-4
                  "
                  >
                    <p
                      className="
                      mb-1
                      text-[0.6875rem]
                      font-semibold
                      uppercase
                      tracking-wide
                      text-muted-foreground
                    "
                    >
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

              <div
                className="
                  rounded-lg
                  bg-surface-muted
                  px-3
                  py-2.5
                "
              >
                <p
                  className="
                    text-[10px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-muted-foreground
                  "
                >
                  Media Library asset
                </p>

                <p
                  className="
                    mt-1
                    truncate
                    text-xs
                    font-medium
                    text-foreground
                  "
                >
                  {selectedImage.title ||
                    selectedImage.fileName}
                </p>
              </div>
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
                {
                  dict.common
                    .cancel
                }
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
                  className="
                    mr-1.5
                    h-4
                    w-4
                  "
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