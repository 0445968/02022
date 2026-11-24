\set ON_ERROR_STOP on
\set ct08c1_retry 1
\i tests/ct06c2-postgres-reviewed-schedule.sql
select 'CT08c.1 bounded transient retries, backoff, recovery, exhaustion and business denial verified' as result;
