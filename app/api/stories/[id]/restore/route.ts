import {
  NextResponse,
} from 'next/server';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  getDataClient,
} from '@/lib/db/supabase-data-access';

import {
  canEditStory,
} from '@/lib/permissions/stories';

import {
  getStoryForEditing,
  restoreStoryVersion,
} from '@/lib/services/stories';

import {
  restoreVersionToRevision,
} from '@/lib/services/story-revisions';

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: {
      id: string;
    };
  }
) {
  const user =
    await getCurrentUser();

  if (!user) {
    return NextResponse.json(
      {
        error:
          'Unauthorized',
      },
      {
        status: 401,
      }
    );
  }

  // ==================================================
  // Load story
  // ==================================================

  const story =
    await getStoryForEditing(
      params.id
    );

  if (!story) {
    return NextResponse.json(
      {
        error:
          'Story not found',
      },
      {
        status: 404,
      }
    );
  }

  /**
   * Version restoration remains editor-only.
   *
   * canEditStory is kept here as an additional
   * story-level permission check.
   */
  if (
    !user.profile
      ?.isEditor ||
    !canEditStory(
      user,
      story.author?.id ??
        null
    )
  ) {
    return NextResponse.json(
      {
        error:
          'Forbidden',
      },
      {
        status: 403,
      }
    );
  }

  // ==================================================
  // Parse request
  // ==================================================

  let body: {
    versionId?: string;
  };

  try {
    body =
      await request.json();
  } catch {
    return NextResponse.json(
      {
        error:
          'Invalid JSON',
      },
      {
        status: 400,
      }
    );
  }

  if (!body.versionId) {
    return NextResponse.json(
      {
        error:
          'versionId required',
      },
      {
        status: 400,
      }
    );
  }

  // ==================================================
  // Verify version belongs to this story
  // ==================================================
  //
  // This prevents somebody from sending a valid version
  // ID belonging to a different article.
  // ==================================================

  const supabase =
    await getDataClient();

  const {
    data:
      version,
    error:
      versionError,
  } = await supabase
    .from(
      'story_versions'
    )
    .select(
      'id, story_id'
    )
    .eq(
      'id',
      body.versionId
    )
    .maybeSingle();

  if (versionError) {
    console.error(
      'Unable to verify story version:',
      versionError
    );

    return NextResponse.json(
      {
        error:
          'Unable to verify story version',
      },
      {
        status: 500,
      }
    );
  }

  if (!version) {
    return NextResponse.json(
      {
        error:
          'Version not found',
      },
      {
        status: 404,
      }
    );
  }

  if (
    version.story_id !==
    params.id
  ) {
    return NextResponse.json(
      {
        error:
          'This version does not belong to this story.',
      },
      {
        status: 409,
      }
    );
  }

  // ==================================================
  // Published story
  // ==================================================
  //
  // Never modify the live article directly.
  //
  // Restore the historical version into
  // story_revisions instead.
  // ==================================================

  if (
    story.status ===
    'published'
  ) {
    try {
      const revision =
        await restoreVersionToRevision(
          params.id,
          body.versionId,
          user.id
        );

      return NextResponse.json(
        {
          success: true,

          restoredToRevision:
            true,

          revisionId:
            revision.id,
        }
      );
    } catch (error) {
      console.error(
        'Unable to restore published story version to revision:',
        error
      );

      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Failed to restore version',
        },
        {
          status: 500,
        }
      );
    }
  }

  // ==================================================
  // Unpublished story
  // ==================================================
  //
  // Draft/review stories have no public version that
  // needs protection, so the existing direct restoration
  // behavior is still appropriate.
  // ==================================================

  try {
    const success =
      await restoreStoryVersion(
        body.versionId,
        user.id
      );

    if (!success) {
      return NextResponse.json(
        {
          error:
            'Failed to restore version',
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,

        restoredToRevision:
          false,
      }
    );
  } catch (error) {
    console.error(
      'Unable to restore story version:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Failed to restore version',
      },
      {
        status: 500,
      }
    );
  }
}