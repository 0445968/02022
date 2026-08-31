import { getDataClient } from '@/lib/db/supabase-data-access';
import type { Category, Tag } from '@/types/editorial';
import { slugify } from '@/lib/utils/slug';

/**
 * Server-side data-access for categories and tags.
 */

export async function getCategories(opts?: { includeInactive?: boolean }): Promise<Category[]> {
  const supabase = await getDataClient();

  let query = supabase.from('categories').select('*').order('sort_order', { ascending: true });
  if (!opts?.includeInactive) {
    query = query.eq('active', true);
  }

  const { data } = await query;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return {
      id: r.id as string,
      slug: r.slug as string,
      nameEn: r.name_en as string,
      nameEs: r.name_es as string,
      descriptionEn: (r.description_en as string) ?? null,
      descriptionEs: (r.description_es as string) ?? null,
      active: Boolean(r.active),
      sortOrder: r.sort_order as number,
    };
  });
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const supabase = await getDataClient();
  const { data } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    slug: r.slug as string,
    nameEn: r.name_en as string,
    nameEs: r.name_es as string,
    descriptionEn: (r.description_en as string) ?? null,
    descriptionEs: (r.description_es as string) ?? null,
    active: Boolean(r.active),
    sortOrder: r.sort_order as number,
  };
}

export async function getTags(search?: string): Promise<Tag[]> {
  const supabase = await getDataClient();
  let query = supabase.from('tags').select('*').order('name', { ascending: true }).limit(100);
  if (search) {
    query = query.ilike('name', `%${search}%`);
  }
  const { data } = await query;
  return (data ?? []).map((row) => {
    const r = row as Record<string, unknown>;
    return { id: r.id as string, slug: r.slug as string, name: r.name as string };
  });
}

/** Creates a tag if it doesn't already exist (by slug). Returns the tag. */
export async function findOrCreateTag(name: string): Promise<Tag | null> {
  const supabase = await getDataClient();
  const slug = slugify(name);
  if (!slug) return null;

  // Check existing
  const { data: existing } = await supabase
    .from('tags')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    const r = existing as Record<string, unknown>;
    return { id: r.id as string, slug: r.slug as string, name: r.name as string };
  }

  // Create
  const { data: created } = await supabase
    .from('tags')
    .insert({ slug, name: name.trim() })
    .select('*')
    .single();

  if (!created) return null;
  const r = created as Record<string, unknown>;
  return { id: r.id as string, slug: r.slug as string, name: r.name as string };
}
