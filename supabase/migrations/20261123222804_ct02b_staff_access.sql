-- CT-02b / staged for review, NOT applied to the hosted Clear Talks database.
-- Generated filename: Supabase CLI v3.2.0 migration new ct02b_staff_access
-- Executable only after CT-02 migration review, verified backup, and baseline
-- reconciliation: restored production has ZERO rows in hosted migration history.
-- No legacy migration replay. No automatic promotion of restored profiles.
begin;

create type public.staff_capability_key as enum (
  'newsroom.access',
  'story.view_all',
  'story.view_assigned',
  'story.create',
  'story.edit_all',
  'story.edit_assigned',
  'story.submit_review',
  'story.review',
  'story.publish',
  'story.schedule',
  'story.archive_delete',
  'story.assign',
  'revision.view',
  'revision.edit_assigned',
  'revision.publish',
  'revision.discard',
  'media.view_all',
  'media.upload',
  'media.edit_own',
  'media.edit_all',
  'media.approve',
  'media.delete',
  'byline.view',
  'byline.manage',
  'homepage.view_editor',
  'homepage.edit',
  'homepage.publish',
  'comment.view_queue',
  'comment.moderate',
  'comment.manage_reports',
  'poll.view_manage',
  'poll.edit',
  'poll.publish',
  'poll.manage_results',
  'calendar.view_team',
  'calendar.manage',
  'calendar.view_assigned',
  'audience.view',
  'audience.notify',
  'newsletter.manage',
  'team.view',
  'team.invite',
  'team.manage_roles',
  'team.manage_overrides',
  'team.suspend',
  'team.view_audit',
  'settings.security_admin',
  'reader.personal'
);

create table public.staff_memberships (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete restrict,
  status text not null default 'invited'
    check (status in ('invited','active','suspended','revoked')),
  member_type text not null default 'employee'
    check (member_type in ('employee','contractor','freelancer')),
  invited_by uuid references auth.users(id) on delete set null,
  activated_at timestamptz,
  suspended_at timestamptz,
  revoked_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_active_has_activated_at
    check (status <> 'active' or activated_at is not null)
);

create table public.staff_role_presets (
  id uuid primary key default gen_random_uuid(),
  role_key text not null unique
    check (role_key in (
      'owner','managing_editor','editor','staff_writer','copy_editor',
      'media_editor','moderator','audience_staff','freelancer'
    )),
  name_en text not null,
  name_es text not null,
  is_builtin boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.staff_role_capabilities (
  role_preset_id uuid not null references public.staff_role_presets(id) on delete cascade,
  capability_key public.staff_capability_key not null,
  scope text not null default 'all' check (scope in ('all','assigned','own')),
  primary key (role_preset_id, capability_key),
  -- Owner-security privilege requires a separately reviewed, hardened operation.
  constraint no_ordinary_security_admin_grant
    check (capability_key <> 'settings.security_admin'::public.staff_capability_key),
  -- Personal reader access never comes from a staff membership.
  constraint no_reader_personal_role_grant
    check (capability_key <> 'reader.personal'::public.staff_capability_key)
);

create table public.staff_member_roles (
  membership_id uuid not null references public.staff_memberships(id) on delete restrict,
  role_preset_id uuid not null references public.staff_role_presets(id) on delete restrict,
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  expires_at timestamptz,
  primary key (membership_id, role_preset_id)
);

create table public.staff_capability_overrides (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.staff_memberships(id) on delete restrict,
  capability_key public.staff_capability_key not null,
  effect text not null check (effect in ('allow','deny')),
  scope text not null default 'all' check (scope in ('all','assigned','own')),
  reason text not null check (length(trim(reason)) > 0),
  granted_by uuid not null references auth.users(id) on delete restrict,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (membership_id, capability_key, scope),
  constraint no_security_admin_override
    check (capability_key <> 'settings.security_admin'::public.staff_capability_key),
  constraint no_reader_personal_override
    check (capability_key <> 'reader.personal'::public.staff_capability_key)
);

create table public.staff_story_assignments (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete restrict,
  membership_id uuid not null references public.staff_memberships(id) on delete restrict,
  assignment_type text not null
    check (assignment_type in ('author','editor','reviewer','copy','visual')),
  status text not null default 'active'
    check (status in ('active','completed','revoked')),
  created_by uuid references auth.users(id) on delete set null,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (story_id, membership_id, assignment_type)
);

create table public.staff_access_audit (
  id uuid primary key default gen_random_uuid(),
  actor_auth_user_id uuid references auth.users(id) on delete set null,
  subject_membership_id uuid references public.staff_memberships(id) on delete restrict,
  action_key text not null,
  before_state jsonb,
  after_state jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create index staff_member_roles_role_id_idx
  on public.staff_member_roles (role_preset_id);
create index staff_overrides_member_idx
  on public.staff_capability_overrides (membership_id, capability_key);
create index staff_story_assignments_member_status_idx
  on public.staff_story_assignments (membership_id, status, story_id);
create index staff_story_assignments_story_idx
  on public.staff_story_assignments (story_id);
create index staff_access_audit_subject_time_idx
  on public.staff_access_audit (subject_membership_id, created_at desc);

-- Names only. Presets contain ZERO capabilities until separately approved.
-- Existing is_editor/is_author users are NOT automatically enrolled.
insert into public.staff_role_presets (role_key, name_en, name_es) values
  ('owner','Owner / Platform Administrator','Propietario / Administrador'),
  ('managing_editor','Managing Editor','Editor general'),
  ('editor','Editor','Editor'),
  ('staff_writer','Staff Writer','Periodista de planta'),
  ('copy_editor','Copy Editor / Fact Checker','Corrector / Verificador'),
  ('media_editor','Visual / Media Editor','Editor visual / Multimedia'),
  ('moderator','Moderator','Moderador'),
  ('audience_staff','Audience / Newsletter Staff','Equipo de audiencia / Boletín'),
  ('freelancer','Freelancer / Contributor','Colaborador independiente');

-- All new tables exposed in public have RLS, with no write policy.
alter table public.staff_memberships enable row level security;
alter table public.staff_role_presets enable row level security;
alter table public.staff_role_capabilities enable row level security;
alter table public.staff_member_roles enable row level security;
alter table public.staff_capability_overrides enable row level security;
alter table public.staff_story_assignments enable row level security;
alter table public.staff_access_audit enable row level security;

-- Explicit Data API grants. Authenticated may SELECT only owner-visible rows.
-- No INSERT/UPDATE/DELETE privileges for authenticated; none for anon.
revoke all on table
  public.staff_memberships,
  public.staff_role_presets,
  public.staff_role_capabilities,
  public.staff_member_roles,
  public.staff_capability_overrides,
  public.staff_story_assignments,
  public.staff_access_audit
from public, anon, authenticated;

grant select on table
  public.staff_memberships,
  public.staff_role_presets,
  public.staff_role_capabilities,
  public.staff_member_roles,
  public.staff_capability_overrides,
  public.staff_story_assignments
to authenticated;

-- Dedicated backend-only role privileges for migration/admin transactions.
-- Never send service_role credentials to the browser. CT-03 must implement
-- reviewed server checks and transactional audit before any staff mutation.
grant select, insert, update, delete on table
  public.staff_memberships,
  public.staff_role_presets,
  public.staff_role_capabilities,
  public.staff_member_roles,
  public.staff_capability_overrides,
  public.staff_story_assignments
to service_role;

-- Audit is append-only even for service_role through the Data API.
revoke all on public.staff_access_audit from service_role;
grant select, insert on public.staff_access_audit to service_role;

create policy staff_memberships_read_own
on public.staff_memberships for select to authenticated
using (auth_user_id = (select auth.uid()));

create policy staff_member_roles_read_own_active
on public.staff_member_roles for select to authenticated
using (
  exists (
    select 1 from public.staff_memberships m
    where m.id = membership_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
  )
);

create policy staff_role_presets_read_assigned_active
on public.staff_role_presets for select to authenticated
using (
  exists (
    select 1
    from public.staff_member_roles mr
    join public.staff_memberships m on m.id = mr.membership_id
    where mr.role_preset_id = staff_role_presets.id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
      and (mr.expires_at is null or mr.expires_at > now())
  )
);

create policy staff_role_capabilities_read_assigned_active
on public.staff_role_capabilities for select to authenticated
using (
  exists (
    select 1
    from public.staff_member_roles mr
    join public.staff_memberships m on m.id = mr.membership_id
    where mr.role_preset_id = staff_role_capabilities.role_preset_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
      and (mr.expires_at is null or mr.expires_at > now())
  )
);

create policy staff_capability_overrides_read_own_active
on public.staff_capability_overrides for select to authenticated
using (
  exists (
    select 1 from public.staff_memberships m
    where m.id = membership_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
  )
);

create policy staff_story_assignments_read_own_active
on public.staff_story_assignments for select to authenticated
using (
  exists (
    select 1 from public.staff_memberships m
    where m.id = membership_id
      and m.auth_user_id = (select auth.uid())
      and m.status = 'active'
      and (m.expires_at is null or m.expires_at > now())
  )
);

-- NO SELECT/INSERT/UPDATE/DELETE policies on staff_access_audit.
-- Future manager/audit endpoints must use a reviewed, privileged server
-- transaction with verified actor, audit event and last-owner protection.
commit;
