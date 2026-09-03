import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import {
  getHomepageSlots,
  normalizeHomepageLayoutSelections,
  publishHomepageLayout,
} from '@/lib/services/front-page';

export async function POST(request: Request) {
  const user = await getCurrentUser();

  if (!user?.profile?.isEditor) {
    return NextResponse.json(
      { error: 'Editor access required.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { selections?: unknown };
    const selections = normalizeHomepageLayoutSelections(body.selections);

    await publishHomepageLayout(selections, user.id);

    return NextResponse.json({ placements: await getHomepageSlots() });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to publish the homepage layout.',
      },
      { status: 400 }
    );
  }
}
