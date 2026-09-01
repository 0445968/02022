'use client';

import {
  useState,
} from 'react';

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

  function selectFeaturedImage(
    media: MediaAsset
  ) {
    setStoryFeaturedImage(
      media
    );

    /**
     * Use Media Library metadata as defaults,
     * but do not overwrite story-specific values
     * already entered by the editor.
     */
    if (
      !imageCaption &&
      media.caption
    ) {
      setImageCaption(
        media.caption
      );
    }

    if (
      !imageCredit &&
      media.credit
    ) {
      setImageCredit(
        media.credit
      );
    }

    setMediaPickerOpen(
      false
    );
  }

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

    /**
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