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
      user.profile
        ?.preferredLocale ??
      defaultLocale;
  
    const dict =
      getDictionary(
        locale
      );
  
    return (
      <AccountShell
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