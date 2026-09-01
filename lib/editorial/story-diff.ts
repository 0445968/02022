export type DiffPartType =
  | 'unchanged'
  | 'added'
  | 'removed';

export interface DiffPart {
  type: DiffPartType;
  value: string;
}

export interface StoryTextSnapshot {
  headline: string;
  subheadline: string;
  summary: string;
  body: string;
}

/**
 * Maximum number of LCS matrix cells we will allocate.
 *
 * The detailed diff remains available for ordinary article
 * edits. Very large changed regions use the safe linear
 * fallback below instead of risking a frozen comparison page.
 */
const MAX_LCS_CELLS =
  500_000;

/* =========================================================
   TOKENIZATION
========================================================= */

function tokenize(
  value: string
): string[] {
  /**
   * Preserve whitespace so rendered comparisons retain
   * natural spacing and paragraph breaks.
   */
  return value
    .split(/(\s+)/)
    .filter(
      (token) =>
        token.length > 0
    );
}

/* =========================================================
   WORD-LEVEL DIFF
========================================================= */

/**
 * Produces a word-level comparison.
 *
 * The unchanged prefix and suffix are removed before building
 * the LCS matrix. This keeps common edits efficient even when
 * the complete article is long.
 *
 * If the remaining changed region would require an excessive
 * matrix, the function returns a safe coarse comparison:
 *
 * unchanged prefix
 * removed previous region
 * added revised region
 * unchanged suffix
 */
export function diffText(
  originalValue: string,
  revisedValue: string
): DiffPart[] {
  if (
    originalValue ===
    revisedValue
  ) {
    return originalValue
      ? [
          {
            type:
              'unchanged',
            value:
              originalValue,
          },
        ]
      : [];
  }

  const original =
    tokenize(
      originalValue
    );

  const revised =
    tokenize(
      revisedValue
    );

  const parts:
    DiffPart[] = [];

  const commonPrefixLength =
    findCommonPrefixLength(
      original,
      revised
    );

  const commonSuffixLength =
    findCommonSuffixLength(
      original,
      revised,
      commonPrefixLength
    );

  const originalMiddleEnd =
    original.length -
    commonSuffixLength;

  const revisedMiddleEnd =
    revised.length -
    commonSuffixLength;

  const originalMiddle =
    original.slice(
      commonPrefixLength,
      originalMiddleEnd
    );

  const revisedMiddle =
    revised.slice(
      commonPrefixLength,
      revisedMiddleEnd
    );

  pushTokens(
    parts,
    'unchanged',
    original.slice(
      0,
      commonPrefixLength
    )
  );

  const requiredCells =
    (
      originalMiddle.length +
      1
    ) *
    (
      revisedMiddle.length +
      1
    );

  if (
    requiredCells <=
    MAX_LCS_CELLS
  ) {
    appendDetailedDiff(
      parts,
      originalMiddle,
      revisedMiddle
    );
  } else {
    appendCoarseDiff(
      parts,
      originalMiddle,
      revisedMiddle
    );
  }

  if (
    commonSuffixLength >
    0
  ) {
    pushTokens(
      parts,
      'unchanged',
      original.slice(
        originalMiddleEnd
      )
    );
  }

  return parts;
}

/* =========================================================
   COMMON PREFIX / SUFFIX
========================================================= */

function findCommonPrefixLength(
  original: string[],
  revised: string[]
): number {
  const limit =
    Math.min(
      original.length,
      revised.length
    );

  let index = 0;

  while (
    index < limit &&
    original[index] ===
      revised[index]
  ) {
    index += 1;
  }

  return index;
}

function findCommonSuffixLength(
  original: string[],
  revised: string[],
  prefixLength: number
): number {
  const availableOriginal =
    original.length -
    prefixLength;

  const availableRevised =
    revised.length -
    prefixLength;

  const limit =
    Math.min(
      availableOriginal,
      availableRevised
    );

  let suffixLength = 0;

  while (
    suffixLength <
      limit &&
    original[
      original.length -
      1 -
      suffixLength
    ] ===
      revised[
        revised.length -
        1 -
        suffixLength
      ]
  ) {
    suffixLength += 1;
  }

  return suffixLength;
}

/* =========================================================
   DETAILED LCS DIFF
========================================================= */

function appendDetailedDiff(
  parts: DiffPart[],
  original: string[],
  revised: string[]
) {
  const originalLength =
    original.length;

  const revisedLength =
    revised.length;

  if (
    originalLength ===
    0
  ) {
    pushTokens(
      parts,
      'added',
      revised
    );

    return;
  }

  if (
    revisedLength ===
    0
  ) {
    pushTokens(
      parts,
      'removed',
      original
    );

    return;
  }

  /**
   * Typed arrays use substantially less memory than nested
   * JavaScript number arrays.
   *
   * The matrix size is already bounded by MAX_LCS_CELLS.
   */
  const table:
    Uint32Array[] =
    Array.from(
      {
        length:
          originalLength +
          1,
      },
      () =>
        new Uint32Array(
          revisedLength +
          1
        )
    );

  for (
    let originalIndex =
      originalLength - 1;
    originalIndex >= 0;
    originalIndex -= 1
  ) {
    const currentRow =
      table[
        originalIndex
      ];

    const nextRow =
      table[
        originalIndex +
        1
      ];

    for (
      let revisedIndex =
        revisedLength - 1;
      revisedIndex >= 0;
      revisedIndex -= 1
    ) {
      if (
        original[
          originalIndex
        ] ===
        revised[
          revisedIndex
        ]
      ) {
        currentRow[
          revisedIndex
        ] =
          nextRow[
            revisedIndex +
            1
          ] + 1;
      } else {
        currentRow[
          revisedIndex
        ] =
          Math.max(
            nextRow[
              revisedIndex
            ],
            currentRow[
              revisedIndex +
              1
            ]
          );
      }
    }
  }

  let originalIndex = 0;
  let revisedIndex = 0;

  while (
    originalIndex <
      originalLength ||
    revisedIndex <
      revisedLength
  ) {
    const originalToken =
      original[
        originalIndex
      ];

    const revisedToken =
      revised[
        revisedIndex
      ];

    if (
      originalIndex <
        originalLength &&
      revisedIndex <
        revisedLength &&
      originalToken ===
        revisedToken
    ) {
      pushDiffPart(
        parts,
        'unchanged',
        originalToken
      );

      originalIndex += 1;
      revisedIndex += 1;

      continue;
    }

    const removeScore =
      originalIndex <
      originalLength
        ? table[
            originalIndex +
              1
          ][
            revisedIndex
          ]
        : -1;

    const addScore =
      revisedIndex <
      revisedLength
        ? table[
            originalIndex
          ][
            revisedIndex +
              1
          ]
        : -1;

    if (
      revisedIndex <
        revisedLength &&
      (
        originalIndex >=
          originalLength ||
        addScore >=
          removeScore
      )
    ) {
      pushDiffPart(
        parts,
        'added',
        revisedToken
      );

      revisedIndex += 1;

      continue;
    }

    if (
      originalIndex <
      originalLength
    ) {
      pushDiffPart(
        parts,
        'removed',
        originalToken
      );

      originalIndex += 1;
    }
  }
}

/* =========================================================
   LARGE-DIFF FALLBACK
========================================================= */

function appendCoarseDiff(
  parts: DiffPart[],
  original: string[],
  revised: string[]
) {
  /**
   * This intentionally avoids trying to find word-level
   * matches inside an exceptionally large changed region.
   *
   * It remains editorially honest: the previous region is
   * shown as removed and the replacement region as added.
   */
  pushTokens(
    parts,
    'removed',
    original
  );

  pushTokens(
    parts,
    'added',
    revised
  );
}

/* =========================================================
   RESULT HELPERS
========================================================= */

function pushTokens(
  parts: DiffPart[],
  type: DiffPartType,
  tokens: string[]
) {
  if (
    tokens.length ===
    0
  ) {
    return;
  }

  pushDiffPart(
    parts,
    type,
    tokens.join('')
  );
}

function pushDiffPart(
  parts: DiffPart[],
  type: DiffPartType,
  value: string
) {
  if (!value) {
    return;
  }

  const previous =
    parts[
      parts.length - 1
    ];

  if (
    previous &&
    previous.type ===
      type
  ) {
    previous.value +=
      value;

    return;
  }

  parts.push({
    type,
    value,
  });
}

/* =========================================================
   TIPTAP JSON → READABLE TEXT
========================================================= */

interface TipTapNode {
  type?: string;

  text?: string;

  content?:
    TipTapNode[];

  attrs?: Record<
    string,
    unknown
  >;
}

/**
 * Converts TipTap JSON into readable text for comparison.
 *
 * Normal article previews continue rendering the complete
 * rich-text document. This conversion is only for Changes
 * views.
 */
export function tipTapToPlainText(
  document:
    | Record<
        string,
        unknown
      >
    | null
    | undefined
): string {
  if (!document) {
    return '';
  }

  const root =
    document as TipTapNode;

  return extractNodeText(
    root
  )
    .replace(
      /\n{3,}/g,
      '\n\n'
    )
    .trim();
}

function extractNodeText(
  node: TipTapNode
): string {
  if (
    node.type ===
      'text'
  ) {
    return (
      node.text ?? ''
    );
  }

  /**
   * Give inline images a readable marker so adding or
   * removing an image remains visible in the comparison.
   */
  if (
    node.type ===
      'image'
  ) {
    const description =
      typeof node.attrs
        ?.description ===
        'string'
        ? node.attrs
            .description
        : '';

    const alt =
      typeof node.attrs
        ?.alt ===
        'string'
        ? node.attrs.alt
        : '';

    const label =
      description ||
      alt ||
      'Image';

    return `[${label}]`;
  }

  const content =
    node.content ?? [];

  const childText =
    content
      .map(
        extractNodeText
      )
      .join('');

  switch (
    node.type
  ) {
    case 'paragraph':
    case 'heading':
    case 'blockquote':
    case 'codeBlock':
      return `${childText}\n\n`;

    case 'listItem':
      return `${childText}\n`;

    case 'bulletList':
    case 'orderedList':
      return `${childText}\n`;

    case 'hardBreak':
      return '\n';

    case 'horizontalRule':
      return '\n—\n';

    default:
      return childText;
  }
}

/* =========================================================
   STORY SNAPSHOT
========================================================= */

export function createStoryTextSnapshot(
  story: {
    headline:
      string;

    subheadline:
      | string
      | null;

    summary:
      | string
      | null;

    body: Record<
      string,
      unknown
    >;
  }
): StoryTextSnapshot {
  return {
    headline:
      story.headline,

    subheadline:
      story.subheadline ??
      '',

    summary:
      story.summary ??
      '',

    body:
      tipTapToPlainText(
        story.body
      ),
  };
}

/* =========================================================
   CHANGE DETECTION
========================================================= */

export function hasTextChanges(
  published:
    StoryTextSnapshot,
  revision:
    StoryTextSnapshot
): boolean {
  return (
    published.headline !==
      revision.headline ||
    published.subheadline !==
      revision.subheadline ||
    published.summary !==
      revision.summary ||
    published.body !==
      revision.body
  );
}