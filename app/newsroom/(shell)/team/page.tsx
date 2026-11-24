import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {defaultLocale} from '@/lib/i18n/config';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {canManageStaffInvitations} from '@/lib/services/staff-invitations';
import {StaffTeamManager} from '@/components/editorial/team/StaffTeamManager';

export const dynamic='force-dynamic';
export default async function NewsroomTeamPage(){
  const access=await getStaffTeamAccess();
  if(!access.allowed)redirect('/newsroom/denied');
  const user=await getCurrentUser();
  const locale=user?.profile?.preferredLocale??defaultLocale;
  return <StaffTeamManager locale={locale} showInvitations={await canManageStaffInvitations()}/>;
}
