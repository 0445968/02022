'use client';

import {
  useMemo,
  useState,
} from 'react';

import {
  useRouter,
} from 'next/navigation';

import type {
  Locale,
} from '@/types';

import type {
  Category,
} from '@/types/editorial';

import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import {
  HomepageSlotCard,
} from './HomepageSlotCard';

interface FrontPageEditorProps {
  locale: Locale;

  userId: string | null;

  placements: HomepagePlacement[];

  breakingNews: BreakingNewsItem[];

  stories: FrontPageStoryOption[];

  categories: Category[];
}

type FrontPageTab =
  | 'layout'
  | 'breaking';

export function FrontPageEditor({
  locale,
  userId,
  placements,
  breakingNews,
  stories,
  categories,
}: FrontPageEditorProps) {
  const router =
    useRouter();

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<FrontPageTab>(
      'layout'
    );

  const grouped =
    useMemo(
      () => ({
        lead:
          placements.filter(
            (item) =>
              item.slot ===
              'lead'
          ),

        topLeft:
          placements.filter(
            (item) =>
              item.slot ===
              'top_left'
          ),

        topRight:
          placements.filter(
            (item) =>
              item.slot ===
              'top_right'
          ),

        secondary:
          placements.filter(
            (item) =>
              item.slot ===
              'secondary'
          ),

        editorsPick:
          placements.filter(
            (item) =>
              item.slot ===
              'editors_pick'
          ),

        latestFeature:
          placements.filter(
            (item) =>
              item.slot ===
              'latest_feature'
          ),

        sectionFeature:
          placements.filter(
            (item) =>
              item.slot ===
              'section_feature'
          ),

        videoFeature:
          placements.filter(
            (item) =>
              item.slot ===
              'video_feature'
          ),
      }),
      [placements]
    );

  const activeBreakingCount =
    useMemo(
      () =>
        breakingNews.filter(
          (item) =>
            item.active
        ).length,
      [breakingNews]
    );

  function getPlacement(
    list: HomepagePlacement[],
    position = 0
  ) {
    return (
      list.find(
        (item) =>
          item.position ===
          position
      ) ?? null
    );
  }

  function handleChanged() {
    router.refresh();
  }

  return (
    <div className="mt-6">
      {/* Tabs */}
      <div
        className="
          flex
          flex-col
          gap-4
          border-b
          border-border
          pb-4
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div
          className="
            inline-flex
            w-fit
            items-center
            gap-1
            rounded-lg
            bg-surface-muted
            p-1
          "
        >
          <button
            type="button"
            onClick={() =>
              setActiveTab(
                'layout'
              )
            }
            className={`
              rounded-md
              px-4
              py-2
              text-sm
              font-semibold
              transition-colors
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring

              ${
                activeTab ===
                'layout'
                  ? 'bg-white text-deep shadow-sm'
                  : 'text-muted-foreground hover:text-deep'
              }
            `}
          >
            {locale === 'es'
              ? 'Diseño'
              : 'Layout'}
          </button>

          <button
            type="button"
            onClick={() =>
              setActiveTab(
                'breaking'
              )
            }
            className={`
              inline-flex
              items-center
              gap-2
              rounded-md
              px-4
              py-2
              text-sm
              font-semibold
              transition-colors
              focus-visible:outline-none
              focus-visible:ring-2
              focus-visible:ring-ring

              ${
                activeTab ===
                'breaking'
                  ? 'bg-white text-deep shadow-sm'
                  : 'text-muted-foreground hover:text-deep'
              }
            `}
          >
            {locale === 'es'
              ? 'Última hora'
              : 'Breaking News'}

            {activeBreakingCount >
              0 && (
              <span
                className="
                  inline-flex
                  min-w-5
                  items-center
                  justify-center
                  rounded-full
                  bg-breaking
                  px-1.5
                  py-0.5
                  text-[10px]
                  font-bold
                  leading-none
                  text-white
                "
              >
                {
                  activeBreakingCount
                }
              </span>
            )}
          </button>
        </div>

        <div
          className="
            flex
            items-center
            gap-2
            text-xs
            text-muted-foreground
          "
        >
          <span
            className="
              h-2
              w-2
              rounded-full
              bg-live
            "
          />

          <span>
            {locale === 'es'
              ? `${placements.length} posiciones configuradas`
              : `${placements.length} placements configured`}
          </span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* LAYOUT */}
      {/* ========================================================= */}

      {activeTab ===
        'layout' && (
        <div className="mt-6">
          <div
            className="
              grid
              gap-6
              xl:grid-cols-[minmax(0,1fr)_300px]
            "
          >
            <div className="min-w-0 space-y-8">
              {/* TOP STORIES */}

              <section>
                <SectionHeading
                  eyebrow={
                    locale === 'es'
                      ? 'Portada principal'
                      : 'Main Homepage'
                  }
                  title={
                    locale === 'es'
                      ? 'Historias principales'
                      : 'Top Stories'
                  }
                  description={
                    locale === 'es'
                      ? 'Controla las historias con mayor prominencia en la portada.'
                      : 'Control the stories receiving the most prominent homepage placement.'
                  }
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    lg:grid-cols-12
                  "
                >
                  <div className="lg:col-span-7">
                    <HomepageSlotCard
                      locale={
                        locale
                      }
                      slot="lead"
                      label={
                        locale ===
                        'es'
                          ? 'Historia principal'
                          : 'Lead Story'
                      }
                      description={
                        locale ===
                        'es'
                          ? 'La historia dominante de la portada.'
                          : 'The dominant story on the homepage.'
                      }
                      stories={
                        stories
                      }
                      placement={getPlacement(
                        grouped.lead
                      )}
                      position={0}
                      userId={
                        userId
                      }
                      onChanged={
                        handleChanged
                      }
                    />
                  </div>

                  <div
                    className="
                      grid
                      gap-4
                      lg:col-span-5
                    "
                  >
                    <HomepageSlotCard
                      locale={
                        locale
                      }
                      slot="top_left"
                      label={
                        locale ===
                        'es'
                          ? 'Superior izquierda'
                          : 'Top Left'
                      }
                      stories={
                        stories
                      }
                      placement={getPlacement(
                        grouped.topLeft
                      )}
                      position={0}
                      userId={
                        userId
                      }
                      onChanged={
                        handleChanged
                      }
                    />

                    <HomepageSlotCard
                      locale={
                        locale
                      }
                      slot="top_right"
                      label={
                        locale ===
                        'es'
                          ? 'Superior derecha'
                          : 'Top Right'
                      }
                      stories={
                        stories
                      }
                      placement={getPlacement(
                        grouped.topRight
                      )}
                      position={0}
                      userId={
                        userId
                      }
                      onChanged={
                        handleChanged
                      }
                    />
                  </div>
                </div>
              </section>

              {/* SECONDARY */}

              <section>
                <SectionHeading
                  title={
                    locale === 'es'
                      ? 'Historias secundarias'
                      : 'Secondary Stories'
                  }
                  description={
                    locale === 'es'
                      ? 'Cobertura adicional inmediatamente debajo de las historias principales.'
                      : 'Additional coverage displayed beneath the main stories.'
                  }
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    md:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {[0, 1, 2].map(
                    (
                      position
                    ) => (
                      <HomepageSlotCard
                        key={
                          position
                        }
                        locale={
                          locale
                        }
                        slot="secondary"
                        label={`${
                          locale ===
                          'es'
                            ? 'Secundaria'
                            : 'Secondary'
                        } ${
                          position +
                          1
                        }`}
                        stories={
                          stories
                        }
                        placement={getPlacement(
                          grouped.secondary,
                          position
                        )}
                        position={
                          position
                        }
                        userId={
                          userId
                        }
                        onChanged={
                          handleChanged
                        }
                      />
                    )
                  )}
                </div>
              </section>

              {/* EDITORS PICKS */}

              <section>
                <SectionHeading
                  title={
                    locale === 'es'
                      ? 'Selección editorial'
                      : "Editors' Picks"
                  }
                  description={
                    locale === 'es'
                      ? 'Historias seleccionadas manualmente por la redacción.'
                      : 'Stories manually recommended by the newsroom.'
                  }
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    md:grid-cols-2
                    xl:grid-cols-3
                  "
                >
                  {[0, 1, 2].map(
                    (
                      position
                    ) => (
                      <HomepageSlotCard
                        key={
                          position
                        }
                        locale={
                          locale
                        }
                        slot="editors_pick"
                        label={`${
                          locale ===
                          'es'
                            ? 'Selección'
                            : 'Pick'
                        } ${
                          position +
                          1
                        }`}
                        stories={
                          stories
                        }
                        placement={getPlacement(
                          grouped.editorsPick,
                          position
                        )}
                        position={
                          position
                        }
                        userId={
                          userId
                        }
                        onChanged={
                          handleChanged
                        }
                      />
                    )
                  )}
                </div>
              </section>

              {/* SPECIAL FEATURES */}

              <section>
                <SectionHeading
                  title={
                    locale === 'es'
                      ? 'Destacados'
                      : 'Featured Content'
                  }
                  description={
                    locale === 'es'
                      ? 'Contenido editorial con tratamiento especial en la portada.'
                      : 'Editorial content receiving special homepage treatment.'
                  }
                />

                <div
                  className="
                    mt-4
                    grid
                    gap-4
                    lg:grid-cols-2
                  "
                >
                  <HomepageSlotCard
                    locale={
                      locale
                    }
                    slot="latest_feature"
                    label={
                      locale ===
                      'es'
                        ? 'Destacado reciente'
                        : 'Latest Feature'
                    }
                    description={
                      locale ===
                      'es'
                        ? 'Una historia reciente que merece mayor visibilidad.'
                        : 'A recent story deserving additional visibility.'
                    }
                    stories={
                      stories
                    }
                    placement={getPlacement(
                      grouped.latestFeature
                    )}
                    position={0}
                    userId={
                      userId
                    }
                    onChanged={
                      handleChanged
                    }
                  />

                  <HomepageSlotCard
                    locale={
                      locale
                    }
                    slot="video_feature"
                    label={
                      locale ===
                      'es'
                        ? 'Video destacado'
                        : 'Video Feature'
                    }
                    description={
                      locale ===
                      'es'
                        ? 'La historia audiovisual principal de la portada.'
                        : 'The primary audiovisual feature on the homepage.'
                    }
                    stories={
                      stories
                    }
                    placement={getPlacement(
                      grouped.videoFeature
                    )}
                    position={0}
                    userId={
                      userId
                    }
                    onChanged={
                      handleChanged
                    }
                  />
                </div>
              </section>

              {/* SECTION FEATURES */}

              <section>
                <SectionHeading
                  title={
                    locale === 'es'
                      ? 'Secciones destacadas'
                      : 'Section Features'
                  }
                  description={
                    locale === 'es'
                      ? 'Destacados asociados a categorías específicas.'
                      : 'Featured stories associated with specific editorial sections.'
                  }
                />

                <div
                  className="
                    mt-4
                    rounded-xl
                    border
                    border-border
                    bg-white
                    p-5
                  "
                >
                  {grouped
                    .sectionFeature
                    .length >
                  0 ? (
                    <div
                      className="
                        grid
                        gap-4
                        md:grid-cols-2
                      "
                    >
                      {grouped.sectionFeature.map(
                        (
                          placement
                        ) => {
                          const category =
                            categories.find(
                              (
                                category
                              ) =>
                                category.id ===
                                placement.categoryId
                            );

                          return (
                            <div
                              key={
                                placement.id
                              }
                              className="
                                rounded-xl
                                border
                                border-border
                                p-4
                              "
                            >
                              <p
                                className="
                                  text-[10px]
                                  font-semibold
                                  uppercase
                                  tracking-[0.15em]
                                  text-primary
                                "
                              >
                                {category
                                  ? locale ===
                                    'es'
                                    ? category.nameEs
                                    : category.nameEn
                                  : locale ===
                                      'es'
                                    ? 'Sección'
                                    : 'Section'}
                              </p>

                              <h3
                                className="
                                  mt-2
                                  font-headline
                                  text-base
                                  font-bold
                                  leading-5
                                  text-deep
                                "
                              >
                                {
                                  placement
                                    .story
                                    .headline
                                }
                              </h3>
                            </div>
                          );
                        }
                      )}
                    </div>
                  ) : (
                    <div
                      className="
                        rounded-lg
                        border
                        border-dashed
                        border-border
                        px-5
                        py-8
                        text-center
                      "
                    >
                      <p
                        className="
                          text-sm
                          font-semibold
                          text-deep
                        "
                      >
                        {locale === 'es'
                          ? 'No hay secciones destacadas'
                          : 'No section features yet'}
                      </p>

                      <p
                        className="
                          mt-1
                          text-xs
                          text-muted-foreground
                        "
                      >
                        {locale === 'es'
                          ? 'Agregaremos el editor de secciones en el siguiente paso.'
                          : 'We’ll add the section-feature editor next.'}
                      </p>
                    </div>
                  )}
                </div>
              </section>
            </div>

            {/* SIDEBAR */}

            <aside
              className="
                h-fit
                rounded-xl
                border
                border-border
                bg-white
                xl:sticky
                xl:top-6
              "
            >
              <div
                className="
                  border-b
                  border-border
                  px-5
                  py-4
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    uppercase
                    tracking-[0.16em]
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Estado'
                    : 'Status'}
                </p>

                <h2
                  className="
                    mt-1
                    font-headline
                    text-lg
                    font-bold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'Portada'
                    : 'Front Page'}
                </h2>
              </div>

              <div className="space-y-5 p-5">
                <StatRow
                  label={
                    locale === 'es'
                      ? 'Historias disponibles'
                      : 'Available stories'
                  }
                  value={
                    stories.length
                  }
                />

                <StatRow
                  label={
                    locale === 'es'
                      ? 'Posiciones configuradas'
                      : 'Configured placements'
                  }
                  value={
                    placements.length
                  }
                />

                <StatRow
                  label={
                    locale === 'es'
                      ? 'Alertas activas'
                      : 'Active breaking alerts'
                  }
                  value={
                    activeBreakingCount
                  }
                />

                <div
                  className="
                    border-t
                    border-border
                    pt-5
                  "
                >
                  <p
                    className="
                      text-xs
                      leading-5
                      text-muted-foreground
                    "
                  >
                    {locale === 'es'
                      ? 'Los cambios guardados aquí serán utilizados por la portada pública cuando conectemos el nuevo diseño.'
                      : 'Changes saved here will power the public homepage once the new front-page design is connected.'}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* BREAKING NEWS */}
      {/* ========================================================= */}

      {activeTab ===
        'breaking' && (
        <div className="mt-6">
          <section
            className="
              rounded-xl
              border
              border-border
              bg-white
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                border-b
                border-border
                px-5
                py-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div>
                <h2
                  className="
                    font-headline
                    text-lg
                    font-bold
                    text-deep
                  "
                >
                  {locale === 'es'
                    ? 'Alertas de última hora'
                    : 'Breaking News Alerts'}
                </h2>

                <p
                  className="
                    mt-1
                    text-sm
                    text-muted-foreground
                  "
                >
                  {locale === 'es'
                    ? 'Administra las alertas que aparecen sobre la portada.'
                    : 'Manage alerts appearing above the homepage.'}
                </p>
              </div>

              <span
                className="
                  inline-flex
                  items-center
                  gap-2
                  text-xs
                  font-medium
                  text-muted-foreground
                "
              >
                <span
                  className="
                    h-2
                    w-2
                    rounded-full
                    bg-breaking
                  "
                />

                {
                  activeBreakingCount
                }{' '}
                {locale === 'es'
                  ? 'activas'
                  : 'active'}
              </span>
            </div>

            <div className="p-5">
              {breakingNews.length >
              0 ? (
                <div className="space-y-3">
                  {breakingNews.map(
                    (
                      item
                    ) => (
                      <article
                        key={
                          item.id
                        }
                        className="
                          rounded-xl
                          border
                          border-border
                          p-4
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            gap-3
                          "
                        >
                          <span
                            className={`
                              mt-1.5
                              h-2
                              w-2
                              shrink-0
                              rounded-full

                              ${
                                item.active
                                  ? 'bg-breaking'
                                  : 'bg-muted-foreground/30'
                              }
                            `}
                          />

                          <div className="min-w-0">
                            <h3
                              className="
                                font-semibold
                                leading-6
                                text-deep
                              "
                            >
                              {
                                item.headline
                              }
                            </h3>

                            <div
                              className="
                                mt-2
                                flex
                                flex-wrap
                                gap-3
                                text-xs
                                text-muted-foreground
                              "
                            >
                              <span>
                                {item.active
                                  ? locale ===
                                    'es'
                                    ? 'Activa'
                                    : 'Active'
                                  : locale ===
                                      'es'
                                    ? 'Inactiva'
                                    : 'Inactive'}
                              </span>

                              {item.story && (
                                <span>
                                  {locale ===
                                  'es'
                                    ? 'Historia vinculada'
                                    : 'Linked story'}
                                </span>
                              )}

                              {item.externalUrl && (
                                <span>
                                  {locale ===
                                  'es'
                                    ? 'Enlace externo'
                                    : 'External link'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </article>
                    )
                  )}
                </div>
              ) : (
                <div
                  className="
                    rounded-lg
                    border
                    border-dashed
                    border-border
                    px-5
                    py-10
                    text-center
                  "
                >
                  <p
                    className="
                      font-semibold
                      text-deep
                    "
                  >
                    {locale === 'es'
                      ? 'No hay alertas configuradas'
                      : 'No breaking alerts configured'}
                  </p>

                  <p
                    className="
                      mt-1
                      text-sm
                      text-muted-foreground
                    "
                  >
                    {locale === 'es'
                      ? 'El editor de alertas será el siguiente componente.'
                      : 'The breaking-news editor is the next component.'}
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      {eyebrow && (
        <p
          className="
            text-[10px]
            font-semibold
            uppercase
            tracking-[0.18em]
            text-muted-foreground
          "
        >
          {eyebrow}
        </p>
      )}

      <h2
        className="
          mt-1
          font-headline
          text-xl
          font-bold
          text-deep
        "
      >
        {title}
      </h2>

      {description && (
        <p
          className="
            mt-1
            max-w-2xl
            text-sm
            leading-6
            text-muted-foreground
          "
        >
          {description}
        </p>
      )}
    </div>
  );
}

function StatRow({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-4
      "
    >
      <span
        className="
          text-xs
          text-muted-foreground
        "
      >
        {label}
      </span>

      <span
        className="
          font-headline
          text-lg
          font-bold
          text-deep
        "
      >
        {value}
      </span>
    </div>
  );
}