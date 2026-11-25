export const dynamic = 'force-dynamic';
export const metadata={robots:{index:false,follow:false},referrer:'no-referrer'};
import {readerAccountEnabled} from '@/lib/services/reader-account';
import {getWorkspaceAccess,scopedNewsroomEnabled} from '@/lib/services/newsroom-workspace';

import {
    redirect,
  } from 'next/navigation';
  
  import {
    AccountShell,
  } from '@/components/account/account-shell';
  
  import {
    getCurrentUser,
  } from '@/lib/auth/session';
  
  import {
    defaultLocale,
  } from '@/lib/i18n/config';
  
  import {
    getDictionary,
  } from '@/lib/i18n/dictionaries';

  import {
    getServerLocale,
  } from '@/lib/i18n/server-locale';
  
  /**
   * Authentication boundary for My West Island Times.
   *
   * Every authenticated account may enter this area,
   * including accounts without Newsroom capabilities.
   */
  export default async function AccountLayout({
    children,
  }: {
    children:
      React.ReactNode;
  }) {
    let user:
      Awaited<
        ReturnType<
          typeof getCurrentUser
        >
      > = null;
  
    try {
      user =
        await getCurrentUser();
    } catch (
      error
    ) {
      console.error(
        'Unable to load account session:',
        error
      );
  
      redirect(
        `/${defaultLocale}/auth/sign-in`
      );
    }
  
    if (!user) {
      redirect(
        `/${defaultLocale}/auth/sign-in`
      );
    }
  
    const locale =
        getServerLocale(
            user.profile
                ?.preferredLocale
        );
  
    const dict =
      getDictionary(
        locale
      );
  
    const canOpenNewsroom=scopedNewsroomEnabled()?await getWorkspaceAccess().then(a=>a.allowed).catch(()=>false):!!(user.profile?.isAuthor||user.profile?.isEditor);
    return (
      <AccountShell
        readerAccountEnabled={readerAccountEnabled()}
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
      >
        {children}
      </AccountShell>
    );
  }