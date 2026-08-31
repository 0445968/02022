import {
  NewsroomSidebar,
} from '@/components/editorial/newsroom-sidebar';

import {
  NewsroomTopBar,
} from '@/components/editorial/newsroom-top-bar';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  CurrentUser,
  Locale,
} from '@/types';

interface NewsroomShellProps {
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser;
  children: React.ReactNode;
}

export function NewsroomShell({
  dict,
  locale,
  user,
  children,
}: NewsroomShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-surface-subtle">
      <NewsroomTopBar
        dict={dict}
        locale={locale}
      />

      <div className="flex flex-1 overflow-hidden">
        <NewsroomSidebar
          dict={dict}
          user={user}
        />

        <main
          className="flex-1 overflow-y-auto"
          id="newsroom-main"
        >
          {children}
        </main>
      </div>
    </div>
  );
}