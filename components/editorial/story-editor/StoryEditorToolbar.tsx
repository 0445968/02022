'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import type {
  Editor,
} from '@tiptap/react';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code2,
  Eraser,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Pilcrow,
  Quote,
  Redo,
  Strikethrough,
  Subscript as SubscriptIcon,
  Superscript as SuperscriptIcon,
  Underline as UnderlineIcon,
  Undo,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import {
  cn,
} from '@/lib/utils';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface StoryEditorToolbarProps {
  editor: Editor;

  dict: Dictionary;

  onSetLink: () => void;

  onOpenImagePicker: () => void;
}

type ToolbarMode =
  | 'wide'
  | 'medium'
  | 'compact';

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function StoryEditorToolbar({
  editor,
  dict,
  onSetLink,
  onOpenImagePicker,
}: StoryEditorToolbarProps) {
  const toolbarRef =
    useRef<HTMLDivElement>(
      null
    );

  const [
    toolbarWidth,
    setToolbarWidth,
  ] = useState(1200);

  /* ======================================================= */
  /* RESPONSIVE TOOLBAR WIDTH */
  /* ======================================================= */

  useEffect(() => {
    const element =
      toolbarRef.current;

    if (
      !element
    ) {
      return;
    }

    const observer =
      new ResizeObserver(
        (
          entries
        ) => {
          const entry =
            entries[0];

          if (
            !entry
          ) {
            return;
          }

          setToolbarWidth(
            entry.contentRect
              .width
          );
        }
      );

    observer.observe(
      element
    );

    return () => {
      observer.disconnect();
    };
  }, []);

  const mode:
    ToolbarMode =
    toolbarWidth >=
    1080
      ? 'wide'
      : toolbarWidth >=
          760
        ? 'medium'
        : 'compact';

  const currentColor =
    editor.getAttributes(
      'textStyle'
    ).color as
      | string
      | undefined;

  /* ======================================================= */
  /* HELPERS */
  /* ======================================================= */

  function toggleHighlight() {
    editor
      .chain()
      .focus()
      .toggleHighlight({
        color:
          '#FFD735',
      })
      .run();
  }

  function clearFormatting() {
    editor
      .chain()
      .focus()
      .unsetAllMarks()
      .clearNodes()
      .unsetTextAlign()
      .run();
  }

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      ref={
        toolbarRef
      }
      className="
        sticky
        top-0
        z-40
        w-full
        border-b
        border-border
        bg-white
        px-3
        py-2
      "
    >
      <div
        className="
          flex
          min-w-0
          items-center
          gap-1
        "
      >
        {/* ================================================= */}
        {/* CORE TEXT */}
        {/* ================================================= */}

        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleBold()
              .run()
          }
          active={
            editor.isActive(
              'bold'
            )
          }
          label="Bold"
          icon={
            Bold
          }
        />

        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .toggleItalic()
              .run()
          }
          active={
            editor.isActive(
              'italic'
            )
          }
          label="Italic"
          icon={
            Italic
          }
        />

        {mode ===
          'wide' && (
          <>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleUnderline()
                  .run()
              }
              active={
                editor.isActive(
                  'underline'
                )
              }
              label="Underline"
              icon={
                UnderlineIcon
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleStrike()
                  .run()
              }
              active={
                editor.isActive(
                  'strike'
                )
              }
              label="Strikethrough"
              icon={
                Strikethrough
              }
            />
          </>
        )}

        {/* ================================================= */}
        {/* TEXT MENU */}
        {/* ================================================= */}

        <ToolbarMenu
          label="Text"
          icon={
            UnderlineIcon
          }
        >
          {mode !==
            'wide' && (
            <>
              <MenuAction
                label="Underline"
                icon={
                  UnderlineIcon
                }
                active={
                  editor.isActive(
                    'underline'
                  )
                }
                onSelect={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleUnderline()
                    .run()
                }
              />

              <MenuAction
                label="Strikethrough"
                icon={
                  Strikethrough
                }
                active={
                  editor.isActive(
                    'strike'
                  )
                }
                onSelect={() =>
                  editor
                    .chain()
                    .focus()
                    .toggleStrike()
                    .run()
                }
              />

              <MenuSeparator />
            </>
          )}

          <MenuAction
            label="Superscript"
            icon={
              SuperscriptIcon
            }
            active={
              editor.isActive(
                'superscript'
              )
            }
            onSelect={() =>
              editor
                .chain()
                .focus()
                .toggleSuperscript()
                .run()
            }
          />

          <MenuAction
            label="Subscript"
            icon={
              SubscriptIcon
            }
            active={
              editor.isActive(
                'subscript'
              )
            }
            onSelect={() =>
              editor
                .chain()
                .focus()
                .toggleSubscript()
                .run()
            }
          />

          <MenuAction
            label="Inline code"
            icon={
              Code2
            }
            active={
              editor.isActive(
                'code'
              )
            }
            onSelect={() =>
              editor
                .chain()
                .focus()
                .toggleCode()
                .run()
            }
          />

          <MenuSeparator />

          <MenuAction
            label="Highlight"
            icon={
              Highlighter
            }
            active={
              editor.isActive(
                'highlight'
              )
            }
            onSelect={
              toggleHighlight
            }
          />

          <DropdownMenu.Label
            className="
              px-2
              pb-1
              pt-2
              text-[10px]
              font-bold
              uppercase
              tracking-[0.08em]
              text-muted-foreground
            "
          >
            Text color
          </DropdownMenu.Label>

          <div
            className="
              flex
              items-center
              gap-2
              px-2
              pb-2
            "
            onPointerDown={(
              event
            ) =>
              event.preventDefault()
            }
          >
            <label
              className="
                flex
                h-8
                flex-1
                cursor-pointer
                items-center
                gap-2
                rounded-md
                px-2
                text-sm
                text-foreground
                hover:bg-surface-muted
              "
            >
              <Palette
                className="
                  h-4
                  w-4
                "
              />

              Choose color

              <span
                className="
                  ml-auto
                  h-4
                  w-4
                  rounded-full
                  border
                  border-border
                "
                style={{
                  backgroundColor:
                    currentColor ??
                    '#000000',
                }}
              />

              <input
                type="color"
                value={
                  currentColor ??
                  '#000000'
                }
                onChange={(
                  event
                ) =>
                  editor
                    .chain()
                    .focus()
                    .setColor(
                      event
                        .target
                        .value
                    )
                    .run()
                }
                className="
                  absolute
                  h-0
                  w-0
                  opacity-0
                "
              />
            </label>
          </div>

          <MenuAction
            label="Remove text color"
            icon={
              Eraser
            }
            onSelect={() =>
              editor
                .chain()
                .focus()
                .unsetColor()
                .run()
            }
          />
        </ToolbarMenu>

        <Divider />

        {/* ================================================= */}
        {/* STYLES */}
        {/* ================================================= */}

        {mode ===
          'wide' ? (
          <>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setParagraph()
                  .run()
              }
              active={
                editor.isActive(
                  'paragraph'
                )
              }
              label="Paragraph"
              icon={
                Pilcrow
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level:
                      2,
                  })
                  .run()
              }
              active={
                editor.isActive(
                  'heading',
                  {
                    level:
                      2,
                  }
                )
              }
              label="Heading 2"
              icon={
                Heading2
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level:
                      3,
                  })
                  .run()
              }
              active={
                editor.isActive(
                  'heading',
                  {
                    level:
                      3,
                  }
                )
              }
              label="Heading 3"
              icon={
                Heading3
              }
            />
          </>
        ) : (
          <ToolbarMenu
            label="Styles"
            icon={
              Pilcrow
            }
          >
            <MenuAction
              label="Paragraph"
              icon={
                Pilcrow
              }
              active={
                editor.isActive(
                  'paragraph'
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setParagraph()
                  .run()
              }
            />

            <MenuAction
              label="Heading 2"
              icon={
                Heading2
              }
              active={
                editor.isActive(
                  'heading',
                  {
                    level:
                      2,
                  }
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level:
                      2,
                  })
                  .run()
              }
            />

            <MenuAction
              label="Heading 3"
              icon={
                Heading3
              }
              active={
                editor.isActive(
                  'heading',
                  {
                    level:
                      3,
                  }
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleHeading({
                    level:
                      3,
                  })
                  .run()
              }
            />
          </ToolbarMenu>
        )}

        <Divider />

        {/* ================================================= */}
        {/* ALIGNMENT */}
        {/* ================================================= */}

        {mode ===
          'wide' ? (
          <>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'left'
                  )
                  .run()
              }
              active={
                editor.isActive({
                  textAlign:
                    'left',
                })
              }
              label="Align left"
              icon={
                AlignLeft
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'center'
                  )
                  .run()
              }
              active={
                editor.isActive({
                  textAlign:
                    'center',
                })
              }
              label="Align center"
              icon={
                AlignCenter
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'right'
                  )
                  .run()
              }
              active={
                editor.isActive({
                  textAlign:
                    'right',
                })
              }
              label="Align right"
              icon={
                AlignRight
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'justify'
                  )
                  .run()
              }
              active={
                editor.isActive({
                  textAlign:
                    'justify',
                })
              }
              label="Justify"
              icon={
                AlignJustify
              }
            />
          </>
        ) : (
          <ToolbarMenu
            label="Alignment"
            icon={
              AlignLeft
            }
          >
            <MenuAction
              label="Align left"
              icon={
                AlignLeft
              }
              active={
                editor.isActive({
                  textAlign:
                    'left',
                })
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'left'
                  )
                  .run()
              }
            />

            <MenuAction
              label="Align center"
              icon={
                AlignCenter
              }
              active={
                editor.isActive({
                  textAlign:
                    'center',
                })
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'center'
                  )
                  .run()
              }
            />

            <MenuAction
              label="Align right"
              icon={
                AlignRight
              }
              active={
                editor.isActive({
                  textAlign:
                    'right',
                })
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'right'
                  )
                  .run()
              }
            />

            <MenuAction
              label="Justify"
              icon={
                AlignJustify
              }
              active={
                editor.isActive({
                  textAlign:
                    'justify',
                })
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setTextAlign(
                    'justify'
                  )
                  .run()
              }
            />
          </ToolbarMenu>
        )}

        <Divider />

        {/* ================================================= */}
        {/* BLOCKS */}
        {/* ================================================= */}

        {mode ===
          'wide' ? (
          <>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleBulletList()
                  .run()
              }
              active={
                editor.isActive(
                  'bulletList'
                )
              }
              label="Bullet list"
              icon={
                List
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleOrderedList()
                  .run()
              }
              active={
                editor.isActive(
                  'orderedList'
                )
              }
              label="Numbered list"
              icon={
                ListOrdered
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleBlockquote()
                  .run()
              }
              active={
                editor.isActive(
                  'blockquote'
                )
              }
              label="Block quote"
              icon={
                Quote
              }
            />
          </>
        ) : (
          <ToolbarMenu
            label="Blocks"
            icon={
              List
            }
          >
            <MenuAction
              label="Bullet list"
              icon={
                List
              }
              active={
                editor.isActive(
                  'bulletList'
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleBulletList()
                  .run()
              }
            />

            <MenuAction
              label="Numbered list"
              icon={
                ListOrdered
              }
              active={
                editor.isActive(
                  'orderedList'
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleOrderedList()
                  .run()
              }
            />

            <MenuAction
              label="Block quote"
              icon={
                Quote
              }
              active={
                editor.isActive(
                  'blockquote'
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleBlockquote()
                  .run()
              }
            />

            <MenuAction
              label="Code block"
              icon={
                Code2
              }
              active={
                editor.isActive(
                  'codeBlock'
                )
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .toggleCodeBlock()
                  .run()
              }
            />

            <MenuAction
              label="Divider"
              icon={
                Minus
              }
              onSelect={() =>
                editor
                  .chain()
                  .focus()
                  .setHorizontalRule()
                  .run()
              }
            />
          </ToolbarMenu>
        )}

        {mode ===
          'wide' && (
          <>
            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .toggleCodeBlock()
                  .run()
              }
              active={
                editor.isActive(
                  'codeBlock'
                )
              }
              label="Code block"
              icon={
                Code2
              }
            />

            <ToolbarButton
              onClick={() =>
                editor
                  .chain()
                  .focus()
                  .setHorizontalRule()
                  .run()
              }
              active={
                false
              }
              label="Divider"
              icon={
                Minus
              }
            />
          </>
        )}

        <Divider />

        {/* ================================================= */}
        {/* INSERT */}
        {/* ================================================= */}

        {mode ===
          'compact' ? (
          <ToolbarMenu
            label="Insert"
            icon={
              LinkIcon
            }
          >
            <MenuAction
              label="Link"
              icon={
                LinkIcon
              }
              active={
                editor.isActive(
                  'link'
                )
              }
              onSelect={
                onSetLink
              }
            />

            <MenuAction
              label={
                dict.story
                  .selectFromMedia
              }
              icon={
                ImageIcon
              }
              onSelect={
                onOpenImagePicker
              }
            />
          </ToolbarMenu>
        ) : (
          <>
            <ToolbarButton
              onClick={
                onSetLink
              }
              active={
                editor.isActive(
                  'link'
                )
              }
              label="Link"
              icon={
                LinkIcon
              }
            />

            <ToolbarButton
              onClick={
                onOpenImagePicker
              }
              active={
                false
              }
              label={
                dict.story
                  .selectFromMedia
              }
              icon={
                ImageIcon
              }
            />
          </>
        )}

        {/* ================================================= */}
        {/* FLEX SPACER */}
        {/* ================================================= */}

        <div
          className="
            min-w-1
            flex-1
          "
        />

        {/* ================================================= */}
        {/* MORE */}
        {/* ================================================= */}

        <ToolbarMenu
          label="More"
          icon={
            Eraser
          }
        >
          <MenuAction
            label="Clear formatting"
            icon={
              Eraser
            }
            onSelect={
              clearFormatting
            }
          />
        </ToolbarMenu>

        <Divider />

        {/* ================================================= */}
        {/* HISTORY */}
        {/* ================================================= */}

        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .undo()
              .run()
          }
          active={
            false
          }
          label="Undo"
          icon={
            Undo
          }
          disabled={
            !editor
              .can()
              .undo()
          }
        />

        <ToolbarButton
          onClick={() =>
            editor
              .chain()
              .focus()
              .redo()
              .run()
          }
          active={
            false
          }
          label="Redo"
          icon={
            Redo
          }
          disabled={
            !editor
              .can()
              .redo()
          }
        />
      </div>
    </div>
  );
}

/* ========================================================= */
/* TOOLBAR BUTTON */
/* ========================================================= */

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

  icon:
    React.ElementType;

  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={
        onClick
      }
      disabled={
        disabled
      }
      title={
        label
      }
      aria-label={
        label
      }
      aria-pressed={
        active
      }
      className={cn(
        `
          inline-flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-md
          transition-colors
          focus-visible:outline-none
          focus-visible:ring-2
          focus-visible:ring-ring
          disabled:pointer-events-none
          disabled:opacity-30
        `,
        active
          ? `
            bg-deep
            text-white
          `
          : `
            text-foreground
            hover:bg-surface-subtle
          `
      )}
    >
      <Icon
        className="
          h-4
          w-4
        "
        aria-hidden
      />
    </button>
  );
}

/* ========================================================= */
/* TOOLBAR DROPDOWN */
/* ========================================================= */

function ToolbarMenu({
  label,
  icon: Icon,
  children,
}: {
  label: string;

  icon:
    React.ElementType;

  children:
    React.ReactNode;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        asChild
      >
        <button
          type="button"
          title={
            label
          }
          aria-label={
            label
          }
          className="
            inline-flex
            h-8
            shrink-0
            items-center
            gap-1
            rounded-md
            px-2
            text-sm
            text-foreground
            transition-colors
            hover:bg-surface-subtle
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
          "
        >
          <Icon
            className="
              h-4
              w-4
            "
            aria-hidden
          />

          <ChevronDown
            className="
              h-3
              w-3
              text-muted-foreground
            "
            aria-hidden
          />
        </button>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          sideOffset={
            6
          }
          align="start"
          className="
            z-[100]
            min-w-[190px]
            rounded-lg
            border
            border-border
            bg-white
            p-1
            shadow-xl
          "
        >
          {children}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ========================================================= */
/* MENU ACTION */
/* ========================================================= */

function MenuAction({
  label,
  icon: Icon,
  active = false,
  onSelect,
}: {
  label: string;

  icon:
    React.ElementType;

  active?: boolean;

  onSelect:
    () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={
        onSelect
      }
      className="
        flex
        cursor-pointer
        select-none
        items-center
        gap-2
        rounded-md
        px-2
        py-2
        text-sm
        text-foreground
        outline-none
        hover:bg-surface-muted
        focus:bg-surface-muted
      "
    >
      <Icon
        className="
          h-4
          w-4
          shrink-0
          text-muted-foreground
        "
      />

      <span
        className="
          flex-1
        "
      >
        {label}
      </span>

      {active && (
        <Check
          className="
            h-3.5
            w-3.5
            text-primary
          "
        />
      )}
    </DropdownMenu.Item>
  );
}

/* ========================================================= */
/* MENU SEPARATOR */
/* ========================================================= */

function MenuSeparator() {
  return (
    <DropdownMenu.Separator
      className="
        my-1
        h-px
        bg-border
      "
    />
  );
}

/* ========================================================= */
/* TOOLBAR DIVIDER */
/* ========================================================= */

function Divider() {
  return (
    <span
      className="
        mx-1
        h-5
        w-px
        shrink-0
        bg-border
      "
      aria-hidden
    />
  );
}