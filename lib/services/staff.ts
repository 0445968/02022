import { getDataClient } from '@/lib/db/supabase-data-access';
import type { StaffOption } from '@/types/editorial';

/**
 * Server-side data-access for staff (authors and editors).
 */

export async function getAuthors(): Promise<StaffOption[]> {
  const supabase = await getDataClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, editorial_title')
    .eq('is_author', true)
    .order('name', { ascending: true });

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: (r.name as string) ?? 'Unknown',
      editorialTitle: (r.editorial_title as string) ?? null,
    };
  });
}

export async function getEditors(): Promise<StaffOption[]> {
  const supabase = await getDataClient();
  const { data } = await supabase
    .from('profiles')
    .select('id, name, editorial_title')
    .eq('is_editor', true)
    .order('name', { ascending: true });

  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      name: (r.name as string) ?? 'Unknown',
      editorialTitle: (r.editorial_title as string) ?? null,
    };
  });
}
