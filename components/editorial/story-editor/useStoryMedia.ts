
'use client';

import {
  useState,
} from 'react';

import {
  getStoryMediaMetadata,
} from '@/lib/editorial/media-selection';

import type {
  MediaAsset,
} from '@/types/editorial';

interface UseStoryMediaOptions {
  initialFeaturedImage:
    | MediaAsset
    | null;

  initialImageCaption:
    string;

  initialImageCredit:
    string;
}

export function useStoryMedia({
  initialFeaturedImage,
  initialImageCaption,
  initialImageCredit,
}: UseStoryMediaOptions) {
  const [
    featuredImage,
    setFeaturedImage,
  ] = useState<
    MediaAsset | null
  >(
    initialFeaturedImage
  );

  const [
    featuredImageId,
    setFeaturedImageId,
  ] = useState<
    string | null
  >(
    initialFeaturedImage?.id ??
      null
  );

  const [
    imageCaption,
    setImageCaption,
  ] = useState(
    initialImageCaption
  );

  const [
    imageCredit,
    setImageCredit,
  ] = useState(
    initialImageCredit
  );

  const [
    mediaPickerOpen,
    setMediaPickerOpen,
  ] = useState(false);

  /* ======================================================= */
  /* FEATURED IMAGE */
  /* ======================================================= */

  function setStoryFeaturedImage(
    media:
      | MediaAsset
      | null
  ) {
    setFeaturedImage(
      media
    );

    setFeaturedImageId(
      media?.id ??
        null
    );
  }

  /* ======================================================= */
  /* SELECT FROM MEDIA LIBRARY */
  /* ======================================================= */

  function selectFeaturedImage(
    media: MediaAsset
  ) {
    const metadata =
      getStoryMediaMetadata(
        media
      );

    setStoryFeaturedImage(
      media
    );

    /*
     * Selecting a new Media Library image should
     * populate the story-specific image fields from
     * the selected asset.
     *
     * These are copied values, not live references,
     * so the editor can still customize them for
     * this individual story afterward.
     */
    setImageCaption(
      metadata.description ||
        metadata.caption ||
        ''
    );

    setImageCredit(
      metadata.credit
    );

    setMediaPickerOpen(
      false
    );
  }

  /* ======================================================= */
  /* REMOVE FEATURED IMAGE */
  /* ======================================================= */

  function removeFeaturedImage() {
    setStoryFeaturedImage(
      null
    );

    setImageCaption(
      ''
    );

    setImageCredit(
      ''
    );
  }

  /* ======================================================= */
  /* LOAD REVISION */
  /* ======================================================= */

  /**
   * Used when an existing unpublished revision
   * is loaded.
   *
   * The revision may contain a featured image ID
   * different from the currently published asset.
   */
  function loadRevisionMedia({
    featuredImageId:
      revisionFeaturedImageId,

    imageCaption:
      revisionImageCaption,

    imageCredit:
      revisionImageCredit,

    publishedFeaturedImage,
  }: {
    featuredImageId:
      | string
      | null;

    imageCaption:
      | string
      | null;

    imageCredit:
      | string
      | null;

    publishedFeaturedImage:
      | MediaAsset
      | null;
  }) {
    setFeaturedImageId(
      revisionFeaturedImageId
    );

    /*
     * If the revision uses the currently published
     * image, keep the full MediaAsset object.
     *
     * If it references another asset, preserve the
     * ID even though the full object is not loaded yet.
     */
    if (
      revisionFeaturedImageId ===
      publishedFeaturedImage?.id
    ) {
      setFeaturedImage(
        publishedFeaturedImage
      );
    } else {
      setFeaturedImage(
        null
      );
    }

    setImageCaption(
      revisionImageCaption ??
        ''
    );

    setImageCredit(
      revisionImageCredit ??
        ''
    );
  }

  return {
    featuredImage,
    featuredImageId,

    imageCaption,
    imageCredit,

    mediaPickerOpen,

    setFeaturedImage,
    setFeaturedImageId,

    setImageCaption,
    setImageCredit,

    setMediaPickerOpen,

    setStoryFeaturedImage,
    selectFeaturedImage,
    removeFeaturedImage,
    loadRevisionMedia,
  };
}

