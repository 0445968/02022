#!/usr/bin/env bash
set -euo pipefail
# This script follows the isolated fixture; never run against a hosted DB.
test "$PGHOST" = 127.0.0.1
test "$PGDATABASE" = postgres
dir="$(mktemp -d)"
trap 'rm -rf "$dir"' EXIT
redeem() {
  psql -X -v ON_ERROR_STOP=1 -c "set role service_role; select public.test_redeem('40000000-0000-4000-8000-000000000004',repeat('8',64));"
}
set +e
redeem >"$dir/a" 2>&1 & a=$!
redeem >"$dir/b" 2>&1 & b=$!
wait "$a"; sa=$?
wait "$b"; sb=$?
set -e
if [[ "$sa" -eq 0 && "$sb" -ne 0 ]]; then
  grep -q 'Invitation redemption denied' "$dir/b"
elif [[ "$sb" -eq 0 && "$sa" -ne 0 ]]; then
  grep -q 'Invitation redemption denied' "$dir/a"
else
  cat "$dir/a" "$dir/b"; exit 1
fi
psql -X -v ON_ERROR_STOP=1 <<'SQL'
do $$
begin
  if (select count(*) from public.staff_memberships where auth_user_id='40000000-0000-4000-8000-000000000004')<>1
    or (select count(*) from public.staff_invitations where token_hash=repeat('8',64)
      and redeemed_at is not null and membership_id is not null)<>1
    or (select count(*) from public.staff_access_audit where action_key='staff_invitation.redeemed'
      and actor_auth_user_id='40000000-0000-4000-8000-000000000004')<>1 then
    raise exception 'Concurrent redemption did not produce exactly one audited activation';
  end if;
end $$;
SQL
echo 'CT-04a concurrent redemption passed'
