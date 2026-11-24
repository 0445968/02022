import { NextResponse } from 'next/server';
import {reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';

import {
  getCurrentUser,
} from '@/lib/auth/session';

import {
  mayEditStory,
  mayChangeStoryStatus,
  mayEditStoryControlFields,
  mayWriteLiveStory,
} from '@/lib/permissions/staff-route-gates';

import {
  getStoryForEditing,
  syncStoryCategories,
  syncStoryTags,
  updateStory,
} from '@/lib/services/stories';

import {
  findOrCreateTag,
} from '@/lib/services/taxonomy';

import type {
  StoryStatus,
} from '@/lib/db/database.types';

export async function PUT(
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

  const story =
    await getStoryForEditing(
      params.id
    );

  if (!story) {
    return NextResponse.json(
      {
        error:
          'Not found',
      },
      {
        status: 404,
      }
    );
  }

  if (
    !(await mayEditStory(
      user,
      params.id,
      story.author?.id ??
        null
    ))
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

  let body: {
    headline?: string;

    shortTitle?:
      | string
      | null;

    subheadline?:
      | string
      | null;

    summary?:
      | string
      | null;

    body?: Record<
      string,
      unknown
    >;

    language?:
      | 'en'
      | 'es';

    status?: StoryStatus;

    accessLevel?:
      | 'public'
      | 'registered'
      | 'subscriber'
      | 'premium';

    authorId?:
      | string
      | null;

    editorId?:
      | string
      | null;

    primaryCategoryId?:
      | string
      | null;

    island?:
      | 'san_andres'
      | 'old_providence'
      | 'saint_catalina'
      | 'archipelago'
      | 'none';

    featuredImageId?:
      | string
      | null;

    imageCaption?:
      | string
      | null;

    imageCredit?:
      | string
      | null;

    seoTitle?:
      | string
      | null;

    seoDescription?:
      | string
      | null;

    originallyPublishedAt?:
      | string
      | null;

    scheduledAt?:
      | string
      | null;

    slug?: string;

    categoryIds?: string[];

    tagIds?: string[];

    newTags?: string[];

    createVersion?: boolean;

    /**
     * Workflow-only requests may change status without
     * applying editor content to the live story.
     *
     * Used for actions such as archiving a published
     * story that currently has an unpublished revision.
     */
    workflowOnly?: boolean;
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

  if(reviewedPublicationEnabled()&&(body.status==='published'||body.status==='scheduled'||(story.status==='published'&&!(body.workflowOnly===true&&body.status==='archived')))){
    return NextResponse.json({error:'Use the reviewed publication workflow.'},{status:409});
  }

  // CT-02d: a contributor who may edit assigned copy may NOT reassign a
  // story, schedule/publish it or alter sensitive metadata.
  if (!(await mayEditStoryControlFields(user, params.id, body))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // A published story has a separate draft-revision workflow. With v2
  // enabled, only a publishing editor may directly change the live row.
  if (
    story.status === 'published' &&
    body.workflowOnly !== true &&
    !(await mayWriteLiveStory(user, params.id))
  ) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // ==================================================
  // Permission check: status changes
  // ==================================================

  if (
    body.status &&
    body.status !==
      story.status
  ) {
    if (
      !(await mayChangeStoryStatus(
        user,
        params.id,
        body.status
      ))
    ) {
      return NextResponse.json(
        {
          error:
            'Cannot change to this status',
        },
        {
          status: 403,
        }
      );
    }
  }

  // ==================================================
  // Workflow-only status change
  // ==================================================

  if (
    body.workflowOnly ===
    true
  ) {
    if (!body.status) {
      return NextResponse.json(
        {
          error:
            'A status is required for a workflow-only update.',
        },
        {
          status: 400,
        }
      );
    }

    try {
      await updateStory(
        params.id,
        {
          status:
            body.status,

          updatedBy:
            user.id,

          createVersion:
            false,
        }
      );
    } catch (error) {
      console.error(
        'Workflow-only story update failed:',
        error
      );

      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Failed to update story workflow',
        },
        {
          status: 500,
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
      }
    );
  }

  // ==================================================
  // Handle new tags
  // ==================================================

  const allTagIds = [
    ...(
      body.tagIds ??
      []
    ),
  ];

  if (
    body.newTags &&
    body.newTags.length >
      0
  ) {
    for (
      const tagName of
      body.newTags
    ) {
      const tag =
        await findOrCreateTag(
          tagName
        );

      if (
        tag &&
        !allTagIds.includes(
          tag.id
        )
      ) {
        allTagIds.push(
          tag.id
        );
      }
    }
  }

  // ==================================================
  // Standard story update
  // ==================================================

  try {
    await updateStory(
      params.id,
      {
        headline:
          body.headline,

        shortTitle:
          body.shortTitle,

        subheadline:
          body.subheadline,

        summary:
          body.summary,

        body:
          body.body,

        language:
          body.language,

        status:
          body.status,

        accessLevel:
          body.accessLevel,

        authorId:
          body.authorId,

        editorId:
          body.editorId,

        primaryCategoryId:
          body.primaryCategoryId,

        island:
          body.island,

        featuredImageId:
          body.featuredImageId,

        imageCaption:
          body.imageCaption,

        imageCredit:
          body.imageCredit,

        seoTitle:
          body.seoTitle,

        seoDescription:
          body.seoDescription,

        originallyPublishedAt:
          body.originallyPublishedAt,

        scheduledAt:
          body.scheduledAt,

        slug:
          body.slug,

        updatedBy:
          user.id,

        createVersion:
          body.createVersion ??
          false,
      }
    );
  } catch (error) {
    console.error(
      'PUT story failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof
          Error
            ? error.message
            : 'Failed to update story',
      },
      {
        status: 500,
      }
    );
  }

  // ==================================================
  // Sync categories
  // ==================================================

  if (
    body.categoryIds !==
    undefined
  ) {
    await syncStoryCategories(
      params.id,
      body.categoryIds,
      body.primaryCategoryId ??
        null
    );
  }

  // ==================================================
  // Sync tags
  // ==================================================

  if (
    body.tagIds !==
      undefined ||
    body.newTags !==
      undefined
  ) {
    await syncStoryTags(
      params.id,
      allTagIds
    );
  }

  return NextResponse.json(
    {
      success: true,
    }
  );
}