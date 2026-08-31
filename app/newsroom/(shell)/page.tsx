import { FileText, FileEdit, Send, Eye } from 'lucide-react';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { resolveRoleLabel, isEditor } from '@/lib/permissions';
import { getStoryCounts } from '@/lib/services/stories';

export default async function NewsroomDashboard() {
  const user = await getCurrentUser();
  const locale = user?.profile?.preferredLocale ?? defaultLocale;
  const dict = getDictionary(locale);
  const roleLabel = resolveRoleLabel(user);
  const counts = await getStoryCounts();

  const stats = [
    { key: 'statStories', value: counts.total, icon: FileText },
    { key: 'statDrafts', value: counts.drafts, icon: FileEdit },
    { key: 'statInReview', value: counts.inReview, icon: Eye },
    { key: 'statPublished', value: counts.published, icon: Send },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <div className="flex items-center justify-between border-b border-border pb-5">
        <div>
          <h1 className="font-headline text-2xl font-bold text-deep">
            {dict.newsroom.dashboardTitle}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dict.newsroom.dashboardDesc}
          </p>
        </div>
        <Link
          href="/newsroom/stories/new"
          className="inline-flex h-9 items-center gap-1.5 bg-primary px-4 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          + {dict.newsroom.newStory}
        </Link>
      </div>

      {/* Stats grid */}
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.key} className="border border-border bg-white p-5">
              <div className="flex items-center justify-between">
                <Icon className="h-5 w-5 text-muted-foreground" aria-hidden />
                <span className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  {dict.newsroom[stat.key as keyof typeof dict.newsroom]}
                </span>
              </div>
              <p className="mt-3 font-headline text-3xl font-bold text-deep">
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Profile summary */}
      <div className="mt-8 border border-border bg-white p-6">
        <h2 className="font-headline text-lg font-semibold text-deep">
          {dict.account.profile}
        </h2>
        <dl className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.auth.name}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {user?.profile?.name ?? '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.account.role}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {dict.account[
                roleLabel === 'author-editor'
                  ? 'roleAuthorEditor'
                  : roleLabel === 'author'
                  ? 'roleAuthor'
                  : roleLabel === 'editor'
                  ? 'roleEditor'
                  : 'roleUser'
              ]}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {dict.account.editorialTitle}
            </dt>
            <dd className="mt-1 text-sm font-medium text-foreground">
              {user?.profile?.editorialTitle ?? '—'}
            </dd>
          </div>
        </dl>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">{dict.newsroom.stageNotice}</p>
    </div>
  );
}
