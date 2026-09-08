import {
    PageEditorClient,
  } from '@/components/editorial/page-editor/PageEditorClient';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  import {
    defaultLocale,
  } from '@/lib/i18n/config';
  
  import {
    getBreakingNews,
    getFrontPageStoryOptions,
    getHomepageLayoutDraft,
    getHomepageSlots,
    getPublishedStoriesByCategory,
  } from '@/lib/services/front-page';
  
  import {
    getCategories,
  } from '@/lib/services/taxonomy';
  
  export default async function PageEditorPage() {
    const user =
      await getCurrentUser();
  
    const locale =
      user?.profile
        ?.preferredLocale ??
      defaultLocale;
  
    const [
      placements,
      layoutDraft,
      breakingNews,
      stories,
      worldStories,
      categories,
    ] =
      await Promise.all([
        getHomepageSlots(),
  
        getHomepageLayoutDraft(),
  
        getBreakingNews(),
  
        getFrontPageStoryOptions(),
  
        getPublishedStoriesByCategory(
          'world',
          100
        ),
  
        getCategories(),
      ]);
  
    return (
      <PageEditorClient
        locale={
          locale
        }
        placements={
          placements
        }
        layoutDraft={
          layoutDraft
        }
        breakingNews={
          breakingNews
        }
        stories={
          stories
        }
        worldStories={
          worldStories
        }
        categories={
          categories
        }
      />
    );
  }