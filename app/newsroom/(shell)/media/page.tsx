import {redirect} from 'next/navigation';
import {getWorkspaceAccess,scopedNewsroomEnabled,newsroomLocale} from '@/lib/services/newsroom-workspace';
import { getCurrentUser } from '@/lib/auth/session';
import { getDictionary } from '@/lib/i18n/dictionaries';
import { defaultLocale } from '@/lib/i18n/config';
import { MediaLibrary } from '@/components/editorial/media-library';
import { PrivateDraftMediaPanel } from '@/components/editorial/media-library/PrivateDraftMediaPanel';
import { privateDraftMediaEnabled } from '@/lib/permissions/private-draft-media';
import { resolveStaffPermissionOnServer } from '@/lib/permissions/server';

export default async function MediaPage() {
  const access=scopedNewsroomEnabled()?await getWorkspaceAccess():null;
  if(access&&(!access.allowed||(!access.fullMedia&&!access.privateMedia)))redirect('/newsroom/denied');
  const user = await getCurrentUser();
  const locale = await newsroomLocale(user);
  const dict = getDictionary(locale);

  if (!user) return null;

  const privateDraftsEnabled=privateDraftMediaEnabled();
  const canReview=privateDraftsEnabled && (
    (await resolveStaffPermissionOnServer('media.approve')).allowed
    && (await resolveStaffPermissionOnServer('media.edit_all')).allowed
    && (await resolveStaffPermissionOnServer('media.upload')).allowed
    && (await resolveStaffPermissionOnServer('media.view_all')).allowed
  );
  return (
    <>
      {privateDraftsEnabled && (!access||access.privateMedia) && <PrivateDraftMediaPanel canReview={canReview} locale={locale}/>}
      {(!access||access.fullMedia)&&<MediaLibrary dict={dict} userId={user.id} privateDraftsEnabled={privateDraftsEnabled}/>}
    </>
  );
}
