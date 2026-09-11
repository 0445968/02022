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

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface UseStoryMediaOptions {
  initialFeaturedImage?:
  | MediaAsset
  | null;

  initialImageCaption?: string;

  initialImageCredit?: string;
}

interface LoadRevisionMediaOptions {
  featuredImage?:
  | MediaAsset
  | null;

  featuredImageId?:
  | string
  | null;

  imageCaption?:
  | string
  | null;

  imageCredit?:
  | string
  | null;
}

/* ========================================================= */
/* HOOK */
/* ========================================================= */

export function useStoryMedia({
  initialFeaturedImage = null,
  initialImageCaption = '',
  initialImageCredit = '',
}: UseStoryMediaOptions = {}) {
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

  function selectFeaturedImage(
    media: MediaAsset
  ) {
    const metadata =
      getStoryMediaMetadata(
        media
      );

    setFeaturedImage(
      media
    );

    setFeaturedImageId(
      media.id
    );

    setImageCaption(
      metadata.description ||
      metadata.caption ||
      ''
    );

    setImageCredit(
      metadata.credit ||
      ''
    );

    setMediaPickerOpen(
      false
    );
  }

  function removeFeaturedImage() {
    setFeaturedImage(
      null
    );

    setFeaturedImageId(
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
  /* REVISION LOAD */
  /* ======================================================= */

  function loadRevisionMedia({
    featuredImage:
    nextFeaturedImage,
    featuredImageId:
    nextFeaturedImageId,
    imageCaption:
    nextImageCaption,
    imageCredit:
    nextImageCredit,
  }: LoadRevisionMediaOptions) {
    setFeaturedImage(
      nextFeaturedImage ??
      null
    );

    setFeaturedImageId(
      nextFeaturedImageId ??
      nextFeaturedImage?.id ??
      null
    );

    setImageCaption(
      nextImageCaption ??
      ''
    );

    setImageCredit(
      nextImageCredit ??
      ''
    );
  }

  /* ======================================================= */
  /* RETURN */
  /* ======================================================= */

  return {
    featuredImage,

    featuredImageId,

    imageCaption,

    imageCredit,

    mediaPickerOpen,

    setFeaturedImage:
      setStoryFeaturedImage,

    setStoryFeaturedImage,

    setFeaturedImageId,

    setImageCaption,

    setImageCredit,

    setMediaPickerOpen,

    selectFeaturedImage,

    removeFeaturedImage,

    loadRevisionMedia,
  };
}