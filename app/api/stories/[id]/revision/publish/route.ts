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
    publishStoryRevision,
  } from '@/lib/services/story-revisions';
  
  interface RouteContext {
    params: {
      id: string;
    };
  }
  
  export async function POST(
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
  
    /**
     * Only already-published stories should use
     * the revision publish flow.
     */
    if (
      story.status !==
      'published'
    ) {
      return NextResponse.json(
        {
          error:
            'This story does not have a published version to update.',
        },
        {
          status: 409,
        }
      );
    }
  
    try {
      await publishStoryRevision(
        params.id,
        user.id
      );
  
      return NextResponse.json({
        success: true,
      });
    } catch (error) {
      console.error(
        'POST publish story revision failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof
            Error
              ? error.message
              : 'Unable to publish revision',
        },
        {
          status: 500,
        }
      );
    }
  }