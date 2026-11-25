import {homepageHistoryEnabled} from '@/lib/services/homepage-history';
import { NextResponse } from 'next/server';

import { getCurrentUser } from '@/lib/auth/session';
import { mayCreateStory, mayAssignStoryAuthor, mayRestoreStoryVersion, mayEditHomepage, mayPublishHomepage, mayManageBreakingNews, mayManageByline, mayCreateTag } from '@/lib/permissions/editorial-route-gates';
import {
  normalizeHomepageLayoutSelections,
  saveHomepageLayoutDraft,
} from '@/lib/services/front-page';

export async function POST(request: Request) {
  if(homepageHistoryEnabled())return NextResponse.json({error:'Use the versioned layout endpoint.'},{status:409});
  const user = await getCurrentUser();

  if (!user || !(await mayEditHomepage(user))) {
    return NextResponse.json(
      { error: 'Editor access required.' },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as { selections?: unknown };
    const selections = normalizeHomepageLayoutSelections(body.selections);
    const draft = await saveHomepageLayoutDraft(selections, user.id);

    return NextResponse.json({ draft });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Unable to save the homepage layout draft.',
      },
      { status: 400 }
    );
  }
}
