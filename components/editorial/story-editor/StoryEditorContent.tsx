'use client';

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

import {
  StoryDetailsToolbar,
} from '@/components/editorial/story-editor/StoryDetailsToolbar';

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
  return (
    <div
      className="
        flex-1
        overflow-y-auto
        bg-white
      "
    >
      {/* =================================================== */}
      {/* STORY DETAILS TOOLBAR */}
      {/* =================================================== */}

      <StoryDetailsToolbar
        dict={dict}
        language={language}
        headline={headline}
        subheadline={subheadline}
        summary={summary}
        setHeadline={setHeadline}
        setSubheadline={setSubheadline}
        setSummary={setSummary}
      />

      {/* =================================================== */}
      {/* BODY EDITOR */}
      {/* =================================================== */}

      <div
        className="
          w-full
          bg-white
        "
      >
        <RichTextEditor
          content={body}
          onChange={setBody}
          placeholder={
            dict.story
              .bodyPlaceholder
          }
          dict={dict}
          userId={userId}
        />
      </div>

      {/* =================================================== */}
      {/* MANUAL VERSION SAVE */}
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