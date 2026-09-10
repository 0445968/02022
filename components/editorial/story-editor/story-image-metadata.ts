import {
    getStoryMediaMetadata,
  } from '@/lib/editorial/media-selection';
  
  import type {
    MediaAsset,
  } from '@/types/editorial';
  
  /* ========================================================= */
  /* TYPES */
  /* ========================================================= */
  
  export interface StoryImageAttributes {
    src: string;
  
    alt: string;
  
    title: string;
  
    mediaAssetId: string;
  
    description:
      | string
      | null;
  
    credit:
      | string
      | null;
  }
  
  /* ========================================================= */
  /* MAPPER */
  /* ========================================================= */
  
  export function mediaAssetToStoryImageAttributes(
    media: MediaAsset
  ): StoryImageAttributes {
    const metadata =
      getStoryMediaMetadata(
        media
      );
  
    return {
      src:
        media.url,
  
      alt:
        metadata.altText ||
        media.fileName,
  
      title:
        media.title ||
        media.fileName,
  
      mediaAssetId:
        media.id,
  
      description:
        metadata.description ||
        metadata.caption ||
        null,
  
      credit:
        metadata.credit ||
        null,
    };
  }