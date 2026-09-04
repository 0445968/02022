import type {
  FrontPageStoryOption,
  HomepagePlacement,
} from '@/lib/services/front-page';

import type {
  Locale,
} from '@/types';

import {
  getStory,
  type StorySource,
} from './LeadNewsGridShared';

import {
  TopStoriesColumn,
} from './TopStoriesColumn';

import {
  LeadStoryColumn,
} from './LeadStoryColumn';

import {
  HighlightsColumn,
} from './HighlightsColumn';

/* ========================================================= */
/* TYPES */
/* ========================================================= */

interface LeadNewsGridProps {
  locale: Locale;
  plan: LeadNewsGridPlan;
}

export interface LeadNewsGridPlan {
  mainStory:
    | StorySource
    | null;

  moreTopFeature:
    | StorySource
    | null;

  moreTopText:
    Array<
      StorySource | null
    >;

  featuredSupport:
    Array<
      StorySource | null
    >;

  moreCoverage:
    Array<
      StorySource | null
    >;

  highlightsStory:
    | StorySource
    | null;

  worldStories:
    StorySource[];
}

interface BuildLeadNewsGridPlanInput {
  lead:
    | HomepagePlacement
    | null;

  topLeft:
    | HomepagePlacement
    | null;

  topRight:
    | HomepagePlacement
    | null;

  secondary:
    Array<
      HomepagePlacement | null
    >;

  leadSupport?:
    Array<
      HomepagePlacement | null
    >;

  moreCoverage?:
    Array<
      HomepagePlacement | null
    >;

  highlight?:
    | HomepagePlacement
    | null;

  world?:
    Array<
      HomepagePlacement | null
    >;

  excludedStoryIds?:
    Iterable<string>;
}

/* ========================================================= */
/* BUILD GRID PLAN */
/* ========================================================= */

export function buildLeadNewsGridPlan({
  lead,
  topLeft,
  topRight,
  secondary,
  leadSupport = [],
  moreCoverage = [],
  highlight = null,
  world = [],
  excludedStoryIds = [],
}: BuildLeadNewsGridPlanInput): LeadNewsGridPlan {
  const usedStoryIds =
    new Set<string>(
      excludedStoryIds
    );

  function claim(
    source:
      | StorySource
      | null
      | undefined
  ): StorySource | null {
    if (!source) {
      return null;
    }

    const id =
      getStory(
        source
      ).id;

    if (
      usedStoryIds.has(
        id
      )
    ) {
      return null;
    }

    usedStoryIds.add(
      id
    );

    return source;
  }

  /* ======================================================= */
  /* MAIN LEAD STORY */
  /* ======================================================= */

  const mainStory =
    claim(
      lead
    );

  /* ======================================================= */
  /* LEFT — TOP STORIES */
  /* ======================================================= */

  const moreTopFeature =
    claim(
      topLeft
    );

  const moreTopText =
    [
      0,
      1,
      2,
      3,
      4,
      5,
      6,
    ].map(
      (position) =>
        claim(
          secondary[
            position
          ]
        )
    );

  /* ======================================================= */
  /* CENTER — SUPPORTING STORIES */
  /* ======================================================= */

  const featuredSupport =
    [
      claim(
        topRight
      ),

      claim(
        leadSupport[0]
      ),
    ];

  const plannedMoreCoverage =
    [
      0,
      1,
      2,
    ].map(
      (position) =>
        claim(
          moreCoverage[
            position
          ]
        )
    );

  /* ======================================================= */
  /* RIGHT — HIGHLIGHTS */
  /* ======================================================= */

  const highlightsStory =
    claim(
      highlight
    );

  const plannedWorldStories =
    [
      0,
      1,
    ]
      .map(
        (position) =>
          claim(
            world[
              position
            ]
          )
      )
      .filter(
        (
          story
        ): story is StorySource =>
          story !==
          null
      );

  return {
    mainStory,

    moreTopFeature,
    moreTopText,

    featuredSupport,

    moreCoverage:
      plannedMoreCoverage,

    highlightsStory,

    worldStories:
      plannedWorldStories,
  };
}

/* ========================================================= */
/* STORY IDS */
/* ========================================================= */

export function getLeadNewsGridStoryIds(
  plan:
    LeadNewsGridPlan
) {
  return [
    plan.mainStory,

    plan.moreTopFeature,
    ...plan.moreTopText,

    ...plan.featuredSupport,

    ...plan.moreCoverage,

    plan.highlightsStory,

    ...plan.worldStories,
  ]
    .filter(
      (
        source
      ): source is StorySource =>
        source !==
        null
    )
    .map(
      (source) =>
        getStory(
          source
        ).id
    );
}

/* ========================================================= */
/* MAIN COMPONENT */
/* ========================================================= */

export function LeadNewsGrid({
  locale,
  plan,
}: LeadNewsGridProps) {
  const {
    mainStory,

    moreTopFeature,
    moreTopText,

    featuredSupport,
    moreCoverage,

    highlightsStory,
    worldStories,
  } = plan;

  return (
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
          py-6
        "
      >
        <div
          className="
            grid
            gap-7
            xl:grid-cols-[minmax(230px,0.75fr)_minmax(0,1.55fr)_minmax(260px,0.72fr)]
          "
        >
          {/* ================================================= */}
          {/* LEFT — TOP STORIES */}
          {/* ================================================= */}

          <aside
            className="
              min-w-0
              xl:border-r
              xl:border-border
              xl:pr-6
            "
          >
            <TopStoriesColumn
              locale={locale}
              featured={
                moreTopFeature
              }
              stories={
                moreTopText
              }
            />
          </aside>

          {/* ================================================= */}
          {/* CENTER — LEAD STORY */}
          {/* ================================================= */}

          <main
            className="
              min-w-0
              xl:border-r
              xl:border-border
              xl:pr-7
            "
          >
            <LeadStoryColumn
              locale={locale}
              mainStory={
                mainStory
              }
              featuredSupport={
                featuredSupport
              }
              moreCoverage={
                moreCoverage
              }
            />
          </main>

          {/* ================================================= */}
          {/* RIGHT — HIGHLIGHTS */}
          {/* ================================================= */}

          <aside className="min-w-0">
            <HighlightsColumn
              locale={locale}
              highlightsStory={
                highlightsStory
              }
              worldStories={
                worldStories
              }
            />
          </aside>
        </div>
      </div>
    </section>
  );
}