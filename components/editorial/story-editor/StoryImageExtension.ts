import Image from '@tiptap/extension-image';

/**
 * Story image node used inside TipTap article bodies.
 *
 * Besides TipTap's normal:
 * - src
 * - alt
 * - title
 *
 * we store newsroom-specific metadata directly
 * in the story body JSON:
 *
 * - mediaAssetId
 * - description
 * - credit
 */
export const StoryImageExtension =
  Image.extend({
    addAttributes() {
      return {
        ...this.parent?.(),

        /* ================================================= */
        /* MEDIA LIBRARY ID */
        /* ================================================= */

        mediaAssetId: {
          default: null,

          parseHTML: (
            element
          ) =>
            element.getAttribute(
              'data-media-asset-id'
            ),

          renderHTML: (
            attributes
          ) => {
            if (
              !attributes.mediaAssetId
            ) {
              return {};
            }

            return {
              'data-media-asset-id':
                attributes.mediaAssetId,
            };
          },
        },

        /* ================================================= */
        /* DESCRIPTION / CAPTION */
        /* ================================================= */

        description: {
          default: null,

          parseHTML: (
            element
          ) =>
            element.getAttribute(
              'data-description'
            ),

          renderHTML: (
            attributes
          ) => {
            if (
              !attributes.description
            ) {
              return {};
            }

            return {
              'data-description':
                attributes.description,
            };
          },
        },

        /* ================================================= */
        /* CREDIT */
        /* ================================================= */

        credit: {
          default: null,

          parseHTML: (
            element
          ) =>
            element.getAttribute(
              'data-credit'
            ),

          renderHTML: (
            attributes
          ) => {
            if (
              !attributes.credit
            ) {
              return {};
            }

            return {
              'data-credit':
                attributes.credit,
            };
          },
        },
      };
    },
  }).configure({
    inline: false,

    allowBase64: false,

    HTMLAttributes: {
      class:
        'story-inline-image',
    },
  });