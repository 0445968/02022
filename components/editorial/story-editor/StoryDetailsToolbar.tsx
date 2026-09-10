'use client';

import {
  useEffect,
  useRef,
  useState,
} from 'react';

import * as DropdownMenu from '@radix-ui/react-dropdown-menu';

import {
  ChevronDown,
  FileText,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryLanguage,
} from '@/lib/db/database.types';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface StoryDetailsToolbarProps {
  dict: Dictionary;

  /**
   * Kept in the props for compatibility with StoryEditorContent.
   * We no longer display a language indicator in this toolbar.
   */
  language: StoryLanguage;

  headline: string;

  subheadline: string;

  summary: string;

  setHeadline: (
    value: string
  ) => void;

  setSubheadline: (
    value: string
  ) => void;

  setSummary: (
    value: string
  ) => void;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function StoryDetailsToolbar({
  dict,
  headline,
  subheadline,
  summary,
  setHeadline,
  setSubheadline,
  setSummary,
}: StoryDetailsToolbarProps) {
  return (
    <div
      className="
        sticky
        top-0
        z-50
        w-full
        border-b
        border-border
        bg-white
      "
    >
      <div
        className="
          flex
          h-12
          min-w-0
          items-stretch
        "
      >
        {/* ================================================= */}
        {/* HEADLINE */}
        {/* ================================================= */}

        <StoryFieldEditor
          label="Headline"
          value={
            headline
          }
          onChange={
            setHeadline
          }
          placeholder={
            dict.story
              .headlinePlaceholder
          }
          className="
            min-w-0
            flex-[2]
          "
          textClassName="
            font-headline
            font-semibold
            text-deep
          "
        />

        {/* ================================================= */}
        {/* SUBHEADLINE */}
        {/* ================================================= */}

        <StoryFieldEditor
          label="Subheadline"
          value={
            subheadline
          }
          onChange={
            setSubheadline
          }
          placeholder={
            dict.story
              .subheadlinePlaceholder
          }
          className="
            hidden
            min-w-0
            flex-[1.5]
            sm:block
          "
          textClassName="
            font-headline
            italic
            text-foreground
          "
        />

        {/* ================================================= */}
        {/* DESCRIPTION */}
        {/* ================================================= */}

        <StoryFieldEditor
          label="Description"
          value={
            summary
          }
          onChange={
            setSummary
          }
          placeholder={
            dict.story
              .summaryPlaceholder
          }
          multiline
          className="
            hidden
            min-w-0
            flex-[1.5]
            md:block
          "
          textClassName="
            text-foreground
          "
        />

        {/* ================================================= */}
        {/* COMPACT DETAILS MENU */}
        {/* ================================================= */}

        <CompactStoryDetailsMenu
          dict={
            dict
          }
          headline={
            headline
          }
          subheadline={
            subheadline
          }
          summary={
            summary
          }
          setHeadline={
            setHeadline
          }
          setSubheadline={
            setSubheadline
          }
          setSummary={
            setSummary
          }
        />
      </div>
    </div>
  );
}

/* ========================================================= */
/* INDIVIDUAL FIELD DROPDOWN */
/* ========================================================= */

function StoryFieldEditor({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  className = '',
  textClassName = '',
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;

  placeholder: string;

  multiline?: boolean;

  className?: string;

  textClassName?: string;
}) {
  const [
    open,
    setOpen,
  ] = useState(false);

  return (
    <div
      className={`
        border-r
        border-border
        ${className}
      `}
    >
      <DropdownMenu.Root
        open={
          open
        }
        onOpenChange={
          setOpen
        }
      >
        <DropdownMenu.Trigger
          asChild
        >
          <button
            type="button"
            className="
              flex
              h-full
              w-full
              min-w-0
              items-center
              gap-2
              px-3
              text-left
              transition-colors
              hover:bg-surface-muted
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-inset
              focus-visible:ring-ring
            "
          >
            <span
              className="
                shrink-0
                text-[10px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-muted-foreground
              "
            >
              {label}
            </span>

            <span
              className={`
                min-w-0
                flex-1
                truncate
                text-sm
                ${textClassName}
              `}
            >
              {value ||
                placeholder}
            </span>

            <ChevronDown
              className="
                h-3
                w-3
                shrink-0
                text-muted-foreground
              "
              aria-hidden
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            sideOffset={
              4
            }
            align="start"
            collisionPadding={
              12
            }
            className="
              z-[110]
              w-[min(620px,calc(100vw-24px))]
              rounded-xl
              border
              border-border
              bg-white
              p-4
              shadow-xl
            "
          >
            <DropdownMenu.Label
              className="
                mb-3
                text-[10px]
                font-bold
                uppercase
                tracking-[0.08em]
                text-muted-foreground
              "
            >
              {label}
            </DropdownMenu.Label>

            <AutoGrowTextarea
              value={
                value
              }
              onChange={
                onChange
              }
              placeholder={
                placeholder
              }
              multiline={
                multiline
              }
              textClassName={
                textClassName
              }
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/* ========================================================= */
/* AUTO-GROW TEXTAREA */
/* ========================================================= */

function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  multiline,
  textClassName,
}: {
  value: string;

  onChange: (
    value: string
  ) => void;

  placeholder: string;

  multiline: boolean;

  textClassName: string;
}) {
  const textareaRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  function resize() {
    const textarea =
      textareaRef.current;

    if (
      !textarea
    ) {
      return;
    }

    textarea.style.height =
      '0px';

    textarea.style.height =
      `${textarea.scrollHeight}px`;
  }

  useEffect(() => {
    resize();
  }, [
    value,
  ]);

  useEffect(() => {
    const frame =
      requestAnimationFrame(
        resize
      );

    return () => {
      cancelAnimationFrame(
        frame
      );
    };
  }, []);

  return (
    <textarea
      ref={
        textareaRef
      }
      value={
        value
      }
      onChange={(
        event
      ) => {
        onChange(
          event.target.value
        );

        requestAnimationFrame(
          resize
        );
      }}
      placeholder={
        placeholder
      }
      rows={
        multiline
          ? 3
          : 2
      }
      onPointerDown={(
        event
      ) =>
        event.stopPropagation()
      }
      onKeyDown={(
        event
      ) =>
        event.stopPropagation()
      }
      className={`
        block
        min-h-[72px]
        w-full
        resize-none
        overflow-hidden
        rounded-lg
        border
        border-border
        bg-white
        px-3
        py-3
        text-base
        leading-relaxed
        placeholder:text-muted-foreground/40
        focus:border-primary
        focus-visible:outline-none
        focus-visible:ring-2
        focus-visible:ring-ring
        ${textClassName}
      `}
    />
  );
}

/* ========================================================= */
/* COMPACT STORY DETAILS MENU */
/* ========================================================= */

function CompactStoryDetailsMenu({
  dict,
  headline,
  subheadline,
  summary,
  setHeadline,
  setSubheadline,
  setSummary,
}: {
  dict: Dictionary;

  headline: string;

  subheadline: string;

  summary: string;

  setHeadline: (
    value: string
  ) => void;

  setSubheadline: (
    value: string
  ) => void;

  setSummary: (
    value: string
  ) => void;
}) {
  return (
    <div
      className="
        flex
        h-full
        shrink-0
        items-center
        px-1
        md:hidden
      "
    >
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          asChild
        >
          <button
            type="button"
            className="
              inline-flex
              h-8
              items-center
              gap-1.5
              rounded-md
              px-2
              text-xs
              font-medium
              text-foreground
              transition-colors
              hover:bg-surface-muted
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
            "
          >
            <FileText
              className="
                h-4
                w-4
              "
              aria-hidden
            />

            <span
              className="
                hidden
                sm:inline
              "
            >
              Details
            </span>

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
              4
            }
            align="end"
            collisionPadding={
              12
            }
            className="
              z-[110]
              w-[min(620px,calc(100vw-24px))]
              rounded-xl
              border
              border-border
              bg-white
              p-4
              shadow-xl
            "
          >
            <DropdownMenu.Label
              className="
                mb-4
                text-sm
                font-semibold
                text-foreground
              "
            >
              Story details
            </DropdownMenu.Label>

            {/* Headline */}

            <DropdownField
              label="Headline"
              value={
                headline
              }
              onChange={
                setHeadline
              }
              placeholder={
                dict.story
                  .headlinePlaceholder
              }
              textClassName="
                font-headline
                font-semibold
                text-deep
              "
            />

            {/* Subheadline */}

            <DropdownField
              label="Subheadline"
              value={
                subheadline
              }
              onChange={
                setSubheadline
              }
              placeholder={
                dict.story
                  .subheadlinePlaceholder
              }
              textClassName="
                font-headline
                italic
              "
            />

            {/* Description */}

            <DropdownField
              label="Description"
              value={
                summary
              }
              onChange={
                setSummary
              }
              placeholder={
                dict.story
                  .summaryPlaceholder
              }
              multiline
            />
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </div>
  );
}

/* ========================================================= */
/* COMPACT DROPDOWN FIELD */
/* ========================================================= */

function DropdownField({
  label,
  value,
  onChange,
  placeholder,
  multiline = false,
  textClassName = '',
}: {
  label: string;

  value: string;

  onChange: (
    value: string
  ) => void;

  placeholder: string;

  multiline?: boolean;

  textClassName?: string;
}) {
  return (
    <div
      className="
        mb-4
        last:mb-0
      "
    >
      <label
        className="
          mb-1.5
          block
          text-[10px]
          font-bold
          uppercase
          tracking-[0.08em]
          text-muted-foreground
        "
      >
        {label}
      </label>

      <AutoGrowTextarea
        value={
          value
        }
        onChange={
          onChange
        }
        placeholder={
          placeholder
        }
        multiline={
          multiline
        }
        textClassName={
          textClassName
        }
      />
    </div>
  );
}