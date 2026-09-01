import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

import {
  deleteBreakingNews,
  updateBreakingNews,
} from '@/lib/services/front-page';

interface RouteContext {
  params: {
    id: string;
  };
}

interface UpdateBreakingNewsBody {
  headline?: string;

  storyId?: string | null;
  externalUrl?: string | null;

  active?: boolean;
  position?: number;

  startsAt?: string | null;
  endsAt?: string | null;
}

export async function PATCH(
  request: Request,
  context: RouteContext
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

  const id =
    context.params.id?.trim();

  if (!id) {
    return NextResponse.json(
      {
        error:
          'Breaking-news ID is required.',
      },
      {
        status: 400,
      }
    );
  }

  let body: UpdateBreakingNewsBody;

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

  const update: UpdateBreakingNewsBody = {};

  if (
    body.headline !==
    undefined
  ) {
    const headline =
      body.headline.trim();

    if (!headline) {
      return NextResponse.json(
        {
          error:
            'Headline cannot be empty.',
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

    update.headline =
      headline;
  }

  if (
    body.storyId !==
    undefined
  ) {
    update.storyId =
      body.storyId?.trim() ||
      null;
  }

  if (
    body.externalUrl !==
    undefined
  ) {
    const externalUrl =
      body.externalUrl?.trim() ||
      null;

    if (externalUrl) {
      try {
        const url =
          new URL(
            externalUrl
          );

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

    update.externalUrl =
      externalUrl;
  }

  if (
    body.active !==
    undefined
  ) {
    update.active =
      body.active;
  }

  if (
    body.position !==
    undefined
  ) {
    if (
      !Number.isInteger(
        body.position
      ) ||
      body.position < 0
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

    update.position =
      body.position;
  }

  if (
    body.startsAt !==
    undefined
  ) {
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

    update.startsAt =
      body.startsAt ??
      null;
  }

  if (
    body.endsAt !==
    undefined
  ) {
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

    update.endsAt =
      body.endsAt ??
      null;
  }

  const startsAt =
    update.startsAt ??
    body.startsAt;

  const endsAt =
    update.endsAt ??
    body.endsAt;

  if (
    startsAt &&
    endsAt
  ) {
    const start =
      new Date(
        startsAt
      ).getTime();

    const end =
      new Date(
        endsAt
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
      await updateBreakingNews(
        id,
        {
          ...update,
          userId:
            user.id,
        }
      );

    return NextResponse.json({
      item,
    });
  } catch (error) {
    console.error(
      'Breaking-news update failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to update breaking-news alert.',
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: RouteContext
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

  const id =
    context.params.id?.trim();

  if (!id) {
    return NextResponse.json(
      {
        error:
          'Breaking-news ID is required.',
      },
      {
        status: 400,
      }
    );
  }

  try {
    await deleteBreakingNews(
      id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'Breaking-news deletion failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to delete breaking-news alert.',
      },
      {
        status: 500,
      }
    );
  }
}