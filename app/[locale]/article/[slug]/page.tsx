import { notFound } from 'next/navigation';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { isLocale } from '@/lib/i18n/config';
import { getPublishedStoryBySlug, getRelatedStories } from '@/lib/services/stories';
import { ArticleView } from '@/components/editorial/article-view';
import type { Locale } from '@/types';
import type { Metadata } from 'next';

interface PageProps {
  params: { locale: string; slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const locale = isLocale(params.locale) ? params.locale : 'en';
  const story = await getPublishedStoryBySlug(params.slug);

  if (!story) return { title: 'Not found' };

  const title = story.seoTitle || story.headline;
  const description = story.seoDescription || story.summary || '';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: story.featuredImage ? [{ url: story.featuredImage.url }] : [],
      publishedTime: story.publishedAt ?? undefined,
      authors: story.author?.name ? [story.author.name] : [],
    },
    alternates: {
      languages: {
        en: `/en/article/${story.slug}`,
        es: `/es/article/${story.slug}`,
      },
    },
  };
}

export default async function ArticlePage({ params }: PageProps) {
  if (!isLocale(params.locale)) notFound();
  const locale = params.locale as Locale;
  const dict = getDictionary(locale);

  const story = await getPublishedStoryBySlug(params.slug);

  if (!story) {
    return (
      <div className="container-wide py-20 text-center">
        <h1 className="font-headline text-3xl font-bold text-deep">{dict.article.notFound}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{dict.article.notFoundDesc}</p>
      </div>
    );
  }

  return <ArticleView story={story} locale={locale} dict={dict} />;
}
