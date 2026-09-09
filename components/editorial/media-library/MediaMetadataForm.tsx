'use client';

import type {
  IslandScope,
  MediaAllowedUse,
  MediaAsset,
  MediaRightsStatus,
  MediaSensitiveLevel,
  MediaStatus,
} from '@/types/editorial';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

export interface MediaMetadataValues {
  title: string;

  altText: string;

  caption: string;

  description: string;

  credit: string;

  photographer: string;

  creatorName: string;

  copyrightHolder: string;

  sourceName: string;

  sourceUrl: string;

  status: MediaStatus;

  rightsStatus: MediaRightsStatus;

  licenseName: string;

  rightsNotes: string;

  allowedUses: MediaAllowedUse[];

  restrictions: string[];

  licenseExpiresAt: string;

  embargoUntil: string;

  dateCreated: string;

  approximateDate: string;

  island: IslandScope | '';

  country: string;

  region: string;

  city: string;

  neighborhood: string;

  locationName: string;

  latitude: string;

  longitude: string;

  language: string;

  categoryId: string;

  focalPointX: string;

  focalPointY: string;

  displayCaption: boolean;

  displayCredit: boolean;

  decorative: boolean;

  sensitiveLevel: MediaSensitiveLevel;

  internalNotes: string;
}

interface MediaMetadataFormProps {
  values: MediaMetadataValues;

  onChange: (
    values: MediaMetadataValues
  ) => void;

  disabled?: boolean;
}

/* ========================================================= */
/* OPTIONS */
/* ========================================================= */

const RIGHTS_OPTIONS: {
  value: MediaRightsStatus;
  label: string;
}[] = [
  {
    value: 'owned',
    label: 'Owned by West Island Times',
  },
  {
    value: 'staff_created',
    label: 'Staff created',
  },
  {
    value: 'freelancer',
    label: 'Freelancer',
  },
  {
    value: 'licensed',
    label: 'Licensed',
  },
  {
    value: 'wire_service',
    label: 'Wire / agency',
  },
  {
    value: 'government',
    label: 'Government',
  },
  {
    value: 'public_domain',
    label: 'Public domain',
  },
  {
    value: 'creative_commons',
    label: 'Creative Commons',
  },
  {
    value: 'reader_submitted',
    label: 'Reader submitted',
  },
  {
    value: 'restricted',
    label: 'Restricted',
  },
  {
    value: 'unknown',
    label: 'Unknown',
  },
];

const STATUS_OPTIONS: {
  value: MediaStatus;
  label: string;
}[] = [
  {
    value: 'draft',
    label: 'Draft',
  },
  {
    value: 'approved',
    label: 'Approved',
  },
  {
    value: 'restricted',
    label: 'Restricted',
  },
  {
    value: 'archived',
    label: 'Archived',
  },
  {
    value: 'trashed',
    label: 'Trash',
  },
];

const SENSITIVE_OPTIONS: {
  value: MediaSensitiveLevel;
  label: string;
}[] = [
  {
    value: 'none',
    label: 'None',
  },
  {
    value: 'sensitive',
    label: 'Sensitive',
  },
  {
    value: 'disturbing',
    label: 'Disturbing',
  },
  {
    value: 'graphic',
    label: 'Graphic',
  },
];

const ISLAND_OPTIONS: {
  value: IslandScope | '';
  label: string;
}[] = [
  {
    value: '',
    label: 'Not specified',
  },
  {
    value: 'san_andres',
    label: 'San Andrés',
  },
  {
    value: 'old_providence',
    label: 'Old Providence',
  },
  {
    value: 'saint_catalina',
    label: 'Saint Catalina',
  },
  {
    value: 'archipelago',
    label: 'Archipelago-wide',
  },
  {
    value: 'none',
    label: 'Not location-specific',
  },
];

const ALLOWED_USE_OPTIONS: {
  value: MediaAllowedUse;
  label: string;
}[] = [
  {
    value: 'website',
    label: 'Website',
  },
  {
    value: 'app',
    label: 'App',
  },
  {
    value: 'social_media',
    label: 'Social media',
  },
  {
    value: 'newsletter',
    label: 'Newsletter',
  },
  {
    value: 'print',
    label: 'Print',
  },
  {
    value: 'advertising',
    label: 'Advertising',
  },
  {
    value: 'promotional',
    label: 'Promotional',
  },
  {
    value: 'archive',
    label: 'Archive',
  },
];

/* ========================================================= */
/* ASSET -> FORM VALUES */
/* ========================================================= */

export function mediaAssetToMetadataValues(
  asset: MediaAsset
): MediaMetadataValues {
  return {
    title:
      asset.title ?? '',

    altText:
      asset.altText ?? '',

    caption:
      asset.caption ?? '',

    description:
      asset.description ?? '',

    credit:
      asset.credit ?? '',

    photographer:
      asset.photographer ?? '',

    creatorName:
      asset.creatorName ?? '',

    copyrightHolder:
      asset.copyrightHolder ?? '',

    sourceName:
      asset.sourceName ?? '',

    sourceUrl:
      asset.sourceUrl ?? '',

    status:
      asset.status,

    rightsStatus:
      asset.rightsStatus,

    licenseName:
      asset.licenseName ?? '',

    rightsNotes:
      asset.rightsNotes ?? '',

    allowedUses:
      Array.isArray(
        asset.allowedUses
      )
        ? [
            ...asset.allowedUses,
          ]
        : [],

    restrictions:
      Array.isArray(
        asset.restrictions
      )
        ? [
            ...asset.restrictions,
          ]
        : [],

    licenseExpiresAt:
      toDateTimeLocal(
        asset.licenseExpiresAt
      ),

    embargoUntil:
      toDateTimeLocal(
        asset.embargoUntil
      ),

    dateCreated:
      toDateInput(
        asset.dateCreated
      ),

    approximateDate:
      asset.approximateDate ??
      '',

    island:
      asset.island ?? '',

    country:
      asset.country ?? '',

    region:
      asset.region ?? '',

    city:
      asset.city ?? '',

    neighborhood:
      asset.neighborhood ?? '',

    locationName:
      asset.locationName ?? '',

    latitude:
      asset.latitude === null
        ? ''
        : String(
            asset.latitude
          ),

    longitude:
      asset.longitude === null
        ? ''
        : String(
            asset.longitude
          ),

    language:
      asset.language ?? '',

    categoryId:
      asset.categoryId ?? '',

    focalPointX:
      asset.focalPointX === null
        ? ''
        : String(
            asset.focalPointX
          ),

    focalPointY:
      asset.focalPointY === null
        ? ''
        : String(
            asset.focalPointY
          ),

    displayCaption:
      asset.displayCaption,

    displayCredit:
      asset.displayCredit,

    decorative:
      asset.decorative,

    sensitiveLevel:
      asset.sensitiveLevel,

    internalNotes:
      asset.internalNotes ?? '',
  };
}

/* ========================================================= */
/* COMPONENT */
/* ========================================================= */

export function MediaMetadataForm({
  values,
  onChange,
  disabled = false,
}: MediaMetadataFormProps) {
  function updateField<
    K extends keyof MediaMetadataValues,
  >(
    key: K,
    value:
      MediaMetadataValues[K]
  ) {
    onChange({
      ...values,
      [key]: value,
    });
  }

  function toggleAllowedUse(
    use:
      MediaAllowedUse
  ) {
    const exists =
      values.allowedUses.includes(
        use
      );

    updateField(
      'allowedUses',
      exists
        ? values.allowedUses.filter(
            (
              item
            ) =>
              item !== use
          )
        : [
            ...values.allowedUses,
            use,
          ]
    );
  }

  return (
    <div
      className="
        space-y-6
      "
    >
      {/* ================================================= */}
      {/* CORE METADATA */}
      {/* ================================================= */}

      <FormSection
        title="Core metadata"
        description="Information editors and readers use to understand the asset."
      >
        <FormField
          label="Title"
        >
          <input
            value={
              values.title
            }
            onChange={(
              event
            ) =>
              updateField(
                'title',
                event.target
                  .value
              )
            }
            disabled={
              disabled
            }
            placeholder="Internal asset title"
            className={
              inputClassName
            }
          />
        </FormField>

        <FormField
          label="Alt text"
          description="Describe the image meaningfully for accessibility. Leave empty only when the asset is decorative."
        >
          <textarea
            value={
              values.altText
            }
            onChange={(
              event
            ) =>
              updateField(
                'altText',
                event.target
                  .value
              )
            }
            disabled={
              disabled ||
              values.decorative
            }
            placeholder="Describe what is visible and relevant in the image"
            rows={3}
            className={
              textareaClassName
            }
          />
        </FormField>

        <FormField
          label="Caption"
        >
          <textarea
            value={
              values.caption
            }
            onChange={(
              event
            ) =>
              updateField(
                'caption',
                event.target
                  .value
              )
            }
            disabled={
              disabled
            }
            placeholder="Public-facing caption"
            rows={3}
            className={
              textareaClassName
            }
          />
        </FormField>

        <FormField
          label="Description"
        >
          <textarea
            value={
              values.description
            }
            onChange={(
              event
            ) =>
              updateField(
                'description',
                event.target
                  .value
              )
            }
            disabled={
              disabled
            }
            placeholder="Longer newsroom description or context"
            rows={4}
            className={
              textareaClassName
            }
          />
        </FormField>

        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <ToggleField
            checked={
              values.displayCaption
            }
            onChange={(
              checked
            ) =>
              updateField(
                'displayCaption',
                checked
              )
            }
            disabled={
              disabled
            }
            label="Display caption"
          />

          <ToggleField
            checked={
              values.displayCredit
            }
            onChange={(
              checked
            ) =>
              updateField(
                'displayCredit',
                checked
              )
            }
            disabled={
              disabled
            }
            label="Display credit"
          />

          <ToggleField
            checked={
              values.decorative
            }
            onChange={(
              checked
            ) =>
              updateField(
                'decorative',
                checked
              )
            }
            disabled={
              disabled
            }
            label="Decorative asset"
          />
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* CREATOR + SOURCE */}
      {/* ================================================= */}

      <FormSection
        title="Creator & source"
        description="Track who made the asset and where it came from."
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Photographer"
          >
            <input
              value={
                values.photographer
              }
              onChange={(
                event
              ) =>
                updateField(
                  'photographer',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Photographer"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Creator"
          >
            <input
              value={
                values.creatorName
              }
              onChange={(
                event
              ) =>
                updateField(
                  'creatorName',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Creator, designer, producer..."
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Credit"
          >
            <input
              value={
                values.credit
              }
              onChange={(
                event
              ) =>
                updateField(
                  'credit',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Photo: Name / West Island Times"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Copyright holder"
          >
            <input
              value={
                values.copyrightHolder
              }
              onChange={(
                event
              ) =>
                updateField(
                  'copyrightHolder',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Rights holder"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Source"
          >
            <input
              value={
                values.sourceName
              }
              onChange={(
                event
              ) =>
                updateField(
                  'sourceName',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Archive, agency, institution..."
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Source URL"
          >
            <input
              type="url"
              value={
                values.sourceUrl
              }
              onChange={(
                event
              ) =>
                updateField(
                  'sourceUrl',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="https://..."
              className={
                inputClassName
              }
            />
          </FormField>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* RIGHTS */}
      {/* ================================================= */}

      <FormSection
        title="Rights & licensing"
        description="Control where an asset may be reused and when rights expire."
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Rights status"
          >
            <select
              value={
                values.rightsStatus
              }
              onChange={(
                event
              ) =>
                updateField(
                  'rightsStatus',
                  event.target
                    .value as MediaRightsStatus
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            >
              {RIGHTS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FormField>

          <FormField
            label="License name"
          >
            <input
              value={
                values.licenseName
              }
              onChange={(
                event
              ) =>
                updateField(
                  'licenseName',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="License or agreement"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="License expires"
          >
            <input
              type="datetime-local"
              value={
                values.licenseExpiresAt
              }
              onChange={(
                event
              ) =>
                updateField(
                  'licenseExpiresAt',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Embargo until"
          >
            <input
              type="datetime-local"
              value={
                values.embargoUntil
              }
              onChange={(
                event
              ) =>
                updateField(
                  'embargoUntil',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            />
          </FormField>
        </div>

        <FormField
          label="Allowed uses"
        >
          <div
            className="
              grid
              gap-2
              sm:grid-cols-2
            "
          >
            {ALLOWED_USE_OPTIONS.map(
              (
                option
              ) => (
                <label
                  key={
                    option.value
                  }
                  className="
                    flex
                    cursor-pointer
                    items-center
                    gap-2
                    rounded-lg
                    border
                    border-border
                    bg-white
                    px-3
                    py-2.5
                    text-sm
                    text-foreground
                  "
                >
                  <input
                    type="checkbox"
                    checked={values.allowedUses.includes(
                      option.value
                    )}
                    onChange={() =>
                      toggleAllowedUse(
                        option.value
                      )
                    }
                    disabled={
                      disabled
                    }
                  />

                  {
                    option.label
                  }
                </label>
              )
            )}
          </div>
        </FormField>

        <FormField
          label="Restrictions"
          description="One restriction per line."
        >
          <textarea
            value={values.restrictions.join(
              '\n'
            )}
            onChange={(
              event
            ) =>
              updateField(
                'restrictions',
                event.target.value
                  .split('\n')
                  .map(
                    (
                      value
                    ) =>
                      value.trim()
                  )
                  .filter(
                    Boolean
                  )
              )
            }
            disabled={
              disabled
            }
            placeholder="No social use&#10;One-time publication only"
            rows={4}
            className={
              textareaClassName
            }
          />
        </FormField>

        <FormField
          label="Rights notes"
        >
          <textarea
            value={
              values.rightsNotes
            }
            onChange={(
              event
            ) =>
              updateField(
                'rightsNotes',
                event.target
                  .value
              )
            }
            disabled={
              disabled
            }
            placeholder="Agreement details, attribution requirements, restrictions..."
            rows={4}
            className={
              textareaClassName
            }
          />
        </FormField>
      </FormSection>

      {/* ================================================= */}
      {/* DATE + ARCHIVE */}
      {/* ================================================= */}

      <FormSection
        title="Date & archive"
        description="Useful for historical photographs, archival documents, and time-sensitive material."
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Date created"
          >
            <input
              type="date"
              value={
                values.dateCreated
              }
              onChange={(
                event
              ) =>
                updateField(
                  'dateCreated',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Approximate date"
          >
            <input
              value={
                values.approximateDate
              }
              onChange={(
                event
              ) =>
                updateField(
                  'approximateDate',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="c. 1950s, late 1980s..."
              className={
                inputClassName
              }
            />
          </FormField>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* LOCATION */}
      {/* ================================================= */}

      <FormSection
        title="Location"
        description="Geographic metadata for reporting, Maps, archive discovery, and future location search."
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Island / scope"
          >
            <select
              value={
                values.island
              }
              onChange={(
                event
              ) =>
                updateField(
                  'island',
                  event.target
                    .value as
                    | IslandScope
                    | ''
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            >
              {ISLAND_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value ||
                      'none-selected'
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FormField>

          <FormField
            label="Location name"
          >
            <input
              value={
                values.locationName
              }
              onChange={(
                event
              ) =>
                updateField(
                  'locationName',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Spratt Bight, Morgan's Cave..."
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Country"
          >
            <input
              value={
                values.country
              }
              onChange={(
                event
              ) =>
                updateField(
                  'country',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Colombia"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Region"
          >
            <input
              value={
                values.region
              }
              onChange={(
                event
              ) =>
                updateField(
                  'region',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Archipelago of San Andrés..."
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="City"
          >
            <input
              value={
                values.city
              }
              onChange={(
                event
              ) =>
                updateField(
                  'city',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="City or settlement"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Neighborhood"
          >
            <input
              value={
                values.neighborhood
              }
              onChange={(
                event
              ) =>
                updateField(
                  'neighborhood',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Neighborhood or sector"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Latitude"
          >
            <input
              inputMode="decimal"
              value={
                values.latitude
              }
              onChange={(
                event
              ) =>
                updateField(
                  'latitude',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="12.5847"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Longitude"
          >
            <input
              inputMode="decimal"
              value={
                values.longitude
              }
              onChange={(
                event
              ) =>
                updateField(
                  'longitude',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="-81.7006"
              className={
                inputClassName
              }
            />
          </FormField>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* CLASSIFICATION */}
      {/* ================================================= */}

      <FormSection
        title="Classification"
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Language"
          >
            <select
              value={
                values.language
              }
              onChange={(
                event
              ) =>
                updateField(
                  'language',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            >
              <option value="">
                Not specified
              </option>

              <option value="en">
                English
              </option>

              <option value="es">
                Spanish
              </option>
            </select>
          </FormField>

          <FormField
            label="Category"
            description="This will become a taxonomy picker once category data is wired into the Media Library."
          >
            <input
              value={
                values.categoryId
              }
              onChange={(
                event
              ) =>
                updateField(
                  'categoryId',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="Category ID"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Sensitivity"
          >
            <select
              value={
                values.sensitiveLevel
              }
              onChange={(
                event
              ) =>
                updateField(
                  'sensitiveLevel',
                  event.target
                    .value as MediaSensitiveLevel
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            >
              {SENSITIVE_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FormField>

          <FormField
            label="Workflow status"
          >
            <select
              value={
                values.status
              }
              onChange={(
                event
              ) =>
                updateField(
                  'status',
                  event.target
                    .value as MediaStatus
                )
              }
              disabled={
                disabled
              }
              className={
                inputClassName
              }
            >
              {STATUS_OPTIONS.map(
                (
                  option
                ) => (
                  <option
                    key={
                      option.value
                    }
                    value={
                      option.value
                    }
                  >
                    {
                      option.label
                    }
                  </option>
                )
              )}
            </select>
          </FormField>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* FOCAL POINT */}
      {/* ================================================= */}

      <FormSection
        title="Image presentation"
        description="Focal point values are percentages from 0 to 100 and will later connect to interactive crop controls."
      >
        <div
          className="
            grid
            gap-4
            sm:grid-cols-2
          "
        >
          <FormField
            label="Focal point X"
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={
                values.focalPointX
              }
              onChange={(
                event
              ) =>
                updateField(
                  'focalPointX',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="50"
              className={
                inputClassName
              }
            />
          </FormField>

          <FormField
            label="Focal point Y"
          >
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={
                values.focalPointY
              }
              onChange={(
                event
              ) =>
                updateField(
                  'focalPointY',
                  event.target
                    .value
                )
              }
              disabled={
                disabled
              }
              placeholder="50"
              className={
                inputClassName
              }
            />
          </FormField>
        </div>
      </FormSection>

      {/* ================================================= */}
      {/* INTERNAL */}
      {/* ================================================= */}

      <FormSection
        title="Internal newsroom notes"
        description="Never intended for public display."
      >
        <FormField
          label="Internal notes"
        >
          <textarea
            value={
              values.internalNotes
            }
            onChange={(
              event
            ) =>
              updateField(
                'internalNotes',
                event.target
                  .value
              )
            }
            disabled={
              disabled
            }
            placeholder="Editing notes, rights reminders, provenance, verification information..."
            rows={5}
            className={
              textareaClassName
            }
          />
        </FormField>
      </FormSection>
    </div>
  );
}

/* ========================================================= */
/* UI HELPERS */
/* ========================================================= */

function FormSection({
  title,
  description,
  children,
}: {
  title: string;

  description?: string;

  children:
    React.ReactNode;
}) {
  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
        border-border
        bg-white
      "
    >
      <div
        className="
          border-b
          border-border
          px-4
          py-3
        "
      >
        <h3
          className="
            text-sm
            font-bold
            text-foreground
          "
        >
          {title}
        </h3>

        {description && (
          <p
            className="
              mt-1
              text-xs
              leading-5
              text-muted-foreground
            "
          >
            {
              description
            }
          </p>
        )}
      </div>

      <div
        className="
          space-y-4
          p-4
        "
      >
        {children}
      </div>
    </section>
  );
}

function FormField({
  label,
  description,
  children,
}: {
  label: string;

  description?: string;

  children:
    React.ReactNode;
}) {
  return (
    <label
      className="
        block
      "
    >
      <span
        className="
          block
          text-xs
          font-bold
          text-foreground
        "
      >
        {label}
      </span>

      {description && (
        <span
          className="
            mt-1
            block
            text-[11px]
            leading-5
            text-muted-foreground
          "
        >
          {
            description
          }
        </span>
      )}

      <div
        className="
          mt-1.5
        "
      >
        {children}
      </div>
    </label>
  );
}

function ToggleField({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;

  onChange: (
    checked: boolean
  ) => void;

  disabled?: boolean;

  label: string;
}) {
  return (
    <label
      className="
        flex
        cursor-pointer
        items-center
        gap-2
        rounded-lg
        border
        border-border
        bg-white
        px-3
        py-2.5
        text-sm
        font-medium
        text-foreground
      "
    >
      <input
        type="checkbox"
        checked={
          checked
        }
        onChange={(
          event
        ) =>
          onChange(
            event.target
              .checked
          )
        }
        disabled={
          disabled
        }
      />

      {label}
    </label>
  );
}

/* ========================================================= */
/* DATE HELPERS */
/* ========================================================= */

function toDateInput(
  value:
    | string
    | null
): string {
  if (!value) {
    return '';
  }

  return value.slice(
    0,
    10
  );
}

function toDateTimeLocal(
  value:
    | string
    | null
): string {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const localOffset =
    date.getTimezoneOffset() *
    60 *
    1000;

  return new Date(
    date.getTime() -
      localOffset
  )
    .toISOString()
    .slice(
      0,
      16
    );
}

/* ========================================================= */
/* STYLES */
/* ========================================================= */

const inputClassName = `
  h-10
  w-full
  rounded-lg
  border
  border-border
  bg-white
  px-3
  text-sm
  text-foreground
  outline-none
  transition
  placeholder:text-muted-foreground
  focus:border-primary
  focus:ring-2
  focus:ring-primary/10
  disabled:cursor-not-allowed
  disabled:bg-surface-muted
  disabled:opacity-70
`;

const textareaClassName = `
  w-full
  resize-y
  rounded-lg
  border
  border-border
  bg-white
  px-3
  py-2
  text-sm
  leading-6
  text-foreground
  outline-none
  transition
  placeholder:text-muted-foreground
  focus:border-primary
  focus:ring-2
  focus:ring-primary/10
  disabled:cursor-not-allowed
  disabled:bg-surface-muted
  disabled:opacity-70
`;