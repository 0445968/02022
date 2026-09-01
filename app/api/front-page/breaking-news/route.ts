import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

import {
  createBreakingNews,
} from '@/lib/services/front-page';

interface CreateBreakingNewsBody {
  headline?: string;

  storyId?: string | null;
  externalUrl?: string | null;

  active?: boolean;
  position?: number;

  startsAt?: string | null;
  endsAt?: string | null;
}

export async function POST(
  request: Request
) {
  const user =
    await getCurrentUser();

  if (
    !user ||
    !user.profile?.isEditor
  ) {
    return NextResponse.json(
      {
        error:
          'Editor access required.',
      },
      {
        status: 403,
      }
    );
  }

  let body: CreateBreakingNewsBody;

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid JSON.',
      },
      {
        status: 400,
      }
    );
  }

  const headline =
    body.headline?.trim();

  if (!headline) {
    return NextResponse.json(
      {
        error:
          'Headline is required.',
      },
      {
        status: 400,
      }
    );
  }

  if (
    headline.length > 240
  ) {
    return NextResponse.json(
      {
        error:
          'Headline is too long.',
      },
      {
        status: 400,
      }
    );
  }

  const storyId =
    body.storyId?.trim() ||
    null;

  const externalUrl =
    body.externalUrl?.trim() ||
    null;

  if (
    externalUrl
  ) {
    try {
      const url =
        new URL(externalUrl);

      if (
        url.protocol !==
          'http:' &&
        url.protocol !==
          'https:'
      ) {
        throw new Error();
      }
    } catch {
      return NextResponse.json(
        {
          error:
            'External URL must be a valid http or https URL.',
        },
        {
          status: 400,
        }
      );
    }
  }

  if (
    body.position !==
      undefined &&
    (!Number.isInteger(
      body.position
    ) ||
      body.position < 0)
  ) {
    return NextResponse.json(
      {
        error:
          'Position must be a non-negative integer.',
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.startsAt &&
    Number.isNaN(
      new Date(
        body.startsAt
      ).getTime()
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid start date.',
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.endsAt &&
    Number.isNaN(
      new Date(
        body.endsAt
      ).getTime()
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid end date.',
      },
      {
        status: 400,
      }
    );
  }

  if (
    body.startsAt &&
    body.endsAt
  ) {
    const start =
      new Date(
        body.startsAt
      ).getTime();

    const end =
      new Date(
        body.endsAt
      ).getTime();

    if (
      end <= start
    ) {
      return NextResponse.json(
        {
          error:
            'End date must be after start date.',
        },
        {
          status: 400,
        }
      );
    }
  }

  try {
    const item =
      await createBreakingNews(
        {
          headline,

          storyId,

          externalUrl,

          active:
            body.active ??
            true,

          position:
            body.position ??
            0,

          startsAt:
            body.startsAt ??
            null,

          endsAt:
            body.endsAt ??
            null,

          userId:
            user.id,
        }
      );

    return NextResponse.json(
      {
        item,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      'Breaking-news creation failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to create breaking-news alert.',
      },
      {
        status: 500,
      }
    );
  }
}