'use client';

import {
  CheckCircle2,
  ChevronDown,
  History,
  RotateCcw,
  Send,
} from 'lucide-react';
import {
  useState,
  useEffect,
  useRef,
} from 'react';

import type {
  Locale,
} from '@/types';

interface PageEditorTopBarProps {
  locale: Locale;

  changedPageCount: number;

  busy?: boolean;

  onPublishAll: () => void;

  onRevertAll: () => void;

  onOpenHistory: () => void;
}

export function PageEditorTopBar({
  locale,
  changedPageCount,
  busy = false,
  onPublishAll,
  onRevertAll,
  onOpenHistory,
}: PageEditorTopBarProps) {
  const [
    menuOpen,
    setMenuOpen,
  ] = useState(false);
  const menuRef=useRef<HTMLDivElement>(null);
  const actionsRef=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!menuOpen)return;
    const outside=(event:PointerEvent)=>{if(event.target instanceof Node&&!menuRef.current?.contains(event.target))setMenuOpen(false);};
    const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setMenuOpen(false);actionsRef.current?.focus();}};
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[menuOpen]);

  return (
    <div
      className="
        sticky
        top-0
        z-40
        border-b
        border-border
        bg-white/95
        backdrop-blur
      "
    >
      <div
        className="
          flex
          min-h-14
          flex-wrap
          items-center
          justify-between
          gap-2
          py-2
          sm:gap-4
          sm:py-0
          px-4
          sm:px-6
        "
      >
        <div
          className="
            flex
            min-w-0
            items-center
            gap-3
          "
        >
          <div
            className="
              min-w-0
            "
          >
            <h1
              className="
                truncate
                text-sm
                font-bold
                text-deep
              "
            >
              {locale === 'es'
                ? 'Editor de páginas'
                : 'Page Editor'}
            </h1>

            <p
              className="
                text-[11px]
                text-muted-foreground
              "
            >
              {changedPageCount > 0
                ? locale === 'es'
                  ? `${changedPageCount} ${
                      changedPageCount === 1
                        ? 'página con cambios'
                        : 'páginas con cambios'
                    }`
                  : `${changedPageCount} ${
                      changedPageCount === 1
                        ? 'page with changes'
                        : 'pages with changes'
                    }`
                : locale === 'es'
                  ? 'Todos los cambios publicados'
                  : 'All changes published'}
            </p>
          </div>

          {changedPageCount ===
            0 && (
            <CheckCircle2
              className="
                h-4
                w-4
                shrink-0
                text-emerald-600
              "
              aria-hidden
            />
          )}
        </div>

        <div
          ref={menuRef}
          className="
            relative
            flex
            items-center
            gap-2
          "
        >
          {changedPageCount >
            0 && (
            <button
              type="button"
              disabled={
                busy
              }
              onClick={
                onPublishAll
              }
              className="
                inline-flex
                h-9
                items-center
                gap-2
                rounded-lg
                bg-primary
                px-3
                text-xs
                font-bold
                text-white
                transition-colors
                hover:bg-primary/90
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
            >
              <Send
                className="
                  h-4
                  w-4
                "
                aria-hidden
              />

              {locale === 'es'
                ? 'Publicar todo'
                : 'Publish All'}
            </button>
          )}

          <button
            id="page-editor-actions"
            ref={actionsRef}
            type="button"
            aria-controls={menuOpen?'page-editor-actions-panel':undefined}
            disabled={
              busy
            }
            onClick={() =>
              setMenuOpen(
                (current) =>
                  !current
              )
            }
            className="
              inline-flex
              h-9
              items-center
              gap-2
              rounded-lg
              border
              border-border
              bg-white
              px-3
              text-xs
              font-semibold
              text-deep
              transition-colors
              hover:bg-surface-muted
              disabled:cursor-not-allowed
              disabled:opacity-50
            "
            aria-expanded={
              menuOpen
            }
          >
            {locale === 'es'
              ? 'Acciones'
              : 'Actions'}

            <ChevronDown
              className="
                h-4
                w-4
              "
              aria-hidden
            />
          </button>

          {menuOpen && (
            <div
              id="page-editor-actions-panel"
              className="
                absolute
                right-0
                top-[calc(100%+0.5rem)]
                z-50
                w-56
                overflow-hidden
                rounded-xl
                border
                border-border
                bg-white
                p-1.5
                shadow-xl
              "
            >
              <button
                type="button"
                disabled={
                  busy ||
                  changedPageCount ===
                    0
                }
                onClick={() => {
                  setMenuOpen(
                    false
                  );

                  onRevertAll();
                }}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2.5
                  text-left
                  text-xs
                  font-medium
                  text-deep
                  transition-colors
                  hover:bg-surface-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <RotateCcw
                  className="
                    h-4
                    w-4
                    shrink-0
                  "
                  aria-hidden
                />

                {locale === 'es'
                  ? 'Revertir todos los cambios'
                  : 'Revert All Changes'}
              </button>

              <button
                type="button"
                disabled={
                  busy
                }
                onClick={() => {
                  setMenuOpen(
                    false
                  );

                  onOpenHistory();
                }}
                className="
                  flex
                  w-full
                  items-center
                  gap-3
                  rounded-lg
                  px-3
                  py-2.5
                  text-left
                  text-xs
                  font-medium
                  text-deep
                  transition-colors
                  hover:bg-surface-muted
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                <History
                  className="
                    h-4
                    w-4
                    shrink-0
                  "
                  aria-hidden
                />

                {locale === 'es'
                  ? 'Historial de diseños'
                  : 'Layout History'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}