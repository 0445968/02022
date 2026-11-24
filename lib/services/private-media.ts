/**
 * Validate actual file signatures, not just user-supplied MIME type or name.
 * Only our supported image formats can enter the private staging bucket.
 */
export function hasExpectedImageSignature(mimeType: string, bytes: Uint8Array): boolean {
  const starts = (...hex: number[]) =>
    bytes.length >= hex.length && hex.every((value, index) => bytes[index] === value);
  const ascii = (start: number, length: number) =>
    String.fromCharCode(...bytes.slice(start, start + length));
  switch (mimeType) {
    case 'image/jpeg': return starts(0xff,0xd8,0xff);
    case 'image/png': return starts(0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a);
    case 'image/gif': return ascii(0,6)==='GIF87a' || ascii(0,6)==='GIF89a';
    case 'image/webp': return ascii(0,4)==='RIFF' && ascii(8,4)==='WEBP';
    case 'image/avif': return ascii(4,4)==='ftyp' && ['avif','avis'].some(
      brand=>ascii(8,32).includes(brand));
    default: return false;
  }
}
export const PRIVATE_DRAFT_EXTENSIONS: Readonly<Record<string,string>>={
  'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
  'image/gif':'gif','image/avif':'avif'
};
