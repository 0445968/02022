import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';

import {
  replaceHomepageSlot,
} from '@/lib/services/front-page';

import type {
  HomepageSlotType,
} from '@/lib/db/database.types';

const VALID_SLOTS: HomepageSlotType[] = [
  'lead',
  'top_left',
  'top_right',
  'secondary',
  'editors_pick',
  'latest_feature',
  'section_feature',
  'video_feature',
];

interface CreatePlacementBody {
  slot?: HomepageSlotType;
  storyId?: string;

  position?: number;

  categoryId?: string | null;

  startsAt?: string | null;
  endsAt?: string | null;

  active?: boolean;

  userId?: string | null;
}

export async function POST(
  request: Request
) {
  const user =
    await getCurrentUser();

  /*
   * During DEV_AUTH_BYPASS this returns the mock
   * editor user, so the route remains usable while
   * testing without signing in.
   *
   * In production, a real authenticated editor is
   * required.
   */
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

  let body: CreatePlacementBody;

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
    !body.slot ||
    !VALID_SLOTS.includes(
      body.slot
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Invalid homepage slot.',
      },
      {
        status: 400,
      }
    );
  }

  const storyId =
    body.storyId?.trim();

  if (!storyId) {
    return NextResponse.json(
      {
        error:
          'A story is required.',
      },
      {
        status: 400,
      }
    );
  }

  const position =
    Number.isInteger(
      body.position
    ) &&
    Number(body.position) >= 0
      ? Number(
          body.position
        )
      : 0;

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
    const startsAt =
      new Date(
        body.startsAt
      ).getTime();

    const endsAt =
      new Date(
        body.endsAt
      ).getTime();

    if (
      endsAt <=
      startsAt
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
    const placement =
      await replaceHomepageSlot(
        {
          slot:
            body.slot,

          storyId,

          position,

          categoryId:
            body.categoryId ??
            null,

          startsAt:
            body.startsAt ??
            null,

          endsAt:
            body.endsAt ??
            null,

          active:
            body.active ??
            true,

          /*
           * Do not trust a user ID sent from the browser.
           * Always use the server-resolved editorial user.
           */
          userId:
            user.id,
        }
      );

    return NextResponse.json(
      {
        placement,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error(
      'Front-page placement creation failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Unable to save homepage placement.',
      },
      {
        status: 500,
      }
    );
  }
}