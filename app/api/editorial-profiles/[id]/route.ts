import {
    NextResponse,
  } from 'next/server';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    getDataClient,
  } from '@/lib/db/supabase-data-access';
  
  import type {
    EditorialBylineStatus,
  } from '@/lib/db/database.types';
  
  interface RouteContext {
    params: {
      id: string;
    };
  }
  
  interface UpdateEditorialProfileBody {
    bylineName?: string;
    editorialTitle?: string | null;
    bio?: string | null;
    bylineStatus?: EditorialBylineStatus;
    headshotMediaId?: string | null;
  }
  
  const VALID_STATUSES:
    EditorialBylineStatus[] = [
      'active',
      'former',
      'hidden',
    ];
  
  export async function PATCH(
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
            'Authentication required.',
        },
        {
          status: 401,
        }
      );
    }
  
    /*
     * Only editors should be
     * allowed to manage author
     * editorial profiles.
     */
    if (
      !user.profile
        ?.isEditor
    ) {
      return NextResponse.json(
        {
          error:
            'Editor access required.',
        },
        {
          status: 403,
        }
      );
    }
  
    let body:
      UpdateEditorialProfileBody;
  
    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            'Invalid request body.',
        },
        {
          status: 400,
        }
      );
    }
  
    const bylineName =
      body.bylineName
        ?.trim();
  
    if (!bylineName) {
      return NextResponse.json(
        {
          error:
            'Byline name is required.',
        },
        {
          status: 400,
        }
      );
    }
  
    if (
      body.bylineStatus &&
      !VALID_STATUSES.includes(
        body.bylineStatus
      )
    ) {
      return NextResponse.json(
        {
          error:
            'Invalid byline status.',
        },
        {
          status: 400,
        }
      );
    }
  
    const supabase =
      await getDataClient();
  
      const {
        data: existingProfile,
        error: lookupError,
      } = await supabase
        .from(
          'editorial_profiles'
        )
        .select(
          `
            id,
            account_id,
            byline_name,
            headshot_media_id
          `
        )
        .eq(
          'id',
          params.id
        )
        .maybeSingle();
      
      if (lookupError) {
        console.error(
          'Unable to verify editorial profile before update:',
          lookupError
        );
      
        return NextResponse.json(
          {
            error:
              `Unable to verify author profile: ${lookupError.message}`,
          },
          {
            status: 500,
          }
        );
      }
      
      if (!existingProfile) {
        console.error(
          'Editorial profile lookup returned no row:',
          {
            requestedId:
              params.id,
          }
        );
      
        return NextResponse.json(
          {
            error:
              `Author not found for id ${params.id}`,
          },
          {
            status: 404,
          }
        );
      }
      
      const {
        data,
        error,
      } = await supabase
        .from(
          'editorial_profiles'
        )
        .update({
          byline_name:
            bylineName,
      
          editorial_title:
            body.editorialTitle
              ?.trim() ||
            null,
      
          bio:
            body.bio
              ?.trim() ||
            null,
      
          byline_status:
            body.bylineStatus ??
            'active',
      
          headshot_media_id:
            body.headshotMediaId ??
            null,
      
          updated_at:
            new Date().toISOString(),
        })
        .eq(
          'id',
          params.id
        )
        .select(
          `
            id,
            account_id,
            byline_name,
            slug,
            editorial_title,
            bio,
            headshot_media_id,
            byline_status,
            created_at,
            updated_at
          `
        )
        .maybeSingle();
      
      if (error) {
        console.error(
          'Unable to update editorial profile:',
          error
        );
      
        return NextResponse.json(
          {
            error:
              `Unable to save author profile: ${error.message}`,
          },
          {
            status: 500,
          }
        );
      }
      
      if (!data) {
        console.error(
          'Editorial profile update returned no row:',
          {
            requestedId:
              params.id,
            existingProfile,
          }
        );
      
        return NextResponse.json(
          {
            error:
              'Author profile exists, but the update was blocked or returned no row.',
          },
          {
            status: 403,
          }
        );
      }
  
    if (error) {
      console.error(
        'Unable to update editorial profile:',
        error
      );
  
      return NextResponse.json(
        {
          error:
            'Unable to save author profile.',
        },
        {
          status: 500,
        }
      );
    }
  
    if (!data) {
      return NextResponse.json(
        {
          error:
            'Author profile not found.',
        },
        {
          status: 404,
        }
      );
    }
  
    return NextResponse.json({
      ok: true,
      profile: data,
    });
  }