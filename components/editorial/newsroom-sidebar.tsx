'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Image as ImageIcon,
  Newspaper,
  MessageSquare,
  BarChart3,
  Calendar,
  User,
} from 'lucide-react';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { CurrentUser } from '@/types';
import { cn } from '@/lib/utils';

interface NewsroomSidebarProps {
  dict: Dictionary;
  user: CurrentUser;
}

const NAV = [
  { key: 'dashboard', icon: LayoutDashboard, href: '/newsroom' },
  { key: 'stories', icon: FileText, href: '/newsroom/stories' },
  { key: 'newStory', icon: PlusCircle, href: '/newsroom/stories/new' },
  { key: 'media', icon: ImageIcon, href: '/newsroom/media' },
  { key: 'pageEditor', icon: Newspaper, href: '/newsroom/front-page' },
  { key: 'comments', icon: MessageSquare, href: '/newsroom/comments' },
  { key: 'polls', icon: BarChart3, href: '/newsroom/polls' },
  { key: 'schedule', icon: Calendar, href: '/newsroom/schedule' },
  { key: 'profile', icon: User, href: '/newsroom/profile' },
];

export function NewsroomSidebar({ dict, user }: NewsroomSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-border bg-surface-muted">
      {/* User block */}
      <div className="border-b border-border bg-white px-4 py-3">
        <p className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {dict.newsroom.welcome}
        </p>
        <p className="mt-0.5 truncate text-sm font-bold text-deep">
          {user.profile?.name ?? user.email}
        </p>
        {user.profile?.editorialTitle && (
          <p className="text-xs text-primary">{user.profile.editorialTitle}</p>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto py-2" aria-label="Newsroom">
        <ul className="space-y-0.5 px-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === '/newsroom'
                ? pathname === '/newsroom'
                : pathname.startsWith(item.href);
            return (
              <li key={item.key}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    active
                      ? 'bg-deep text-white'
                      : 'text-foreground hover:bg-white hover:text-deep'
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span className="truncate">{dict.newsroom[item.key as keyof typeof dict.newsroom]}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-border px-3 py-3">
        <Link
          href="/"
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:underline"
        >
          ← {dict.newsroom.backToSite}
        </Link>
      </div>
    </aside>
  );
}
