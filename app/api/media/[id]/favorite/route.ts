import {
    NextResponse,
  } from 'next/server';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    favoriteMediaAsset,
    isMediaFavorite,
    toggleMediaFavorite,
    unfavoriteMediaAsset,
  } from '@/lib/services/media-favorites';
  
  /* ========================================================= */
  /* AUTH HELPER */
  /* ========================================================= */
  
  async function getAuthorizedUser() {
    const user =
      await getCurrentUser();
  
    if (
      !user ||
      !(
        user.profile
          ?.isAuthor ||
        user.profile
          ?.isEditor
      )
    ) {
      return null;
    }
  
    return user;
  }
  
  /* ========================================================= */
  /* GET — CHECK FAVORITE */
  /* ========================================================= */
  
  export async function GET(
    _request: Request,
    {
      params,
    }: {
      params: {
        id: string;
      };
    }
  ) {
    const user =
      await getAuthorizedUser();
  
    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'Unauthorized',
        },
        {
          status:
            403,
        }
      );
    }
  
    const isFavorite =
      await isMediaFavorite(
        params.id,
        user.id
      );
  
    return NextResponse.json({
      mediaAssetId:
        params.id,
  
      isFavorite,
    });
  }
  
  /* ========================================================= */
  /* POST — ADD FAVORITE */
  /* ========================================================= */
  
  export async function POST(
    _request: Request,
    {
      params,
    }: {
      params: {
        id: string;
      };
    }
  ) {
    const user =
      await getAuthorizedUser();
  
    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'Unauthorized',
        },
        {
          status:
            403,
        }
      );
    }
  
    const success =
      await favoriteMediaAsset(
        params.id,
        user.id
      );
  
    if (
      !success
    ) {
      return NextResponse.json(
        {
          error:
            'Unable to favorite media asset.',
        },
        {
          status:
            500,
        }
      );
    }
  
    return NextResponse.json({
      mediaAssetId:
        params.id,
  
      isFavorite:
        true,
    });
  }
  
  /* ========================================================= */
  /* DELETE — REMOVE FAVORITE */
  /* ========================================================= */
  
  export async function DELETE(
    _request: Request,
    {
      params,
    }: {
      params: {
        id: string;
      };
    }
  ) {
    const user =
      await getAuthorizedUser();
  
    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'Unauthorized',
        },
        {
          status:
            403,
        }
      );
    }
  
    const success =
      await unfavoriteMediaAsset(
        params.id,
        user.id
      );
  
    if (
      !success
    ) {
      return NextResponse.json(
        {
          error:
            'Unable to remove media favorite.',
        },
        {
          status:
            500,
        }
      );
    }
  
    return NextResponse.json({
      mediaAssetId:
        params.id,
  
      isFavorite:
        false,
    });
  }
  
  /* ========================================================= */
  /* PATCH — TOGGLE */
  /* ========================================================= */
  
  export async function PATCH(
    _request: Request,
    {
      params,
    }: {
      params: {
        id: string;
      };
    }
  ) {
    const user =
      await getAuthorizedUser();
  
    if (
      !user
    ) {
      return NextResponse.json(
        {
          error:
            'Unauthorized',
        },
        {
          status:
            403,
        }
      );
    }
  
    const result =
      await toggleMediaFavorite(
        params.id,
        user.id
      );
  
    if (
      !result
    ) {
      return NextResponse.json(
        {
          error:
            'Unable to update media favorite.',
        },
        {
          status:
            500,
        }
      );
    }
  
    return NextResponse.json(
      result
    );
  }