-- Fixture-only legacy reader profile shape, reconstructed from the historical
-- comments view, database types and CT12 tests. NOT a hosted migration.
alter table public.profiles add column if not exists display_name text;
