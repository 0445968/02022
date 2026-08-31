/** Allowed MIME types for media upload. Shared between server and client. */
export const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB
