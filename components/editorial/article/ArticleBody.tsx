import { Fragment } from 'react';

interface ArticleBodyProps {
  body: Record<string, unknown>;
}

export function ArticleBody({
  body,
}: ArticleBodyProps) {
  return (
    <div className="article-body text-[1.1rem] font-normal [-webkit-text-stroke:0.1px_currentColor]">
  {renderNode(body)}
</div>
  );

  function renderNode(
    node: Record<string, unknown>
  ): React.ReactNode {
    const type = node.type as string;

    const content = node.content as
      | Record<string, unknown>[]
      | undefined;

    switch (type) {
      case 'doc':
        return (content ?? []).map(
          (child, index) => (
            <Fragment key={index}>
              {renderNode(child)}
            </Fragment>
          )
        );

      case 'paragraph':
        return (
          <p>
            {(content ?? []).map(
              (child, index) => (
                <Fragment key={index}>
                  {renderInline(child)}
                </Fragment>
              )
            )}
          </p>
        );

      case 'heading': {
        const level = (
          node.attrs as Record<
            string,
            unknown
          >
        )?.level as number;

        const children = (
          content ?? []
        ).map(
          (child, index) => (
            <Fragment key={index}>
              {renderInline(child)}
            </Fragment>
          )
        );

        if (level === 2) {
          return <h2>{children}</h2>;
        }

        if (level === 3) {
          return <h3>{children}</h3>;
        }

        return <h2>{children}</h2>;
      }

      case 'bulletList':
        return (
          <ul>
            {(content ?? []).map(
              (child, index) => (
                <Fragment key={index}>
                  {renderNode(child)}
                </Fragment>
              )
            )}
          </ul>
        );

      case 'orderedList':
        return (
          <ol>
            {(content ?? []).map(
              (child, index) => (
                <Fragment key={index}>
                  {renderNode(child)}
                </Fragment>
              )
            )}
          </ol>
        );

      case 'listItem':
        return (
          <li>
            {(content ?? []).map(
              (child, index) => (
                <Fragment key={index}>
                  {renderNode(child)}
                </Fragment>
              )
            )}
          </li>
        );

      case 'blockquote':
        return (
          <blockquote>
            {(content ?? []).map(
              (child, index) => (
                <Fragment key={index}>
                  {renderNode(child)}
                </Fragment>
              )
            )}
          </blockquote>
        );

      case 'horizontalRule':
        return <hr />;

      case 'image': {
        const attrs = node.attrs as
          | Record<string, unknown>
          | undefined;

        const src =
          (attrs?.src as string) ?? '';

        const alt =
          (attrs?.alt as string) ?? '';

        const description =
          (attrs?.description as
            | string
            | null
            | undefined) ?? null;

        const credit =
          (attrs?.credit as
            | string
            | null
            | undefined) ?? null;

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

            {(description || credit) && (
              <figcaption
                className="
                  mt-2
                  font-interface
                  text-xs
                  leading-[1.5]
                  text-muted-foreground
                "
              >
                {description && (
                  <span>
                    {description}
                  </span>
                )}

                {description &&
                  credit &&
                  ' '}

                {credit && (
                  <em>
                    ({credit})
                  </em>
                )}
              </figcaption>
            )}
          </figure>
        );
      }

      default:
        if (content) {
          return content.map(
            (child, index) => (
              <Fragment key={index}>
                {renderNode(child)}
              </Fragment>
            )
          );
        }

        return null;
    }
  }

  function renderInline(
    node: Record<string, unknown>
  ): React.ReactNode {
    const type = node.type as string;

    const content = node.content as
      | Record<string, unknown>[]
      | undefined;

    if (type === 'text') {
      const marks = node.marks as
        | Record<string, unknown>[]
        | undefined;

      let text: React.ReactNode =
        node.text as string;

      if (marks) {
        for (const mark of marks) {
          const markType =
            mark.type as string;

          if (markType === 'bold') {
            text = (
              <strong>
                {text}
              </strong>
            );
          }

          if (markType === 'italic') {
            text = (
              <em>
                {text}
              </em>
            );
          }

          if (
            markType === 'underline'
          ) {
            text = <u>{text}</u>;
          }

          if (markType === 'link') {
            const attrs =
              mark.attrs as Record<
                string,
                unknown
              >;

            text = (
              <a
                href={
                  attrs?.href as string
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                {text}
              </a>
            );
          }
        }
      }

      return text;
    }

    if (type === 'hardBreak') {
      return <br />;
    }

    if (content) {
      return content.map(
        (child, index) => (
          <Fragment key={index}>
            {renderInline(child)}
          </Fragment>
        )
      );
    }

    return null;
  }
}