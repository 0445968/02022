import Link from 'next/link';
import {readerAccountEnabled,privacyQueue} from '@/lib/services/reader-account';
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
  const canPrivacy=readerAccountEnabled()&&await privacyQueue(0).then(()=>true).catch(()=>false);
  return <>{canPrivacy&&<div className="px-6 pt-5"><Link className="text-sm font-semibold text-primary underline" href="/newsroom/privacy">{locale==='es'?'Solicitudes de privacidad':'Privacy requests'}</Link></div>}<StaffTeamManager locale={locale} showInvitations={await canManageStaffInvitations()} showBylines={await canReviewStaffBylines()}/></>;
}
