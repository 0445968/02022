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

  /**
   * Remember where the cursor was before
   * the Media Library modal opens.
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

      Image.configure({
        inline: false,

        allowBase64: false,

        HTMLAttributes: {
          class:
            'story-inline-image',
        },
      }),

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
      Object.keys(content).length >
        0
        ? content
        : {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
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
      Object.keys(content).length >
        0
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
   * Capture the narrowed editor in a new constant.
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

    setMediaPickerOpen(
      true
    );
  }

  function insertImage(
    media: MediaAsset
  ) {
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
        ed.state.doc.content.size;

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
      .setImage({
        src: media.url,

        alt:
          media.altText ||
          media.fileName,

        title:
          media.fileName,
      })
      .run();

    imageInsertPositionRef.current =
      null;

    setMediaPickerOpen(
      false
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
            onClick={setLink}
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
            font-family: var(--font-headline), Georgia, serif;
            font-size: 1.5rem;
            font-weight: 700;
            margin-top: 1.5rem;
            margin-bottom: 0.75rem;
            line-height: 1.25;
            color: hsl(var(--color-deep));
          }

          .prose-editor h3 {
            font-family: var(--font-headline), Georgia, serif;
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
            line-height: 1.3;
            color: hsl(var(--color-deep));
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
            border-left: 3px solid hsl(var(--color-primary));
            padding-left: 1rem;
            font-style: italic;
            color: hsl(var(--color-muted-foreground));
            margin: 1.5rem 0;
          }

          .prose-editor hr {
            border: none;
            border-top: 1px solid hsl(var(--color-border));
            margin: 2rem 0;
          }

          .prose-editor img,
          .prose-editor .story-inline-image {
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
            margin: 1.5rem 0;
          }

          .prose-editor a {
            color: hsl(var(--color-primary));
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
            insertImage
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