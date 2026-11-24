'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  LayoutDashboard,
  ClipboardCheck,
  Flag,
  FileText,
  PlusCircle,
  Image as ImageIcon,
  Newspaper,
  MessageSquare,
  BarChart3,
  Calendar,
  ShieldCheck,
  User,
  Users,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  CurrentUser, Locale,
} from '@/types';

import {
  cn,
} from '@/lib/utils';

import type {WorkspaceNavKey} from '@/lib/permissions/workspace-policy';

interface NewsroomSidebarProps {
  dict: Dictionary;
  user: CurrentUser;
  showTeamNav?: boolean;
  scopedNav?: WorkspaceNavKey[];
  locale?: Locale;
  staffName?: string;
  staffRoles?: string;
}

const NAV = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    href: '/newsroom',
  },
  {
    key: 'stories',
    icon: FileText,
    href: '/newsroom/stories',
  },
  {
    key: 'newStory',
    icon: PlusCircle,
    href: '/newsroom/stories/new',
  },
  {
    key: 'media',
    icon: ImageIcon,
    href: '/newsroom/media',
  },

  /*
   * Editorial contributor
   * profiles and headshots.
   */
  {
    key: 'authors',
    icon: Users,
    href: '/newsroom/authors',
  },

  {
    key: 'pageEditor',
    icon: Newspaper,
    href: '/newsroom/page-editor',
  },
  {
    key: 'comments',
    icon: MessageSquare,
    href: '/newsroom/comments',
  },
  {
    key: 'polls',
    icon: BarChart3,
    href: '/newsroom/polls',
  },
  {
    key: 'schedule',
    icon: Calendar,
    href: '/newsroom/schedule',
  },
  {
    key: 'team',
    icon: ShieldCheck,
    href: '/newsroom/team',
  },
  {
    key: 'profile',
    icon: User,
    href: '/newsroom/profile',
  },
];

export function NewsroomSidebar({
  dict,
  user,
  showTeamNav = false,scopedNav,locale='en',staffName,staffRoles,
}: NewsroomSidebarProps) {
  const pathname =
    usePathname();

  const items=scopedNav?scopedNav.map(key=>key==='contributor'?{key,icon:LayoutDashboard,href:'/newsroom/contributor'}:
    key==='profile'?{key,icon:User,href:'/newsroom/onboarding'}:key==='reviewInbox'?{key,icon:ClipboardCheck,href:'/newsroom/reviews'}:key==='reports'?{key,icon:Flag,href:'/newsroom/reports'}:NAV.find(item=>item.key===key)!).filter(Boolean):NAV.filter(item=>(item.key!=='team'||showTeamNav)&&item.key!=='comments');
  return (
    <aside
      className="
        flex
        w-60
        shrink-0
        flex-col
        border-r
        border-border
        bg-surface-muted
      "
    >
      {/* User block */}
      <div
        className="
          border-b
          border-border
          bg-white
          px-4
          py-3
        "
      >
        <p
          className="
            text-[0.6875rem]
            font-semibold
            uppercase
            tracking-wide
            text-muted-foreground
          "
        >
          {
            dict.newsroom.welcome
          }
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-sm
            font-bold
            text-deep
          "
        >
          {scopedNav?(staffName|| (locale==='es'?'Integrante del equipo':'Staff member')):(user.profile?.name??user.email)}
        </p>

        {(scopedNav?staffRoles:user.profile?.editorialTitle) && (
          <p
            className="
              text-xs
              text-primary
            "
          >
            {
              scopedNav?staffRoles:user.profile?.editorialTitle
            }
          </p>
        )}
      </div>

      <nav
        className="
          flex-1
          overflow-y-auto
          py-2
        "
        aria-label="Newsroom"
      >
        <ul
          className="
            space-y-0.5
            px-2
          "
        >
          {items.map(
            (item) => {
              const Icon =
                item.icon;

              const active =
                item.href ===
                '/newsroom'
                  ? pathname ===
                    '/newsroom'
                  : (pathname===item.href||pathname.startsWith(item.href+'/'))&&!(item.key==='stories'&&pathname==='/newsroom/stories/new');

              /*
               * Temporary literal label
               * for Authors.
               *
               * We'll add the EN/ES
               * dictionary values next.
               */
              const label =
  item.key==='contributor'?(locale==='es'?'Mi espacio de trabajo':'My workspace'):item.key==='reviewInbox'?(locale==='es'?'Bandeja editorial':'Review inbox'):item.key==='reports'?(locale==='es'?'Denuncias':'Reports'):dict.newsroom[item.key as keyof typeof dict.newsroom];

              return (
                <li
                  key={
                    item.key
                  }
                >
                  <Link
                    href={
                      item.href
                    }
                    className={cn(
                      `
                        flex
                        items-center
                        gap-2.5
                        rounded-[6px]
                        px-3
                        py-2
                        text-sm
                        font-medium
                        transition-colors
                        focus-visible:outline-none
                        focus-visible:ring-2
                        focus-visible:ring-ring
                      `,
                      active
                        ? 'bg-deep text-white'
                        : 'text-foreground hover:bg-white hover:text-deep'
                    )}
                    aria-current={
                      active
                        ? 'page'
                        : undefined
                    }
                  >
                    <Icon
                      className="
                        h-4
                        w-4
                        shrink-0
                      "
                      aria-hidden
                    />

                    <span className="truncate">
                      {label}
                    </span>
                  </Link>
                </li>
              );
            }
          )}
        </ul>
      </nav>

      <div
        className="
          border-t
          border-border
          px-3
          py-3
        "
      >
        <Link
          href="/"
          className="
            text-xs
            font-medium
            text-muted-foreground
            transition-colors
            hover:text-primary
            focus-visible:outline-none
            focus-visible:underline
          "
        >
          ←{' '}
          {
            dict.newsroom
              .backToSite
          }
        </Link>
      </div>
    </aside>
  );
}