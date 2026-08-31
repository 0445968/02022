import {
  Footer,
} from '@/components/layout/footer';

import {
  Header,
} from '@/components/layout/header';

import {
  UtilityBar,
} from '@/components/layout/utility-bar';

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

export function PublicShell({
  dict,
  locale,
  user,
  children,
}: PublicShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <UtilityBar
        date={
          dict.utility.date
        }
        weather={
          dict.utility.weather
        }
        islands={
          dict.utility.islands
        }
      />

      <Header
        dict={dict}
        locale={locale}
        user={user}
      />

      <main
        className="flex-1"
        id="main"
      >
        {children}
      </main>

      <Footer
        dict={dict}
        locale={locale}
      />
    </div>
  );
}