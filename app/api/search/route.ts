import {
  NextResponse,
} from 'next/server';

import {
  searchPublishedStories,
} from '@/lib/services/search';

export async function GET(
  request: Request
) {
  const url =
    new URL(
      request.url
    );

  const query =
    url.searchParams.get(
      'q'
    ) ?? '';

  if (
    query.trim().length < 2
  ) {
    return NextResponse.json(
      {
        results: [],
      }
    );
  }

  try {
    const results =
      await searchPublishedStories(
        query,
        {
          limit: 6,
        }
      );

    return NextResponse.json(
      {
        results,
      }
    );
  } catch (error) {
    console.error(
      'Live search API failed:',
      error
    );

    return NextResponse.json(
      {
        error:
          'Unable to search stories',
        results: [],
      },
      {
        status: 500,
      }
    );
  }
}