'use client';

import { Save } from 'lucide-react';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { StoryLanguage } from '@/lib/db/database.types';

import { RichTextEditor } from '@/components/editorial/rich-text-editor';

interface StoryEditorContentProps {
  dict: Dictionary;
  userId: string;

  language: StoryLanguage;

  headline: string;
  subheadline: string;
  summary: string;

  body: Record<string, unknown>;

  isSaving: boolean;

  setHeadline: (value: string) => void;
  setSubheadline: (value: string) => void;
  setSummary: (value: string) => void;

  setBody: (
    value: Record<string, unknown>
  ) => void;

  onSaveVersion: () => void;
}

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
        px-6
        py-6
        lg:px-12
        lg:py-8
      "
    >
      <div className="mx-auto max-w-3xl">
        {/* Language indicator */}
        <div className="mb-4 flex items-center gap-2">
          <span className="eyebrow text-primary">
            {language === 'en'
              ? dict.common.languageEN
              : dict.common.languageES}
          </span>

          <span className="text-xs text-muted-foreground">
            ·
          </span>

          <span className="text-xs text-muted-foreground">
            {dict.story.language}
          </span>
        </div>

        {/* Headline */}
        <input
          type="text"
          value={headline}
          onChange={(event) =>
            setHeadline(event.target.value)
          }
          placeholder={
            dict.story.headlinePlaceholder
          }
          aria-label={
            dict.stories.columns.headline
          }
          className="
            w-full
            border-none
            bg-transparent
            font-headline
            text-3xl
            font-bold
            leading-tight
            text-deep
            placeholder:text-muted-foreground/40
            focus:outline-none
            focus:ring-0
            sm:text-4xl
            lg:text-5xl
          "
        />

        {/* Subheadline */}
        <input
          type="text"
          value={subheadline}
          onChange={(event) =>
            setSubheadline(event.target.value)
          }
          placeholder={
            dict.story.subheadlinePlaceholder
          }
          aria-label={
            dict.story.subheadlinePlaceholder
          }
          className="
            mt-3
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

        {/* Summary */}
        <textarea
          value={summary}
          onChange={(event) =>
            setSummary(event.target.value)
          }
          placeholder={
            dict.story.summaryPlaceholder
          }
          aria-label={
            dict.story.summaryPlaceholder
          }
          rows={2}
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

        <hr className="my-6 border-border" />

        {/* Body editor */}
        <RichTextEditor
          content={body}
          onChange={setBody}
          placeholder={
            dict.story.bodyPlaceholder
          }
          dict={dict}
          userId={userId}
        />

        {/* Manual version save */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onSaveVersion}
            disabled={isSaving}
            className="
              inline-flex
              h-9
              items-center
              gap-1.5
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
              className="h-3.5 w-3.5"
              aria-hidden
            />

            {dict.story.save}
            {' + '}
            {dict.story.versionHistory}
          </button>
        </div>
      </div>
    </div>
  );
}