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
    deleteOwnComment,
    updateOwnComment,
  } from '@/lib/services/account-comments';
  
  const MAX_REQUEST_SIZE =
    20_000;
  
  const MAX_COMMENT_LENGTH =
    5000;
  
  interface RouteContext {
    params: {
      commentId: string;
    };
  }
  
  interface UpdateCommentRequest {
    body?: unknown;
  }
  
  function readerAuthUnavailable() {
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
  
  /**
   * Edits the current reader's comment.
   *
   * The reader may provide only the new body.
   * Ownership and moderation status are server-owned.
   */
  export async function PATCH(
    request: Request,
    {
      params,
    }: RouteContext
  ) {
    if (
      isDevAuthBypass()
    ) {
      return readerAuthUnavailable();
    }
  
    const user =
      await getCurrentUser();
  
    if (!user) {
      return readerAuthUnavailable();
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
      UpdateCommentRequest;
  
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
  
    const body =
      requestBody.body.trim();
  
    if (!body) {
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
      body.length >
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
  
    try {
      const comment =
        await updateOwnComment({
          commentId:
            params.commentId,
  
          userId:
            user.id,
  
          body,
        });
  
      return NextResponse.json(
        {
          success: true,
          comment,
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
        'PATCH account comment failed:',
        error
      );
  
      const message =
        error instanceof Error
          ? error.message
          : '';
  
      const notFound =
        message
          .toLowerCase()
          .includes(
            'not found'
          );
  
      return NextResponse.json(
        {
          error:
            notFound
              ? 'Comment not found or cannot be edited'
              : 'Unable to update comment',
        },
        {
          status:
            notFound
              ? 404
              : 500,
        }
      );
    }
  }
  
  /**
   * Soft-deletes the current reader's comment.
   *
   * The stored body is erased, but the database row remains
   * so replies and moderation history retain their structure.
   */
  export async function DELETE(
    _request: Request,
    {
      params,
    }: RouteContext
  ) {
    if (
      isDevAuthBypass()
    ) {
      return readerAuthUnavailable();
    }
  
    const user =
      await getCurrentUser();
  
    if (!user) {
      return readerAuthUnavailable();
    }
  
    try {
      await deleteOwnComment({
        commentId:
          params.commentId,
  
        userId:
          user.id,
      });
  
      return NextResponse.json(
        {
          success: true,
          deleted: true,
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
        'DELETE account comment failed:',
        error
      );
  
      const message =
        error instanceof Error
          ? error.message
          : '';
  
      const notFound =
        message
          .toLowerCase()
          .includes(
            'not found'
          ) ||
        message
          .toLowerCase()
          .includes(
            'already deleted'
          );
  
      return NextResponse.json(
        {
          error:
            notFound
              ? 'Comment not found or already deleted'
              : 'Unable to delete comment',
        },
        {
          status:
            notFound
              ? 404
              : 500,
        }
      );
    }
  }