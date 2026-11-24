\set ON_ERROR_STOP on
\set ct08b2c_conflicts 1
\i tests/ct08b2b-postgres-projection.sql
select 'CT08b.2c exact authorized cross-range and cross-filter conflicts verified' as result;
