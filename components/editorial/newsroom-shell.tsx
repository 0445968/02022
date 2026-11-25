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

import { DocumentLanguage } from '@/components/layout/document-language';
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
    <div lang={locale} className="flex h-screen flex-col overflow-hidden bg-surface-subtle">
      <DocumentLanguage locale={locale}/>
      <a href="#newsroom-main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:p-3 focus:text-deep focus:ring-2 focus:ring-primary">{locale==='es'?'Ir al contenido':'Skip to content'}</a>
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