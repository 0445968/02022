'use client';

import Link from 'next/link';
import {useEffect,useRef} from 'react';
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
  const navRef=useRef<HTMLElement>(null);
  useEffect(()=>{
    const nav=navRef.current;
    if(!nav||!window.matchMedia('(max-width: 1023px)').matches)return;
    const active=nav.querySelector<HTMLElement>('[aria-current="page"]');
    if(!active)return;
    const bounds=nav.getBoundingClientRect(),item=active.getBoundingClientRect();
    if(item.left<bounds.left||item.right>bounds.right)nav.scrollLeft+=item.left-bounds.left-(bounds.width-item.width)/2;
  },[pathname]);

  const items=scopedNav?scopedNav.map(key=>key==='contributor'?{key,icon:LayoutDashboard,href:'/newsroom/contributor'}:
    key==='profile'?{key,icon:User,href:'/newsroom/profile'}:key==='reviewInbox'?{key,icon:ClipboardCheck,href:'/newsroom/reviews'}:key==='reports'?{key,icon:Flag,href:'/newsroom/reports'}:NAV.find(item=>item.key===key)!).filter(Boolean):NAV.filter(item=>(item.key!=='team'||showTeamNav)&&item.key!=='comments'&&item.key!=='schedule'&&item.key!=='polls');
  return (
    <aside
      className="
        flex
        w-full
        min-w-0
        shrink-0
        flex-col
        border-b
        lg:w-60
        lg:border-b-0
        lg:border-r
        border-border
        bg-surface-muted
      "
    >
      {/* User block */}
      <div
        className="
          hidden
          border-b
          border-border
          bg-white
          px-4
          py-3
          lg:block
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
        ref={navRef}
        className="
          min-w-0
          flex-1
          overflow-x-auto
          py-2
          lg:overflow-y-auto
        "
        aria-label={locale==='es'?'Redacción':'Newsroom'}
      >
        <ul
          className="
            flex
            min-w-max
            gap-1
            px-2
            lg:block
            lg:min-w-0
            lg:space-y-0.5
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
                        whitespace-nowrap
                        gap-2.5
                        lg:whitespace-normal
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
          hidden
          border-t
          border-border
          px-3
          py-3
          lg:block
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