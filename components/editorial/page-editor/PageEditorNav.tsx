'use client';

import type {
  Locale,
} from '@/types';

export interface PageEditorNavItem {
  id: string;
  label: string;
  assignedSlots: number;
  totalSlots: number;
  changeCount: number;
}

interface PageEditorNavProps {
  locale: Locale;

  activePageId: string;

  pages:
    PageEditorNavItem[];

  onChangePage: (
    pageId: string
  ) => void;
}

export function PageEditorNav({
  locale,
  activePageId,
  pages,
  onChangePage,
}: PageEditorNavProps) {
  return (
    <div
      className="
        border-b
        border-border
        bg-white
        px-4
        sm:px-6
      "
    >
      <div
        className="
          flex
          min-w-0
          gap-1
          overflow-x-auto
        "
      >
        {pages.map(
          (
            page
          ) => {
            const active =
              page.id ===
              activePageId;

            return (
              <button
                key={
                  page.id
                }
                type="button"
                onClick={() =>
                  onChangePage(
                    page.id
                  )
                }
                className={`
                  relative
                  flex
                  shrink-0
                  items-center
                  gap-3
                  border-b-2
                  px-3
                  py-3
                  text-left
                  transition-colors

                  ${
                    active
                      ? 'border-primary text-deep'
                      : 'border-transparent text-muted-foreground hover:text-deep'
                  }
                `}
              >
                <div
                  className="
                    min-w-0
                  "
                >
                  <div
                    className="
                      flex
                      items-center
                      gap-2
                    "
                  >
                    <span
                      className="
                        text-sm
                        font-semibold
                      "
                    >
                      {
                        page.label
                      }
                    </span>

                    {page.changeCount >
                      0 && (
                      <span
                        className="
                          inline-flex
                          min-w-5
                          items-center
                          justify-center
                          rounded-full
                          bg-primary
                          px-1.5
                          py-0.5
                          text-[10px]
                          font-bold
                          leading-none
                          text-white
                        "
                      >
                        {
                          page.changeCount
                        }
                      </span>
                    )}
                  </div>

                  <p
                    className="
                      mt-0.5
                      text-[10px]
                      text-muted-foreground
                    "
                  >
                    {
                      page.assignedSlots
                    }
                    /
                    {
                      page.totalSlots
                    }{' '}

                    {locale ===
                    'es'
                      ? 'espacios'
                      : 'slots'}
                  </p>
                </div>
              </button>
            );
          }
        )}
      </div>
    </div>
  );
}