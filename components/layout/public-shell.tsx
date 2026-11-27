import {readPublicHomepageVisibility} from '@/lib/services/public-homepage-visibility';
import {getWorkspaceAccess,scopedNewsroomEnabled} from '@/lib/services/newsroom-workspace';
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
  getPublicHomepageSlots,
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
  const canOpenNewsroom=scopedNewsroomEnabled()?!!user&&await getWorkspaceAccess().then(a=>a.allowed).catch(()=>false):undefined;
  const [homepageSlots,visibility]=await Promise.all([getPublicHomepageSlots(),readPublicHomepageVisibility()]);

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
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-white focus:p-3 focus:text-deep focus:ring-2 focus:ring-primary">{locale==='es'?'Ir al contenido':'Skip to content'}</a>
      <Header
        canOpenNewsroom={canOpenNewsroom}
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

{visibility.headline_bar&&(<HeadlineBar
        locale={
          locale
        }
        placements={
          headlineBarPlacements
        }
      />)}

      <main
        className="
          flex-1
        "
        id="main"
        tabIndex={-1}
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