import { redirect } from 'next/navigation';
import { defaultLocale } from '@/lib/i18n/config';

/**
 * Root page: redirect to the default locale.
 * The middleware normally handles this, but a direct hit on `/` still
 * needs a safe fallback.
 */
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
