import type {
    MediaAsset,
  } from '@/types/editorial';
  
  /* ========================================================= */
  /* TYPES */
  /* ========================================================= */
  
  export interface StoryMediaMetadata {
    altText: string;
  
    description: string;
  
    caption: string;
  
    credit: string;
  }
  
  /* ========================================================= */
  /* STORY MEDIA METADATA */
   /* ======================================================== */
  
  export function getStoryMediaMetadata(
    media: MediaAsset
  ): StoryMediaMetadata {
    const description =
      media.description?.trim() ||
      media.caption?.trim() ||
      '';
  
    const caption =
      media.caption?.trim() ||
      media.description?.trim() ||
      '';
  
    const credit =
      media.credit?.trim() ||
      media.photographer?.trim() ||
      media.creatorName?.trim() ||
      '';
  
    const altText =
      media.altText?.trim() ||
      media.title?.trim() ||
      media.description?.trim() ||
      '';
  
    return {
      altText,
      description,
      caption,
      credit,
    };
  }