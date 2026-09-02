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
    addStoryBookmark,
    isStoryBookmarked,
    removeStoryBookmark,
  } from '@/lib/services/bookmarks';
  
  interface RouteContext {
    params: {
      storyId: string;
    };
  }
  
  async function publishedStoryExists(
    storyId: string
  ): Promise<boolean> {
    const supabase =
      await getDataClient();
  
    const {
      data,
      error,
    } = await supabase
      .from('stories')
      .select('id')
      .eq('id', storyId)
      .eq('status', 'published')
      .maybeSingle();
  
    if (error) {
      throw new Error(
        `Unable to verify story: ${error.message}`
      );
    }
  
    return Boolean(data);
  }
  
  /**
   * Returns whether the current reader has saved
   * the requested story.
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
  
    try {
      const bookmarked =
        await isStoryBookmarked(
          user.id,
          params.storyId
        );
  
      return NextResponse.json(
        {
          bookmarked,
        },
        {
          headers: {
            'Cache-Control':
              'private, no-store',
          },
        }
      );
    } catch (error) {
      console.error(
        'GET story bookmark failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Unable to check bookmark',
        },
        {
          status: 500,
        }
      );
    }
  }
  
  /**
   * Saves a published story for the current reader.
   *
   * user_id always comes from the authenticated session
   * and is never accepted from the request.
   */
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
  
    try {
      const storyExists =
        await publishedStoryExists(
          params.storyId
        );
  
      if (!storyExists) {
        return NextResponse.json(
          {
            error:
              'Published story not found',
          },
          {
            status: 404,
          }
        );
      }
  
      await addStoryBookmark(
        user.id,
        params.storyId
      );
  
      return NextResponse.json(
        {
          success: true,
          bookmarked: true,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      console.error(
        'POST story bookmark failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Unable to save bookmark',
        },
        {
          status: 500,
        }
      );
    }
  }
  
  /**
   * Removes the current reader's bookmark.
   *
   * The underlying story is never modified or deleted.
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
  
    try {
      await removeStoryBookmark(
        user.id,
        params.storyId
      );
  
      return NextResponse.json({
        success: true,
        bookmarked: false,
      });
    } catch (error) {
      console.error(
        'DELETE story bookmark failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Unable to remove bookmark',
        },
        {
          status: 500,
        }
      );
    }
  }