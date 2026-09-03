import Image from 'next/image';

import {
  ArrowRight,
  Radio,
} from 'lucide-react';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  BreakingNewsItem,
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  HomeStory,
} from '@/lib/services/home';

import type {
  Locale,
} from '@/types';

import {
  BreakingNewsBar,
} from './home/BreakingNewsBar';

import {
  buildLeadNewsGridPlan,
  getLeadNewsGridStoryIds,
  LeadNewsGrid,
} from './home/LeadNewsGrid';

import {
  LatestNewsRail,
} from './home/LatestNewsRail';

import {
  AcrossTheIslands,
} from './home/AcrossTheIslands';

import {
  WatchLiveBlock,
} from './home/WatchLiveBlock';

import {
  ShortsBlock,
} from './home/ShortsBlock';

import {
  RadioBlock,
} from './home/RadioBlock';

import {
  PodcastBlock,
} from './home/PodcastBlock';

interface HomePageProps {
  dict: Dictionary;
  locale: Locale;

  placements: HomepagePlacement[];

  breakingNews: BreakingNewsItem[];

  latestStories: FrontPageStoryOption[];

  worldStories?: FrontPageStoryOption[];

  acrossTheIslands: {
    sanAndres: HomeStory[];
    oldProvidence: HomeStory[];
    saintCatalina: HomeStory[];
  };
}

function getPlacement(
  placements: HomepagePlacement[],
  slot: HomepagePlacement['slot'],
  position = 0
) {
  return (
    placements.find(
      (placement) =>
        placement.slot === slot &&
        placement.position === position
    ) ?? null
  );
}

function getCategoryName(
  locale: Locale,
  placement: HomepagePlacement
) {
  const category =
    placement.story.primaryCategory;

  if (!category) {
    return null;
  }

  return locale === 'es'
    ? category.nameEs
    : category.nameEn;
}

function StoryImage({
  placement,
  className = '',
}: {
  placement: HomepagePlacement;
  className?: string;
}) {
  const image =
    placement.story.featuredImage;

  if (!image) {
    return (
      <div
        className={`
          bg-surface-subtle
          ${className}
        `}
        aria-hidden
      />
    );
  }

  return (
    <div
      className={`
        relative
        overflow-hidden
        rounded-md
        bg-surface-subtle
        ${className}
      `}
    >
      <Image
        src={image.url}
        alt={
          image.altText ||
          placement.story.headline
        }
        fill
        className="object-cover"
        sizes="
          (max-width: 768px) 100vw,
          (max-width: 1280px) 50vw,
          600px
        "
      />
    </div>
  );
}

function EditorsPickStory({
  locale,
  placement,
}: {
  locale: Locale;
  placement: HomepagePlacement | null;
}) {
  if (!placement) {
    return (
      <article
        className="
          min-h-[150px]
          border-t
          border-border
          pt-4
        "
      >
        <p
          className="
            text-sm
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Historia no configurada'
            : 'Story not configured'}
        </p>
      </article>
    );
  }

  const category =
    getCategoryName(
      locale,
      placement
    );

  return (
    <article
      className="
        group
        border-t
        border-border
        pt-4
      "
    >
      <StoryImage
        placement={placement}
        className="
          mb-3
          aspect-[16/10]
          w-full
        "
      />

      {category && (
        <p
          className="
            text-[10px]
            font-black
            uppercase
            tracking-[0.13em]
            text-breaking
          "
        >
          {category}
        </p>
      )}

      <h3
        className="
          mt-1.5
          font-headline
          text-lg
          font-bold
          leading-[1.15]
          tracking-[-0.015em]
          text-black
        "
      >
        {
          placement.story.headline
        }
      </h3>
    </article>
  );
}

function FeaturedStory({
  locale,
  placement,
  label,
}: {
  locale: Locale;
  placement: HomepagePlacement | null;
  label: string;
}) {
  return (
    <div>
      <div
        className="
          mb-4
          border-b-2
          border-deep
          pb-2
        "
      >
        <h2
          className="
            font-headline
            text-2xl
            font-bold
            tracking-[-0.02em]
            text-black
          "
        >
          {label}
        </h2>
      </div>

      {placement ? (
        <article className="group">
          <StoryImage
            placement={placement}
            className="
              aspect-[16/9]
              w-full
            "
          />

          <div className="pt-3">
            {getCategoryName(
              locale,
              placement
            ) && (
              <p
                className="
                  text-[10px]
                  font-black
                  uppercase
                  tracking-[0.13em]
                  text-breaking
                "
              >
                {getCategoryName(
                  locale,
                  placement
                )}
              </p>
            )}

            <h3
              className="
                mt-1.5
                font-headline
                text-xl
                font-bold
                leading-[1.12]
                tracking-[-0.02em]
                text-black
                sm:text-2xl
              "
            >
              {
                placement.story.headline
              }
            </h3>
          </div>
        </article>
      ) : (
        <div
          className="
            flex
            min-h-[220px]
            items-center
            justify-center
            bg-surface-subtle
            px-5
            text-center
            text-sm
            text-muted-foreground
          "
        >
          {locale === 'es'
            ? 'Historia no configurada'
            : 'Story not configured'}
        </div>
      )}
    </div>
  );
}

export function HomePage({
  dict,
  locale,
  placements,
  breakingNews,
}: HomePageProps) {
  const uniqueBreakingNews =
    breakingNews.filter(
      (item, index, items) =>
        !item.storyId ||
        items.findIndex(
          (candidate) =>
            candidate.storyId ===
            item.storyId
        ) === index
    );

  const breakingStoryIds =
    new Set(
      uniqueBreakingNews
        .map(
          (item) =>
            item.storyId
        )
        .filter(
          (
            id
          ): id is string =>
            Boolean(id)
        )
    );

  const rawLead =
    getPlacement(
      placements,
      'lead'
    );

  const rawTopLeft =
    getPlacement(
      placements,
      'top_left'
    );

  const rawTopRight =
    getPlacement(
      placements,
      'top_right'
    );

  const rawSecondary =
    [0, 1, 2].map(
      (position) =>
        getPlacement(
          placements,
          'secondary',
          position
        )
    );

  const leadNewsPlan =
    buildLeadNewsGridPlan({
      lead: rawLead,
      topLeft: rawTopLeft,
      topRight: rawTopRight,
      secondary:
        rawSecondary,
      leadSupport: [
        getPlacement(
          placements,
          'lead_support'
        ),
      ],
      moreCoverage:
        [0, 1, 2].map(
          (position) =>
            getPlacement(
              placements,
              'more_coverage',
              position
            )
        ),
      highlight:
        getPlacement(
          placements,
          'highlight'
        ),
      world:
        [0, 1].map(
          (position) =>
            getPlacement(
              placements,
              'world',
              position
            )
        ),
      excludedStoryIds:
        breakingStoryIds,
    });

  const usedStoryIds =
    new Set([
      ...Array.from(
        breakingStoryIds
      ),
      ...getLeadNewsGridStoryIds(
        leadNewsPlan
      ),
    ]);

  function claimPlacement(
    placement: HomepagePlacement | null
  ) {
    if (
      !placement ||
      usedStoryIds.has(
        placement.story.id
      )
    ) {
      return null;
    }

    usedStoryIds.add(
      placement.story.id
    );

    return placement;
  }

  const editorsPicks =
    [0, 1, 2].map(
      (position) =>
        claimPlacement(
          getPlacement(
            placements,
            'editors_pick',
            position
          )
        )
    );

  const latestFeature =
    claimPlacement(
    getPlacement(
      placements,
      'latest_feature'
    ));

  const videoFeature =
    claimPlacement(
    getPlacement(
      placements,
      'video_feature'
    ));

  const sectionFeatures =
    placements
      .filter(
        (placement) =>
          placement.slot ===
          'section_feature'
      )
      .sort(
        (a, b) =>
          a.position -
          b.position
      )
      .map(
        (placement) =>
          claimPlacement(
            placement
          )
      )
      .filter(
        (
          placement
        ): placement is HomepagePlacement =>
          placement !== null
      );

  const latestNewsStories =
    [0, 1, 2, 3, 4, 5, 6, 7]
      .map((position) =>
        claimPlacement(
          getPlacement(
            placements,
            'latest_news',
            position
          )
        )
      )
      .filter(
        (
          placement
        ): placement is HomepagePlacement =>
          placement !== null
      )
      .map(
        (placement) =>
          placement.story
      );

  const islandStories =
    [
      ...Array.from(
        { length: 12 },
        (_, position) =>
          claimPlacement(
            getPlacement(
              placements,
              'island_feature',
              position
            )
          )
      ),
    ];

  function islandSlice(
    start: number
  ) {
    return islandStories
      .slice(start, start + 4)
      .filter(
        (
          placement
        ): placement is HomepagePlacement =>
          placement !== null
      )
      .map(
        (placement) => ({
          ...placement.story,
          summary: null,
        })
      );
  }

  const uniqueAcrossTheIslands = {
    sanAndres: islandSlice(0),
    oldProvidence: islandSlice(4),
    saintCatalina: islandSlice(8),
  };

  return (
    <div className="bg-white">
      

      {/* ======================================================= */}
      {/* BREAKING NEWS */}
      {/* ======================================================= */}

      <BreakingNewsBar
        locale={locale}
        items={
          uniqueBreakingNews
        }
      />

      {/* ======================================================= */}
      {/* LEAD NEWS GRID */}
      {/* ======================================================= */}

      <LeadNewsGrid
        locale={locale}
        plan={leadNewsPlan}
      />

      {/* ======================================================= */}
      {/* LATEST NEWS */}
      {/* ======================================================= */}

      <LatestNewsRail
        locale={locale}
        stories={
          latestNewsStories
        }
        limit={8}
      />

      {/* ======================================================= */}
      {/* EDITORS' PICKS */}
      {/* ======================================================= */}

      <section
        className="
          border-b
          border-border
          bg-white
        "
      >
        <div
          className="
            container-wide
            py-7
            lg:py-8
          "
        >
          <div
            className="
              flex
              items-end
              justify-between
              border-b-2
              border-deep
              pb-2
            "
          >
            <div>
              <h2
                className="
                  font-headline
                  text-2xl
                  font-bold
                  tracking-[-0.02em]
                  text-black
                  sm:text-3xl
                "
              >
                {locale === 'es'
                  ? 'Selección editorial'
                  : "Editors' Picks"}
              </h2>
            </div>
          </div>

          <div
            className="
              mt-5
              grid
              gap-5
              md:grid-cols-3
            "
          >
            {editorsPicks.map(
              (
                placement,
                index
              ) => (
                <EditorsPickStory
                  key={index}
                  locale={locale}
                  placement={
                    placement
                  }
                />
              )
            )}
          </div>
        </div>
      </section>

      <PodcastBlock
  locale={locale}
/>

      {/* ======================================================= */}
{/* FEATURED CONTENT */}
{/* ======================================================= */}

<section
  className="
    border-b
    border-border
    bg-white
  "
>
  <div
    className="
      container-wide
      py-7
      lg:py-8
    "
  >
    <FeaturedStory
      locale={locale}
      placement={latestFeature}
      label={
        locale === 'es'
          ? 'Destacado'
          : 'Featured'
      }
    />
  </div>
</section>

{/* ======================================================= */}
{/* WATCH + LIVE */}
{/* ======================================================= */}

<WatchLiveBlock
  locale={locale}
  feature={videoFeature}
/>

<ShortsBlock
  locale={locale}
/>

      {/* ======================================================= */}
      {/* SECTION FEATURES */}
      {/* ======================================================= */}

      {sectionFeatures.length >
        0 && (
        <section
          className="
            border-b
            border-border
            bg-white
          "
        >
          <div
            className="
              container-wide
              py-7
              lg:py-8
            "
          >
            <div
              className="
                border-b-2
                border-deep
                pb-2
              "
            >
              <h2
                className="
                  font-headline
                  text-2xl
                  font-bold
                  tracking-[-0.02em]
                  text-black
                  sm:text-3xl
                "
              >
                {locale === 'es'
                  ? 'Secciones'
                  : 'Sections'}
              </h2>
            </div>

            <div
              className="
                mt-5
                grid
                gap-x-6
                gap-y-8
                md:grid-cols-2
                xl:grid-cols-3
              "
            >
              {sectionFeatures.map(
                (
                  placement
                ) => {
                  const category =
                    getCategoryName(
                      locale,
                      placement
                    );

                  return (
                    <article
                      key={
                        placement.id
                      }
                      className="
                        group
                        border-t
                        border-border
                        pt-4
                      "
                    >
                      <StoryImage
                        placement={
                          placement
                        }
                        className="
                          mb-3
                          aspect-[16/10]
                          w-full
                        "
                      />

                      {category && (
                        <p
                          className="
                            text-[10px]
                            font-black
                            uppercase
                            tracking-[0.13em]
                            text-breaking
                          "
                        >
                          {category}
                        </p>
                      )}

                      <h3
                        className="
                          mt-1.5
                          font-headline
                          text-lg
                          font-bold
                          leading-[1.15]
                          text-black
                        "
                      >
                        {
                          placement.story
                            .headline
                        }
                      </h3>
                    </article>
                  );
                }
              )}
            </div>
          </div>
        </section>
      )}

      {/* ======================================================= */}
      {/* ACROSS THE ISLANDS */}
      {/* Manually curated island story positions */}
      {/* ======================================================= */}

      <AcrossTheIslands
  locale={locale}
  sanAndres={
    uniqueAcrossTheIslands.sanAndres
  }
  oldProvidence={
    uniqueAcrossTheIslands.oldProvidence
  }
  saintCatalina={
    uniqueAcrossTheIslands.saintCatalina
  }
/>

      {/* ======================================================= */}
      {/* LISTEN / RADIO */}
      {/* ======================================================= */}

      <RadioBlock
  locale={locale}
/>


    </div>
  );
}
