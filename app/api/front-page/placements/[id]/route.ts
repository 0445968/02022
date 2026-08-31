import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

import {
  removeHomepagePlacement,
  updateHomepagePlacement,
} from '@/lib/services/front-page';

interface RouteContext {
  params: {
    id: string;
  };
}

interface UpdatePlacementBody {
  position?: number;

  categoryId?: string | null;

  startsAt?: string | null;
  endsAt?: string | null;

  active?: boolean;
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
          'Placement ID is required.',
      },
      {
        status: 400,
      }
    );
  }

  let body: UpdatePlacementBody;

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

    if (end <= start) {
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
    const placement =
      await updateHomepagePlacement(
        id,
        {
          position:
            body.position,

          categoryId:
            body.categoryId,

          startsAt:
            body.startsAt,

          endsAt:
            body.endsAt,

          active:
            body.active,

          userId:
            user.id,
        }
      );

    return NextResponse.json(
      {
        placement,
      }
    );
  } catch (error) {
    console.error(
      'Front-page placement update failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to update homepage placement.',
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
          'Placement ID is required.',
      },
      {
        status: 400,
      }
    );
  }

  try {
    await removeHomepagePlacement(
      id
    );

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      'Front-page placement removal failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to remove homepage placement.',
      },
      {
        status: 500,
      }
    );
  }
}