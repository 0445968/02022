import {
    NextResponse,
  } from 'next/server';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    mayEditStory,
    mayPublishRevision,
  } from '@/lib/permissions/staff-route-gates';
  
  import {
    getStoryForEditing,
  } from '@/lib/services/stories';
  
  import {
    publishStoryRevision,
  } from '@/lib/services/story-revisions';
  
  import {reviewedPublicationEnabled} from '@/lib/services/reviewed-publication';
  interface RouteContext {
    params: Promise<{
      id: string;
    }>;
  }
  
  export async function POST(_request: Request, props: RouteContext) {
    const params = await props.params;
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

    /**
     * The user must still be allowed to edit/view
     * this story in the newsroom.
     */
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

    /**
     * Publishing is stricter than editing.
     *
     * Authors may work on their own unpublished revision,
     * but only editors can make that revision live.
     */
    if (
      !(await mayPublishRevision(
        user,
        params.id
      ))
    ) {
      return NextResponse.json(
        {
          error:
            'You do not have permission to publish story updates.',
        },
        {
          status: 403,
        }
      );
    }

    /**
     * Revision publishing only applies to stories that
     * already have a live published version.
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

    if(reviewedPublicationEnabled())return NextResponse.json({error:'Use the reviewed publication workflow.'},{status:409});
    try {
      await publishStoryRevision(
        params.id,
        user.id
      );
  
      return NextResponse.json(
        {
          success: true,
        }
      );
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