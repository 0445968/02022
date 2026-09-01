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

/* =========================================================
   TOKENIZATION
========================================================= */

function tokenize(
  value: string
): string[] {
  /**
   * Preserve whitespace as tokens so the rendered
   * comparison still reads naturally.
   *
   * Example:
   *
   * "Hello new world"
   *
   * becomes roughly:
   *
   * ["Hello", " ", "new", " ", "world"]
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
 * Calculates a word-level diff using a longest common
 * subsequence table.
 *
 * This is intentionally dependency-free because newsroom
 * stories are small enough that we do not need a dedicated
 * diff package here.
 */
export function diffText(
  originalValue: string,
  revisedValue: string
): DiffPart[] {
  const original =
    tokenize(
      originalValue
    );

  const revised =
    tokenize(
      revisedValue
    );

  const originalLength =
    original.length;

  const revisedLength =
    revised.length;

  const table:
    number[][] =
    Array.from(
      {
        length:
          originalLength +
          1,
      },
      () =>
        Array(
          revisedLength +
            1
        ).fill(0)
    );

  // -------------------------------------------------------
  // Build LCS table
  // -------------------------------------------------------

  for (
    let originalIndex =
      originalLength - 1;
    originalIndex >= 0;
    originalIndex -= 1
  ) {
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
        table[
          originalIndex
        ][revisedIndex] =
          table[
            originalIndex +
              1
          ][
            revisedIndex +
              1
          ] + 1;
      } else {
        table[
          originalIndex
        ][revisedIndex] =
          Math.max(
            table[
              originalIndex +
                1
            ][
              revisedIndex
            ],

            table[
              originalIndex
            ][
              revisedIndex +
                1
            ]
          );
      }
    }
  }

  // -------------------------------------------------------
  // Walk table and build result
  // -------------------------------------------------------

  const parts:
    DiffPart[] = [];

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
          ] ?? 0
        : -1;

    const addScore =
      revisedIndex <
      revisedLength
        ? table[
            originalIndex
          ]?.[
            revisedIndex +
              1
          ] ?? 0
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

  return parts;
}

/* =========================================================
   MERGE ADJACENT PARTS
========================================================= */

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
 * Converts the TipTap body JSON into readable text for
 * comparison.
 *
 * The normal article preview continues rendering the actual
 * rich content. This conversion is only for the Changes view.
 */
export function tipTapToPlainText(
  document:
    Record<
      string,
      unknown
    > | null
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
   * Give image nodes a readable marker so adding/removing an
   * inline image still appears in the comparison.
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
      string | null;

    summary:
      string | null;

    body:
      Record<
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