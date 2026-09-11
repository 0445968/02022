import type {
  ReactNode,
} from 'react';

interface SearchHighlightProps {
  text:
  | string
  | null
  | undefined;

  query: string;

  highlightClassName?: string;
}

function escapeRegExp(
  value: string
) {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&'
  );
}

function normalizeForMatch(
  value: string
) {
  return value
    .normalize('NFD')
    .replace(
      /[\u0300-\u036f]/g,
      ''
    )
    .toLowerCase();
}

export function SearchHighlight({
  text,
  query,
  highlightClassName = 'bg-highlight/45 text-inherit',
}: SearchHighlightProps) {
  if (!text) {
    return null;
  }

  const trimmedQuery =
    query.trim();

  if (!trimmedQuery) {
    return <>{text}</>;
  }

  const queryWords =
    trimmedQuery
      .split(/\s+/)
      .map((word) =>
        word.trim()
      )
      .filter(
        (word) =>
          word.length >= 2
      );

  if (
    queryWords.length === 0
  ) {
    return <>{text}</>;
  }

  const normalizedText =
    normalizeForMatch(
      text
    );

  const normalizedWords =
    queryWords.map(
      (word) =>
        normalizeForMatch(
          word
        )
    );

  const ranges: Array<{
    start: number;
    end: number;
  }> = [];

  for (
    const word of
    normalizedWords
  ) {
    if (!word) {
      continue;
    }

    let startIndex = 0;

    while (
      startIndex <
      normalizedText.length
    ) {
      const index =
        normalizedText.indexOf(
          word,
          startIndex
        );

      if (
        index === -1
      ) {
        break;
      }

      ranges.push({
        start: index,
        end:
          index +
          word.length,
      });

      startIndex =
        index +
        word.length;
    }
  }

  if (
    ranges.length === 0
  ) {
    return <>{text}</>;
  }

  ranges.sort(
    (a, b) =>
      a.start -
      b.start
  );

  const mergedRanges: Array<{
    start: number;
    end: number;
  }> = [];

  for (
    const range of ranges
  ) {
    const last =
      mergedRanges[
      mergedRanges.length -
      1
      ];

    if (
      !last ||
      range.start >
      last.end
    ) {
      mergedRanges.push({
        ...range,
      });

      continue;
    }

    last.end =
      Math.max(
        last.end,
        range.end
      );
  }

  const parts: ReactNode[] =
    [];

  let cursor = 0;

  mergedRanges.forEach(
    (
      range,
      index
    ) => {
      if (
        range.start >
        cursor
      ) {
        parts.push(
          text.slice(
            cursor,
            range.start
          )
        );
      }

      parts.push(
        <mark
          key={`highlight-${index}`}
          className={`
            rounded-sm
            px-[0.08em]
            ${highlightClassName}
          `}
        >
          {text.slice(
            range.start,
            range.end
          )}
        </mark>
      );

      cursor =
        range.end;
    }
  );

  if (
    cursor <
    text.length
  ) {
    parts.push(
      text.slice(
        cursor
      )
    );
  }

  return <>{parts}</>;
}