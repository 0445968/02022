import {
    NextResponse,
  } from 'next/server';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    isDevAuthBypass,
  } from '@/lib/db/supabase-data';
  
  import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  import {
    createComment,
    getPublicCommentsForStory,
  } from '@/lib/services/comments';
  
  const MAX_REQUEST_SIZE =
    20_000;
  
  const MAX_COMMENT_LENGTH =
    5000;
  
  interface RouteContext {
    params: {
      id: string;
    };
  }
  
  interface CreateCommentRequest {
    body?: unknown;
    parentId?: unknown;
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
      .eq(
        'id',
        storyId
      )
      .eq(
        'status',
        'published'
      )
      .lte(
        'published_at',
        new Date().toISOString()
      )
      .maybeSingle();
  
    if (error) {
      throw new Error(
        `Unable to verify story: ${error.message}`
      );
    }
  
    return Boolean(data);
  }
  
  /**
   * Public endpoint for reading published comments.
   */
  export async function GET(
    request: Request,
    {
      params,
    }: RouteContext
  ) {
    const requestUrl =
      new URL(
        request.url
      );
  
    const requestedLimit =
      Number.parseInt(
        requestUrl.searchParams.get(
          'limit'
        ) ?? '',
        10
      );
  
    const limit =
      Number.isFinite(
        requestedLimit
      )
        ? requestedLimit
        : undefined;
  
    try {
      const thread =
        await getPublicCommentsForStory(
          params.id,
          {
            limit,
          }
        );
  
      return NextResponse.json(
        thread,
        {
          headers: {
            'Cache-Control':
              'public, max-age=0, s-maxage=30, stale-while-revalidate=60',
          },
        }
      );
    } catch (error) {
      console.error(
        'GET story comments failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            'Unable to load comments',
        },
        {
          status: 500,
        }
      );
    }
  }
  
  /**
   * Creates a pending comment or reply.
   *
   * user_id and status are server/database-owned.
   */
  export async function POST(
    request: Request,
    {
      params,
    }: RouteContext
  ) {
    /*
     * DEV_AUTH_BYPASS is not a real authenticated
     * reader session and cannot create reader content.
     */
    if (
      isDevAuthBypass()
    ) {
      return NextResponse.json(
        {
          error:
            'Reader authentication is required',
        },
        {
          status: 401,
        }
      );
    }
  
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
  
    const contentLength =
      Number.parseInt(
        request.headers.get(
          'content-length'
        ) ?? '0',
        10
      );
  
    if (
      Number.isFinite(
        contentLength
      ) &&
      contentLength >
        MAX_REQUEST_SIZE
    ) {
      return NextResponse.json(
        {
          error:
            'Request is too large',
        },
        {
          status: 413,
        }
      );
    }
  
    let requestBody:
      CreateCommentRequest;
  
    try {
      requestBody =
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
  
    if (
      typeof requestBody.body !==
      'string'
    ) {
      return NextResponse.json(
        {
          error:
            'Comment body is required',
        },
        {
          status: 422,
        }
      );
    }
  
    const commentBody =
      requestBody.body.trim();
  
    if (!commentBody) {
      return NextResponse.json(
        {
          error:
            'Comment cannot be empty',
        },
        {
          status: 422,
        }
      );
    }
  
    if (
      commentBody.length >
      MAX_COMMENT_LENGTH
    ) {
      return NextResponse.json(
        {
          error:
            `Comment cannot exceed ${MAX_COMMENT_LENGTH} characters`,
        },
        {
          status: 422,
        }
      );
    }
  
    const parentId =
      requestBody.parentId ===
        undefined ||
      requestBody.parentId ===
        null
        ? null
        : typeof requestBody.parentId ===
            'string'
          ? requestBody.parentId.trim()
          : null;
  
    if (
      requestBody.parentId !==
        undefined &&
      requestBody.parentId !==
        null &&
      !parentId
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid parent comment ID',
        },
        {
          status: 422,
        }
      );
    }
  
    try {
      const storyExists =
        await publishedStoryExists(
          params.id
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
  
      const comment =
        await createComment({
          storyId:
            params.id,
  
          userId:
            user.id,
  
          parentId,
  
          body:
            commentBody,
        });
  
      return NextResponse.json(
        {
          success: true,
          comment,
        },
        {
          status: 201,
        }
      );
    } catch (error) {
      console.error(
        'POST story comment failed:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            'Unable to submit comment',
        },
        {
          status: 500,
        }
      );
    }
  }