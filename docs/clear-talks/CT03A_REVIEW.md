# CT-03a — Team permissions manager
This branch stages the admin-facing team/role UI and its permission-gated, audited APIs.
- All new routes are disabled unless CT_STAFF_ACCESS_V2_ENABLED=true.
- Role writes separately require CT_STAFF_ADMIN_MUTATIONS_ENABLED=true.
- No Supabase migration or production changes; do not bootstrap owners or seed roles.
- Existing UI fonts/colors/layout remain unchanged.
