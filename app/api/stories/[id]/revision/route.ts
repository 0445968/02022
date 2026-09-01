import {
    NextResponse,
  } from 'next/server';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    canEditStory,
  } from '@/lib/permissions/stories';
  
  import {
    getStoryForEditing,
  } from '@/lib/services/stories';
  
  import {
    discardStoryRevision,
    getStoryRevision,
    saveStoryRevision,
  } from '@/lib/services/story-revisions';
  
  import type {
    AccessLevel,
    IslandScope,
    StoryLanguage,
    StoryStatus,
  } from '@/lib/db/database.types';
  
  interface RouteContext {
    params: {
      id: string;
    };
  }
  
  interface RevisionRequestBody {
    headline?: string;
  
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
      StoryLanguage;
  
    status?:
      StoryStatus;
  
    accessLevel?:
      AccessLevel;
  
    authorId?:
      | string
      | null;
  
    editorId?:
      | string
      | null;
  
    primaryCategoryId?:
      | string
      | null;
  
    categoryIds?:
      string[];
  
    tagIds?:
      string[];
  
    island?:
      IslandScope;
  
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
  
    slug?: string;
  
    originallyPublishedAt?:
      | string
      | null;
  
    scheduledAt?:
      | string
      | null;
  }
  
  /**
   * Loads the active unpublished revision.
   *
   * The published story itself remains unchanged.
   */
  export async function GET(
    _request: Request,
    {
      params,
    }: RouteContext
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
  
    try {
      const revision =
        await getStoryRevision(
          params.id
        );
  
      return NextResponse.json({
        revision,
      });
    } catch (error) {
      console.error(
        'GET story revision failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Unable to load revision',
        },
        {
          status: 500,
        }
      );
    }
  }
  
  /**
   * Creates or updates the unpublished revision.
   *
   * IMPORTANT:
   * This route does not modify the published
   * public.stories row.
   */
  export async function PUT(
    request: Request,
    {
      params,
    }: RouteContext
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
  
    /**
     * Revisions are specifically for stories
     * that already have a published version.
     */
    if (
      story.status !==
      'published'
    ) {
      return NextResponse.json(
        {
          error:
            'Only published stories use unpublished revisions.',
        },
        {
          status: 409,
        }
      );
    }
  
    let body:
      RevisionRequestBody;
  
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
  
    // --------------------------------------------------
    // Required editor fields
    // --------------------------------------------------
  
    const headline =
      body.headline ??
      story.headline;
  
    const revisionBody =
      body.body ??
      story.body;
  
    const language =
      body.language ??
      story.language;
  
    const accessLevel =
      body.accessLevel ??
      story.accessLevel;
  
    const island =
      body.island ??
      story.island;
  
    const slug =
      body.slug ??
      story.slug;
  
    // --------------------------------------------------
    // Date validation
    // --------------------------------------------------
  
    if (
      body.originallyPublishedAt
    ) {
      const originalDate =
        new Date(
          body.originallyPublishedAt
        );
  
      if (
        Number.isNaN(
          originalDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid original publication date.',
          },
          {
            status: 400,
          }
        );
      }
  
      if (
        originalDate.getTime() >
        Date.now()
      ) {
        return NextResponse.json(
          {
            error:
              'Originally published date cannot be in the future.',
          },
          {
            status: 400,
          }
        );
      }
    }
  
    if (
      body.scheduledAt
    ) {
      const scheduledDate =
        new Date(
          body.scheduledAt
        );
  
      if (
        Number.isNaN(
          scheduledDate.getTime()
        )
      ) {
        return NextResponse.json(
          {
            error:
              'Invalid scheduled publication date.',
          },
          {
            status: 400,
          }
        );
      }
  
      /**
       * Allow a small grace period because an autosave
       * can reach the server a few seconds after the user
       * chose the current minute.
       */
      const gracePeriodMs =
        60_000;
  
      if (
        scheduledDate.getTime() <
        Date.now() -
          gracePeriodMs
      ) {
        return NextResponse.json(
          {
            error:
              'Scheduled publication date cannot be in the past.',
          },
          {
            status: 400,
          }
        );
      }
    }
  
    try {
      const revision =
        await saveStoryRevision(
          params.id,
          {
            headline,
  
            subheadline:
              body.subheadline !==
              undefined
                ? body.subheadline
                : story.subheadline,
  
            summary:
              body.summary !==
              undefined
                ? body.summary
                : story.summary,
  
            body:
              revisionBody,
  
            language,
  
            /**
             * This is an unpublished working revision,
             * regardless of the live story status.
             */
            status:
              'draft',
  
            accessLevel,
  
            authorId:
              body.authorId !==
              undefined
                ? body.authorId
                : story.author?.id ??
                  null,
  
            editorId:
              body.editorId !==
              undefined
                ? body.editorId
                : story.editor?.id ??
                  null,
  
            primaryCategoryId:
              body.primaryCategoryId !==
              undefined
                ? body.primaryCategoryId
                : story.primaryCategory
                    ?.id ??
                  null,
  
            categoryIds:
              body.categoryIds ??
              story.categories.map(
                (
                  category
                ) =>
                  category.id
              ),
  
            tagIds:
              body.tagIds ??
              story.tags.map(
                (tag) =>
                  tag.id
              ),
  
            island,
  
            featuredImageId:
              body.featuredImageId !==
              undefined
                ? body.featuredImageId
                : story.featuredImage
                    ?.id ??
                  null,
  
            imageCaption:
              body.imageCaption !==
              undefined
                ? body.imageCaption
                : story.imageCaption,
  
            imageCredit:
              body.imageCredit !==
              undefined
                ? body.imageCredit
                : story.imageCredit,
  
            seoTitle:
              body.seoTitle !==
              undefined
                ? body.seoTitle
                : story.seoTitle,
  
            seoDescription:
              body.seoDescription !==
              undefined
                ? body.seoDescription
                : story.seoDescription,
  
            slug,
  
            originallyPublishedAt:
              body.originallyPublishedAt !==
              undefined
                ? body.originallyPublishedAt
                : story.originallyPublishedAt,
  
            scheduledAt:
              body.scheduledAt !==
              undefined
                ? body.scheduledAt
                : story.scheduledAt,
  
            userId:
              user.id,
          }
        );
  
      return NextResponse.json({
        success: true,
        revision,
      });
    } catch (error) {
      console.error(
        'PUT story revision failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Unable to save revision',
        },
        {
          status: 500,
        }
      );
    }
  }
  
  /**
   * Revert unpublished changes.
   *
   * This deletes the working revision and leaves
   * the live published article completely untouched.
   */
  export async function DELETE(
    _request: Request,
    {
      params,
    }: RouteContext
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
  
    try {
      await discardStoryRevision(
        params.id
      );
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error(
        'DELETE story revision failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Unable to discard revision',
        },
        {
          status: 500,
        }
      );
    }
  }