import Link from 'next/link';
import { Fragment } from 'react';
import { Bookmark, Share2, MessageSquare } from 'lucide-react';
import type { Locale } from '@/types';
import type { Dictionary } from '@/lib/i18n/dictionaries';
import type { StoryWithRelations } from '@/types/editorial';
import { categoryLabel, islandLabel, statusLabel } from '@/types/editorial';
import { localizedPath } from '@/lib/i18n/config';

interface ArticleViewProps {
  story: StoryWithRelations;
  locale: Locale;
  dict: Dictionary;
  isPreview?: boolean;
}

export function ArticleView({ story, locale, dict, isPreview }: ArticleViewProps) {
  const categoryName = story.primaryCategory
    ? categoryLabel(story.primaryCategory, locale)
    : null;
  const categoryHref = story.primaryCategory
    ? localizedPath(locale, `/category/${story.primaryCategory.slug}`)
    : null;

  const isSameAuthorEditor =
    story.author && story.editor && story.author.id === story.editor.id;

  return (
    <article className="bg-white">
      {/* Article header */}
      <header className="border-b border-border">
        <div className="container-wide py-8 lg:py-10">
          <div className="mx-auto max-w-3xl">
            {/* Breadcrumb / category */}
            {categoryName && categoryHref && (
              <Link
                href={categoryHref}
                className="eyebrow text-primary hover:underline"
              >
                {categoryName}
              </Link>
            )}

            {/* Headline */}
            <h1 className="mt-3 font-headline text-3xl font-bold leading-tight text-deep sm:text-4xl lg:text-5xl text-balance">
              {story.headline}
            </h1>

            {/* Subheadline */}
            {story.subheadline && (
              <p className="mt-4 font-headline text-lg italic leading-snug text-muted-foreground sm:text-xl">
                {story.subheadline}
              </p>
            )}

            {/* Summary */}
            {story.summary && (
              <p className="mt-4 text-base leading-relaxed text-foreground">
                {story.summary}
              </p>
            )}

            {/* Byline */}
            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
              {story.author && (
                <span className="font-medium text-foreground">
                  {dict.common.by}{' '}
                  <span className="font-semibold text-deep">{story.author.name}</span>
                  {story.author.editorialTitle && (
                    <span className="text-muted-foreground"> · {story.author.editorialTitle}</span>
                  )}
                </span>
              )}
              {story.editor && !isSameAuthorEditor && (
                <span className="text-muted-foreground">
                  {dict.common.editedBy}{' '}
                  <span className="font-medium text-foreground">{story.editor.name}</span>
                </span>
              )}
            </div>

            {/* Meta row: dates, language, island */}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {story.publishedAt && (
                <time dateTime={story.publishedAt}>
                  {dict.common.published}{' '}
                  {new Date(story.publishedAt).toLocaleDateString(locale === 'es' ? 'es' : 'en', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </time>
              )}
              {story.updatedAt !== story.publishedAt && (
                <time dateTime={story.updatedAt}>
                  {dict.common.updated}{' '}
                  {new Date(story.updatedAt).toLocaleDateString(locale === 'es' ? 'es' : 'en', {
                    month: 'short',
                    day: 'numeric',
                  })}
                </time>
              )}
              {story.language !== locale && (
                <span className="font-semibold uppercase tracking-wide text-primary">
                  {story.language === 'en' ? dict.common.languageEN : dict.common.languageES}
                </span>
              )}
              {story.island !== 'none' && (
                <span>{islandLabel(story.island, locale)}</span>
              )}
            </div>

            {/* Share / bookmark / comments placeholders */}
            <div className="mt-6 flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                aria-label={dict.article.share}
              >
                <Share2 className="h-3.5 w-3.5" aria-hidden />
                {dict.article.share}
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-border bg-white px-3 text-xs font-medium text-foreground transition-colors hover:bg-surface-muted"
                aria-label={dict.article.bookmark}
              >
                <Bookmark className="h-3.5 w-3.5" aria-hidden />
                {dict.article.bookmark}
              </button>
              <button
                type="button"
                className="inline-flex h-8 items-center gap-1.5 border border-border bg-white px-3 text-xs font-medium text-muted-foreground"
                aria-label={dict.article.comments}
              >
                <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                {dict.article.comments} · {dict.article.comingSoon}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Featured image */}
{story.featuredImage && (
  <figure className="border-b border-border">
    <div className="container-wide py-6">
      <div className="mx-auto max-w-4xl">
        <img
          src={story.featuredImage.url}
          alt={
            story.featuredImage.altText ||
            story.imageCaption ||
            ''
          }
          className="
            w-full
            bg-surface-subtle
            object-cover
          "
        />

        {(story.imageCaption ||
          story.imageCredit) && (
          <figcaption
            className="
              mt-2
              font-headline
              text-[0.95rem]
              leading-[1.45]
              text-muted-foreground
            "
          >
            {story.imageCaption && (
              <span>
                {story.imageCaption}
              </span>
            )}

            {story.imageCaption &&
              story.imageCredit && ' '}

            {story.imageCredit && (
              <em>
                (
                {story.imageCredit}
                )
              </em>
            )}
          </figcaption>
        )}
      </div>
    </div>
  </figure>
)}

      {/* Article body */}
      <div className="container-wide py-8 lg:py-10">
        <div className="mx-auto max-w-2xl">
          <ArticleBody body={story.body} />
        </div>
      </div>

      {/* Tags */}
      {story.tags.length > 0 && (
        <div className="border-t border-border">
          <div className="container-wide py-6">
            <div className="mx-auto max-w-2xl">
              <h2 className="eyebrow text-deep">{dict.story.tags}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {story.tags.map((tag) => (
                  <span
                    key={tag.id}
                    className="border border-border bg-surface-muted px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {tag.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Related stories placeholder */}
      <div className="border-t border-border bg-surface-muted">
        <div className="container-wide py-8">
          <div className="mx-auto max-w-3xl">
            <h2 className="font-headline text-xl font-bold text-deep">{dict.article.relatedStories}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{dict.article.comingSoon}</p>
          </div>
        </div>
      </div>
    </article>
  );
}

/** Renders the TipTap JSON body as HTML using a recursive renderer. */
function ArticleBody({ body }: { body: Record<string, unknown> }) {
  return <div className="article-body">{renderNode(body)}</div>;

  function renderNode(node: Record<string, unknown>): React.ReactNode {
    const type = node.type as string;
    const content = node.content as Record<string, unknown>[] | undefined;

    switch (type) {
      case 'doc':
        return (content ?? []).map((child, i) => (
          <Fragment key={i}>{renderNode(child)}</Fragment>
        ));

      case 'paragraph':
        return (
          <p>{(content ?? []).map((child, i) => <Fragment key={i}>{renderInline(child)}</Fragment>)}</p>
        );

      case 'heading': {
        const level = (node.attrs as Record<string, unknown>)?.level as number;
        const children = (content ?? []).map((child, i) => <Fragment key={i}>{renderInline(child)}</Fragment>);
        if (level === 2) return <h2>{children}</h2>;
        if (level === 3) return <h3>{children}</h3>;
        return <h2>{children}</h2>;
      }

      case 'bulletList':
        return <ul>{(content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child)}</Fragment>)}</ul>;

      case 'orderedList':
        return <ol>{(content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child)}</Fragment>)}</ol>;

      case 'listItem':
        return (
          <li>{(content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child)}</Fragment>)}</li>
        );

      case 'blockquote':
        return (
          <blockquote>{(content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child)}</Fragment>)}</blockquote>
        );

      case 'horizontalRule':
        return <hr />;

        case 'image': {
          const attrs =
            node.attrs as
              | Record<
                  string,
                  unknown
                >
              | undefined;
        
          const src =
            (attrs?.src as string) ??
            '';
        
          const alt =
            (attrs?.alt as string) ??
            '';
        
          const description =
            (attrs?.description as
              | string
              | null
              | undefined) ??
            null;
        
          const credit =
            (attrs?.credit as
              | string
              | null
              | undefined) ??
            null;
        
          return (
            <figure className="my-8">
              <img
                src={src}
                alt={alt}
                className="
                  block
                  h-auto
                  w-full
                  bg-surface-subtle
                  object-cover
                "
              />
        
              {(description ||
                credit) && (
                <figcaption
                  className="
                    mt-2
                    font-headline
                    text-[0.95rem]
                    leading-[1.45]
                    text-muted-foreground
                  "
                >
                  {description && (
                    <span>
                      {description}
                    </span>
                  )}
        
                  {description &&
                    credit && ' '}
        
                  {credit && (
                    <em>
                      (
                      {credit}
                      )
                    </em>
                  )}
                </figcaption>
              )}
            </figure>
          );
        }

      default:
        if (content) {
          return (content ?? []).map((child, i) => <Fragment key={i}>{renderNode(child)}</Fragment>);
        }
        return null;
    }
  }

  function renderInline(node: Record<string, unknown>): React.ReactNode {
    const type = node.type as string;
    const content = node.content as Record<string, unknown>[] | undefined;

    if (type === 'text') {
      const marks = node.marks as Record<string, unknown>[] | undefined;
      let text: React.ReactNode = node.text as string;

      if (marks) {
        for (const mark of marks) {
          const markType = mark.type as string;
          if (markType === 'bold') text = <strong>{text}</strong>;
          if (markType === 'italic') text = <em>{text}</em>;
          if (markType === 'underline') text = <u>{text}</u>;
          if (markType === 'link') {
            const attrs = mark.attrs as Record<string, unknown>;
            text = (
              <a href={attrs?.href as string} target="_blank" rel="noopener noreferrer">
                {text}
              </a>
            );
          }
        }
      }
      return text;
    }

    if (type === 'hardBreak') return <br />;

    if (content) {
      return content.map((child, i) => <Fragment key={i}>{renderInline(child)}</Fragment>);
    }

    return null;
  }
}
