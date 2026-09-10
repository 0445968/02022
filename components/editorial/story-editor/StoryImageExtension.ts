import Image from '@tiptap/extension-image';

export const StoryImageExtension =
  Image.extend({
    name: 'image',

    addAttributes() {
      return {
        ...this.parent?.(),

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