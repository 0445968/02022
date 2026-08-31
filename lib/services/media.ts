import { getDataClient } from '@/lib/db/supabase-data-access';
import type { MediaAsset } from '@/types/editorial';
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from '@/lib/services/media-config';

export { ALLOWED_MIME_TYPES, MAX_FILE_SIZE };

function mapMediaRow(row: Record<string, unknown>): MediaAsset {
  return {
    id: row.id as string,
    url: row.url as string,
    storagePath: row.storage_path as string,
    fileName: row.file_name as string,
    mimeType: row.mime_type as string,
    width: (row.width as number | null) ?? null,
    height: (row.height as number | null) ?? null,
    fileSize: (row.file_size as number | null) ?? null,
    altText: (row.alt_text as string) ?? '',
    caption: (row.caption as string | null) ?? null,
    credit: (row.credit as string | null) ?? null,
    uploadedBy: row.uploaded_by as string,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getMediaAssets(opts?: {
  search?: string;
  page?: number;
  perPage?: number;
}): Promise<{ items: MediaAsset[]; total: number; page: number; perPage: number; totalPages: number }> {
  const supabase = await getDataClient();
  const page = Math.max(1, opts?.page ?? 1);
  const perPage = Math.min(48, Math.max(1, opts?.perPage ?? 24));
  const offset = (page - 1) * perPage;

  let query = supabase
    .from('media_assets')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1);

  if (opts?.search) {
    query = query.or(`file_name.ilike.%${opts.search}%,caption.ilike.%${opts.search}%,credit.ilike.%${opts.search}%`);
  }

  const { data, count } = await query;

  const items = (data ?? []).map((row) => mapMediaRow(row as Record<string, unknown>));
  const total = count ?? 0;
  return { items, total, page, perPage, totalPages: Math.ceil(total / perPage) };
}

export async function getMediaAsset(id: string): Promise<MediaAsset | null> {
  const supabase = await getDataClient();
  const { data } = await supabase
    .from('media_assets')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  return data ? mapMediaRow(data as Record<string, unknown>) : null;
}

export async function updateMediaAsset(
  id: string,
  update: { altText?: string; caption?: string | null; credit?: string | null }
): Promise<boolean> {
  const supabase = await getDataClient();
  const updateData: Record<string, unknown> = {};
  if (update.altText !== undefined) updateData.alt_text = update.altText;
  if (update.caption !== undefined) updateData.caption = update.caption;
  if (update.credit !== undefined) updateData.credit = update.credit;

  const { error } = await supabase.from('media_assets').update(updateData).eq('id', id);
  return !error;
}

export async function createMediaAssetRecord(input: {
  url: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  width?: number | null;
  height?: number | null;
  fileSize?: number | null;
  altText?: string;
  caption?: string | null;
  credit?: string | null;
  uploadedBy: string;
}): Promise<MediaAsset | null> {
  const supabase = await getDataClient();
  const { data } = await supabase
    .from('media_assets')
    .insert({
      url: input.url,
      storage_path: input.storagePath,
      file_name: input.fileName,
      mime_type: input.mimeType,
      width: input.width ?? null,
      height: input.height ?? null,
      file_size: input.fileSize ?? null,
      alt_text: input.altText ?? '',
      caption: input.caption ?? null,
      credit: input.credit ?? null,
      uploaded_by: input.uploadedBy,
    })
    .select('*')
    .single();

  return data ? mapMediaRow(data as Record<string, unknown>) : null;
}

export async function deleteMediaAsset(id: string, storagePath: string): Promise<boolean> {
  const supabase = await getDataClient();
  // Delete from storage first
  await supabase.storage.from('media').remove([storagePath]);
  // Then delete the record
  const { error } = await supabase.from('media_assets').delete().eq('id', id);
  return !error;
}


