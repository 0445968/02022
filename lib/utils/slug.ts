/**
 * Slug generation and uniqueness helpers.
 */

/** Converts a string into a URL-safe slug. */
export function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip diacritics
    .replace(/[^a-z0-9\s-]/g, '') // remove non-alphanumeric
    .replace(/[\s_]+/g, '-') // spaces → dashes
    .replace(/-+/g, '-') // collapse multiple dashes
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    .slice(0, 120);
}

/**
 * Ensures slug uniqueness by appending -2, -3, etc. if the slug already
 * exists. Pass an array of existing slugs to check against.
 */
export function ensureUniqueSlug(
  baseSlug: string,
  existingSlugs: string[]
): string {
  if (!baseSlug) return `story-${Date.now()}`;
  const slugSet = new Set(existingSlugs);
  if (!slugSet.has(baseSlug)) return baseSlug;
  let i = 2;
  while (slugSet.has(`${baseSlug}-${i}`)) {
    i++;
  }
  return `${baseSlug}-${i}`;
}
