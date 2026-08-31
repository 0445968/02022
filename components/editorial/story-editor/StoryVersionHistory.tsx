'use client';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  StoryVersion,
} from '@/types/editorial';

interface StoryVersionHistoryProps {
  dict: Dictionary;
  versions: StoryVersion[];
  canRestore: boolean;
  onRestore: (
    versionId: string
  ) => void;
}

export function StoryVersionHistory({
  dict,
  versions,
  canRestore,
  onRestore,
}: StoryVersionHistoryProps) {
  if (
    versions.length === 0
  ) {
    return (
      <p className="text-sm text-muted-foreground">
        {
          dict.story
            .noVersions
        }
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {versions
        .slice(0, 10)
        .map(
          (version) => (
            <div
              key={
                version.id
              }
              className="
                border
                border-border
                bg-white
                p-2.5
              "
            >
              <p className="truncate text-sm font-medium text-foreground">
                {version.headline ||
                  '(untitled)'}
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(
                  version.createdAt
                ).toLocaleString(
                  undefined,
                  {
                    dateStyle:
                      'medium',
                    timeStyle:
                      'short',
                  }
                )}

                {version.createdByName &&
                  ` · ${dict.story.versionSavedBy} ${version.createdByName}`}
              </p>

              {canRestore && (
                <button
                  type="button"
                  onClick={() =>
                    onRestore(
                      version.id
                    )
                  }
                  className="
                    mt-1.5
                    text-xs
                    font-medium
                    text-primary
                    hover:underline
                  "
                >
                  {
                    dict.story
                      .restore
                  }
                </button>
              )}
            </div>
          )
        )}
    </div>
  );
}