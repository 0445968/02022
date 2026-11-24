import {redirect} from 'next/navigation';
import {getCurrentUser} from '@/lib/auth/session';
import {newsroomLocale} from '@/lib/services/newsroom-workspace';
import {getStaffTeamAccess} from '@/lib/services/staff-team-directory';
import {canReviewStaffBylines} from '@/lib/services/staff-byline-review';
import {canManageStaffInvitations} from '@/lib/services/staff-invitations';
import {StaffTeamManager} from '@/components/editorial/team/StaffTeamManager';

export const dynamic='force-dynamic';
export default async function NewsroomTeamPage(){
  const access=await getStaffTeamAccess();
  if(!access.allowed)redirect('/newsroom/denied');
  const user=await getCurrentUser();
  const locale=await newsroomLocale(user);
  return <StaffTeamManager locale={locale} showInvitations={await canManageStaffInvitations()} showBylines={await canReviewStaffBylines()}/>;
}
