import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { getMediaAssets } from '@/lib/services/media';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get('search') ?? undefined;
  const page = parseInt(searchParams.get('page') ?? '1', 10) || 1;

  const result = await getMediaAssets({ search, page });
  return NextResponse.json(result);
}
