import {
  Footer,
} from '@/components/layout/footer';

import {
  Header,
} from '@/components/layout/header';

import {
  HeadlineBar,
} from '@/components/layout/headline-bar';

import {
  getHomepageSlots,
} from '@/lib/services/front-page';

import type {
  Dictionary,
} from '@/lib/i18n/dictionaries';

import type {
  CurrentUser,
  Locale,
} from '@/types';

interface PublicShellProps {
  dict: Dictionary;
  locale: Locale;
  user: CurrentUser | null;
  children: React.ReactNode;
}

export async function PublicShell({
  dict,
  locale,
  user,
  children,
}: PublicShellProps) {
  const homepageSlots =
    await getHomepageSlots();

  const headlineBarPlacements =
    homepageSlots.filter(
      (placement) =>
        placement.active &&
        placement.slot ===
          'headline_bar'
    );

  return (
    <div
      className="
        flex
        min-h-screen
        flex-col
        bg-white
      "
    >
      <Header
        dict={
          dict
        }
        locale={
          locale
        }
        user={
          user
        }
      />

      <HeadlineBar
        locale={
          locale
        }
        placements={
          headlineBarPlacements
        }
      />

      <main
        className="
          flex-1
        "
        id="main"
      >
        {children}
      </main>

      <Footer
        dict={
          dict
        }
        locale={
          locale
        }
      />
    </div>
  );
}