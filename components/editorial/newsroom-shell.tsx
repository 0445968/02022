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

import type {WorkspaceNavKey} from '@/lib/permissions/workspace-policy';

interface NewsroomShellProps {
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser;
  children: React.ReactNode;
  showTeamNav?: boolean;
  scopedNav?:WorkspaceNavKey[];
  staffName?:string;
  staffRoles?:string;
}

export function NewsroomShell({
  dict,
  locale,
  user,
  children,
  showTeamNav = false,scopedNav,staffName,staffRoles,
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
          showTeamNav={showTeamNav} scopedNav={scopedNav} locale={locale} staffName={staffName} staffRoles={staffRoles}
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