'use client';

import {
  useEffect,
  useState,
} from 'react';

import {
  ImagePlus,
  Save,
  Trash2,
} from 'lucide-react';

import type {
  EditorialBylineStatus,
} from '@/lib/db/database.types';

import type {
  EditorialProfile,
  MediaAsset,
} from '@/types/editorial';

export interface AuthorProfileFormValues {
  bylineName: string;
  editorialTitle: string;
  bio: string;
  bylineStatus: EditorialBylineStatus;
  headshotMediaId: string | null;
}

interface AuthorProfileFormProps {
  author: EditorialProfile;

  headshot: MediaAsset | null;

  onChooseHeadshot: () => void;

  onRemoveHeadshot: () => void;

  onSave: (
    values: AuthorProfileFormValues
  ) => Promise<void> | void;
}

function getInitials(
  name: string
) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) =>
      part.charAt(0)
    )
    .join('')
    .toUpperCase();
}

export function AuthorProfileForm({
  author,
  headshot,
  onChooseHeadshot,
  onRemoveHeadshot,
  onSave,
}: AuthorProfileFormProps) {
  const [
    bylineName,
    setBylineName,
  ] = useState(
    author.bylineName
  );

  const [
    editorialTitle,
    setEditorialTitle,
  ] = useState(
    author.editorialTitle ??
      ''
  );

  const [
    bio,
    setBio,
  ] = useState(
    author.bio ?? ''
  );

  const [
    bylineStatus,
    setBylineStatus,
  ] =
    useState<EditorialBylineStatus>(
      author.bylineStatus
    );

  const [
    saving,
    setSaving,
  ] = useState(false);

  const [
    saved,
    setSaved,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  useEffect(() => {
    setBylineName(
      author.bylineName
    );

    setEditorialTitle(
      author.editorialTitle ??
        ''
    );

    setBio(
      author.bio ?? ''
    );

    setBylineStatus(
      author.bylineStatus
    );

    setSaved(false);
    setError(null);
  }, [
    author.id,
    author.bylineName,
    author.editorialTitle,
    author.bio,
    author.bylineStatus,
  ]);

  const originalHeadshotId =
    author.headshot?.id ??
    null;

  const currentHeadshotId =
    headshot?.id ??
    null;

  const hasChanges =
    bylineName !==
      author.bylineName ||
    editorialTitle !==
      (author.editorialTitle ??
        '') ||
    bio !==
      (author.bio ?? '') ||
    bylineStatus !==
      author.bylineStatus ||
    currentHeadshotId !==
      originalHeadshotId;

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const trimmedName =
      bylineName.trim();

    if (!trimmedName) {
      setError(
        'Byline name is required.'
      );

      return;
    }

    setSaving(true);
    setSaved(false);
    setError(null);

    try {
      await onSave({
        bylineName:
          trimmedName,

        editorialTitle:
          editorialTitle.trim(),

        bio:
          bio.trim(),

        bylineStatus,

        headshotMediaId:
          headshot?.id ??
          null,
      });

      setSaved(true);

      window.setTimeout(
        () => {
          setSaved(false);
        },
        2500
      );
    } catch (
      saveError
    ) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Unable to save author profile.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={
        handleSubmit
      }
      className="
        space-y-8
      "
    >
      {/* =====================================================
          PROFILE PHOTO
      ===================================================== */}

      <section>
        <div>
          <h3
            className="
              font-interface
              text-sm
              font-semibold
              text-deep
            "
          >
            Profile photo
          </h3>

          <p
            className="
              mt-1
              text-sm
              text-muted-foreground
            "
          >
            This photo appears
            beside the author
            byline and on public
            author pages.
          </p>
        </div>

        <div
          className="
            mt-4
            flex
            flex-col
            gap-4
            sm:flex-row
            sm:items-center
          "
        >
          <div
            className="
              flex
              h-24
              w-24
              shrink-0
              items-center
              justify-center
              overflow-hidden
              rounded-full
              bg-surface-subtle
              ring-1
              ring-border
            "
          >
            {headshot?.url ? (
              <img
                src={
                  headshot.url
                }
                alt={
                  bylineName
                    ? `${bylineName} profile photo`
                    : 'Author profile photo'
                }
                className="
                  h-full
                  w-full
                  object-cover
                "
              />
            ) : (
              <span
                className="
                  font-interface
                  text-xl
                  font-bold
                  text-deep
                "
              >
                {getInitials(
                  bylineName ||
                    author.bylineName
                )}
              </span>
            )}
          </div>

          <div
            className="
              flex
              flex-wrap
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                onChooseHeadshot
              }
              className="
                inline-flex
                h-10
                items-center
                gap-2
                rounded-lg
                border
                border-border
                bg-white
                px-4
                font-interface
                text-sm
                font-semibold
                text-deep
                transition-colors
                hover:bg-surface-muted
                focus-visible:outline-none
                focus-visible:ring-2
                focus-visible:ring-ring
              "
            >
              <ImagePlus
                className="
                  h-4
                  w-4
                "
                aria-hidden
              />

              {headshot
                ? 'Change photo'
                : 'Choose photo'}
            </button>

            {headshot && (
              <button
                type="button"
                onClick={
                  onRemoveHeadshot
                }
                className="
                  inline-flex
                  h-10
                  items-center
                  gap-2
                  rounded-lg
                  border
                  border-border
                  bg-white
                  px-4
                  font-interface
                  text-sm
                  font-semibold
                  text-destructive
                  transition-colors
                  hover:bg-destructive/5
                  focus-visible:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-ring
                "
              >
                <Trash2
                  className="
                    h-4
                    w-4
                  "
                  aria-hidden
                />

                Remove
              </button>
            )}
          </div>
        </div>
      </section>

      <div
        className="
          h-px
          bg-border
        "
      />

      {/* =====================================================
          BYLINE NAME
      ===================================================== */}

      <div>
        <label
          htmlFor="author-byline-name"
          className="
            font-interface
            text-sm
            font-semibold
            text-deep
          "
        >
          Byline name
        </label>

        <p
          className="
            mt-1
            text-xs
            text-muted-foreground
          "
        >
          The public name shown
          on stories.
        </p>

        <input
          id="author-byline-name"
          type="text"
          value={
            bylineName
          }
          onChange={(
            event
          ) =>
            setBylineName(
              event.target.value
            )
          }
          required
          className="
            mt-3
            h-11
            w-full
            rounded-lg
            border
            border-input
            bg-background
            px-3
            text-sm
            text-foreground
            outline-none
            transition-colors
            focus:border-primary
            focus:ring-2
            focus:ring-primary/15
          "
        />
      </div>

      {/* =====================================================
          EDITORIAL TITLE
      ===================================================== */}

      <div>
        <label
          htmlFor="author-editorial-title"
          className="
            font-interface
            text-sm
            font-semibold
            text-deep
          "
        >
          Editorial title
        </label>

        <p
          className="
            mt-1
            text-xs
            text-muted-foreground
          "
        >
          For example: Staff
          Writer, Editor, or
          Contributor.
        </p>

        <input
          id="author-editorial-title"
          type="text"
          value={
            editorialTitle
          }
          onChange={(
            event
          ) =>
            setEditorialTitle(
              event.target.value
            )
          }
          placeholder="Staff Writer"
          className="
            mt-3
            h-11
            w-full
            rounded-lg
            border
            border-input
            bg-background
            px-3
            text-sm
            text-foreground
            outline-none
            transition-colors
            placeholder:text-muted-foreground
            focus:border-primary
            focus:ring-2
            focus:ring-primary/15
          "
        />
      </div>

      {/* =====================================================
          BIOGRAPHY
      ===================================================== */}

      <div>
        <label
          htmlFor="author-bio"
          className="
            font-interface
            text-sm
            font-semibold
            text-deep
          "
        >
          Biography
        </label>

        <p
          className="
            mt-1
            text-xs
            text-muted-foreground
          "
        >
          A short biography for
          the author profile.
        </p>

        <textarea
          id="author-bio"
          value={
            bio
          }
          onChange={(
            event
          ) =>
            setBio(
              event.target.value
            )
          }
          rows={6}
          placeholder="Write a short author biography..."
          className="
            mt-3
            w-full
            resize-y
            rounded-lg
            border
            border-input
            bg-background
            px-3
            py-3
            text-sm
            leading-6
            text-foreground
            outline-none
            transition-colors
            placeholder:text-muted-foreground
            focus:border-primary
            focus:ring-2
            focus:ring-primary/15
          "
        />
      </div>

      {/* =====================================================
          STATUS
      ===================================================== */}

      <div>
        <label
          htmlFor="author-status"
          className="
            font-interface
            text-sm
            font-semibold
            text-deep
          "
        >
          Byline status
        </label>

        <select
          id="author-status"
          value={
            bylineStatus
          }
          onChange={(
            event
          ) =>
            setBylineStatus(
              event.target
                .value as EditorialBylineStatus
            )
          }
          className="
            mt-3
            h-11
            w-full
            max-w-xs
            rounded-lg
            border
            border-input
            bg-background
            px-3
            text-sm
            text-foreground
            outline-none
            transition-colors
            focus:border-primary
            focus:ring-2
            focus:ring-primary/15
          "
        >
          <option value="active">
            Active
          </option>

          <option value="former">
            Former
          </option>

          <option value="hidden">
            Hidden
          </option>
        </select>

        <p
          className="
            mt-2
            max-w-lg
            text-xs
            leading-5
            text-muted-foreground
          "
        >
          Active profiles can be
          displayed publicly.
          Former preserves
          historical bylines.
          Hidden removes the
          contributor from public
          listings.
        </p>
      </div>

      {/* =====================================================
          ERROR
      ===================================================== */}

      {error && (
        <div
          role="alert"
          className="
            rounded-lg
            border
            border-breaking/20
            bg-breaking/5
            px-4
            py-3
            text-sm
            text-breaking
          "
        >
          {error}
        </div>
      )}

      {/* =====================================================
          SAVE
      ===================================================== */}

      <div
        className="
          flex
          items-center
          gap-3
          border-t
          border-border
          pt-6
        "
      >
        <button
          type="submit"
          disabled={
            saving ||
            !hasChanges ||
            !bylineName.trim()
          }
          className="
            inline-flex
            h-10
            items-center
            gap-2
            rounded-lg
            bg-primary
            px-4
            font-interface
            text-sm
            font-semibold
            text-white
            transition-colors
            hover:bg-primary/90
            focus-visible:outline-none
            focus-visible:ring-2
            focus-visible:ring-ring
            disabled:pointer-events-none
            disabled:opacity-50
          "
        >
          <Save
            className="
              h-4
              w-4
            "
            aria-hidden
          />

          {saving
            ? 'Saving...'
            : 'Save changes'}
        </button>

        {saved && (
          <span
            className="
              font-interface
              text-sm
              font-medium
              text-muted-foreground
            "
          >
            Saved
          </span>
        )}
      </div>
    </form>
  );
}