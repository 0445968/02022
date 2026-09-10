'use client';

import {
  useEffect,
  useRef,
} from 'react';

import {
  Save,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryLanguage,
} from '@/lib/db/database.types';

import {
  RichTextEditor,
} from '@/components/editorial/rich-text-editor';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface StoryEditorContentProps {
  dict: Dictionary;

  userId: string;

  language: StoryLanguage;

  headline: string;

  subheadline: string;

  summary: string;

  body: Record<
    string,
    unknown
  >;

  isSaving: boolean;

  setHeadline: (
    value: string
  ) => void;

  setSubheadline: (
    value: string
  ) => void;

  setSummary: (
    value: string
  ) => void;

  setBody: (
    value: Record<
      string,
      unknown
    >
  ) => void;

  onSaveVersion: () => void;
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function StoryEditorContent({
  dict,
  userId,
  language,
  headline,
  subheadline,
  summary,
  body,
  isSaving,
  setHeadline,
  setSubheadline,
  setSummary,
  setBody,
  onSaveVersion,
}: StoryEditorContentProps) {
  const headlineRef =
    useRef<HTMLTextAreaElement>(
      null
    );

  /* ======================================================= */
  /* AUTO-GROW HEADLINE */
  /* ======================================================= */

  useEffect(() => {
    const textarea =
      headlineRef.current;

    if (
      !textarea
    ) {
      return;
    }

    textarea.style.height =
      'auto';

    textarea.style.height =
      `${textarea.scrollHeight}px`;
  }, [
    headline,
  ]);

  function handleHeadlineChange(
    event:
      React.ChangeEvent<HTMLTextAreaElement>
  ) {
    setHeadline(
      event.target.value
    );

    event.target.style.height =
      'auto';

    event.target.style.height =
      `${event.target.scrollHeight}px`;
  }

  /* ======================================================= */
  /* RENDER */
  /* ======================================================= */

  return (
    <div
      className="
        flex-1
        overflow-y-auto
        bg-white
      "
    >
      {/* =================================================== */}
      {/* STORY HEADER */}
      {/* =================================================== */}

      <div
        className="
          mx-auto
          w-full
          max-w-3xl
          px-6
          pt-6
          lg:px-12
          lg:pt-8
        "
      >
        {/* Language indicator */}

        <div
          className="
            mb-4
            flex
            items-center
            gap-2
          "
        >
          <span
            className="
              eyebrow
              text-primary
            "
          >
            {language ===
            'en'
              ? dict.common
                  .languageEN
              : dict.common
                  .languageES}
          </span>

          <span
            className="
              text-xs
              text-muted-foreground
            "
          >
            ·
          </span>

          <span
            className="
              text-xs
              text-muted-foreground
            "
          >
            {
              dict.story
                .language
            }
          </span>
        </div>

        {/* ================================================= */}
        {/* HEADLINE */}
        {/* ================================================= */}

        <textarea
          ref={
            headlineRef
          }
          value={
            headline
          }
          onChange={
            handleHeadlineChange
          }
          placeholder={
            dict.story
              .headlinePlaceholder
          }
          aria-label={
            dict.stories
              .columns
              .headline
          }
          rows={
            1
          }
          className="
            block
            w-full
            resize-none
            overflow-hidden
            border-none
            bg-transparent
            p-0
            font-headline
            text-[1.75rem]
            font-semibold
            leading-[1.08]
            tracking-[-0.025em]
            text-deep
            placeholder:text-muted-foreground/40
            focus:outline-none
            focus:ring-0
            sm:text-[2rem]
            lg:text-[2.25rem]
          "
        />

        {/* ================================================= */}
        {/* SUBHEADLINE */}
        {/* ================================================= */}

        <input
          type="text"
          value={
            subheadline
          }
          onChange={(
            event
          ) =>
            setSubheadline(
              event.target.value
            )
          }
          placeholder={
            dict.story
              .subheadlinePlaceholder
          }
          aria-label={
            dict.story
              .subheadlinePlaceholder
          }
          className="
            mt-4
            w-full
            border-none
            bg-transparent
            font-headline
            text-lg
            italic
            leading-snug
            text-muted-foreground
            placeholder:text-muted-foreground/40
            focus:outline-none
            focus:ring-0
            sm:text-xl
          "
        />

        {/* ================================================= */}
        {/* SUMMARY */}
        {/* ================================================= */}

        <textarea
          value={
            summary
          }
          onChange={(
            event
          ) =>
            setSummary(
              event.target.value
            )
          }
          placeholder={
            dict.story
              .summaryPlaceholder
          }
          aria-label={
            dict.story
              .summaryPlaceholder
          }
          rows={
            2
          }
          className="
            mt-4
            w-full
            resize-none
            border-none
            bg-transparent
            text-sm
            leading-relaxed
            text-foreground
            placeholder:text-muted-foreground/40
            focus:outline-none
            focus:ring-0
          "
        />

        <hr
          className="
            mb-0
            mt-6
            border-border
          "
        />
      </div>

      {/* =================================================== */}
      {/* BODY EDITOR */}
      {/* =================================================== */}
      {/*
       * Important:
       *
       * RichTextEditor is intentionally OUTSIDE max-w-3xl.
       *
       * This lets its toolbar stretch across the entire
       * writing pane and gives position: sticky access
       * to this component's overflow-y-auto scroll area.
       */}

      <div
        className="
          w-full
          bg-white
        "
      >
        <RichTextEditor
          content={
            body
          }
          onChange={
            setBody
          }
          placeholder={
            dict.story
              .bodyPlaceholder
          }
          dict={
            dict
          }
          userId={
            userId
          }
        />
      </div>

      {/* =================================================== */}
      {/* VERSION SAVE */}
      {/* =================================================== */}

      <div
        className="
          mx-auto
          w-full
          max-w-3xl
          bg-white
          px-6
          pb-8
          pt-6
          lg:px-12
        "
      >
        <div
          className="
            flex
            justify-end
          "
        >
          <button
            type="button"
            onClick={
              onSaveVersion
            }
            disabled={
              isSaving
            }
            className="
              inline-flex
              h-9
              items-center
              gap-1.5
              rounded-lg
              border
              border-border
              bg-white
              px-4
              text-xs
              font-semibold
              text-foreground
              transition-colors
              hover:bg-surface-muted
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring
              disabled:opacity-50
            "
          >
            <Save
              className="
                h-3.5
                w-3.5
              "
              aria-hidden
            />

            {
              dict.story
                .save
            }

            {' + '}

            {
              dict.story
                .versionHistory
            }
          </button>
        </div>
      </div>
    </div>
  );
}