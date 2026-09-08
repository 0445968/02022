'use client';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  MediaAsset,
} from '@/types/editorial';

import {
  MediaPicker,
} from '@/components/editorial/media-picker';

interface AuthorHeadshotPickerProps {
  dict: Dictionary;
  userId: string;

  onSelect: (
    media: MediaAsset
  ) => void;

  onClose: () => void;
}

export function AuthorHeadshotPicker({
  dict,
  userId,
  onSelect,
  onClose,
}: AuthorHeadshotPickerProps) {
  return (
    <MediaPicker
      dict={dict}
      userId={userId}
      onSelect={onSelect}
      onClose={onClose}
    />
  );
}