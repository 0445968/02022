-- Cross-module assertions after all 39 migrations on the SAME synthetic baseline.
\set ON_ERROR_STOP on
-- Confirm the synthetic operation contract is fail-closed before quota assertions.
begin;
set local role authenticated;
do $fn$begin
 if storage.allow_only_operation('object.upload') then raise exception 'Unset storage operation allowed';end if;
 perform set_config('test.storage_operation','object.sign_upload_url',true);
 if storage.allow_only_operation('object.upload') then raise exception 'Signed operation confused with ordinary upload';end if;
 perform set_config('test.storage_operation','object.upload',true);
 if not storage.allow_only_operation('object.upload') then raise exception 'Ordinary operation fixture missing';end if;
end;$fn$;
rollback;
do $$begin
 if (select count(*) from public.profiles)<>2 or (select count(*) from public.stories)<>4
 or (select count(*) from public.story_revisions)<>1 then raise exception 'Legacy row counts changed';end if;
 if exists(select 1 from public.staff_memberships) or exists(select 1 from public.staff_member_roles)
 then raise exception 'Legacy profile flags automatically granted staff access';end if;
 if exists(select 1 from pg_policies where policyname ilike 'dev bypass%')
 then raise exception 'Historical dev bypass policy survived';end if;
 if has_function_privilege('anon','public.staff_read_owner_dashboard(text)','EXECUTE')
 or has_table_privilege('anon','public.media_assets','SELECT')
 or has_table_privilege('authenticated','newsroom_private.reader_privacy_requests','SELECT')
 or has_function_privilege('anon','public.reader_export_snapshot()','EXECUTE')
 or has_column_privilege('authenticated','public.profiles','is_editor','UPDATE')
 then raise exception 'Cumulative privilege leak';end if;
 if not exists(select 1 from storage.buckets where id='media-drafts' and not public)
 then raise exception 'Private media bucket missing';end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
 and policyname='ct05b_private_reserved_upload' and permissive='RESTRICTIVE' and cmd='INSERT'
 and with_check like '%allow_only_operation%')
 then raise exception 'Private reservation operation policy missing';end if;
 if has_function_privilege('anon','public.staff_reserve_private_upload(text)','EXECUTE')
 or has_table_privilege('authenticated','newsroom_private.private_upload_reservations','UPDATE')
 or has_table_privilege('authenticated','newsroom_private.private_upload_reservations','DELETE')
 then raise exception 'Private quota privileges leaked';end if;
end$$;
begin;
set local role anon;
do $$begin
 if (select array_agg(slug order by slug) from public.stories where slug like 'ct15-%') is distinct from array['ct15-public']::text[]
 then raise exception 'Anonymous content boundary incorrect';end if;
 if (select display_name from public.reader_public_profiles where id='a1500000-0000-4000-8000-000000000002') is distinct from 'Synthetic Reader' then raise exception 'Public reader projection incorrect';end if;
end$$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000002';
do $$begin
 if (select array_agg(slug order by slug) from public.stories where slug like 'ct15-%') is distinct from array['ct15-public','ct15-registered']::text[]
 then raise exception 'Reader content boundary incorrect';end if;
 if exists(select 1 from public.staff_memberships) then raise exception 'Reader staff visibility';end if;
 if (public.reader_read_account()->>'email') is distinct from 'reader@example.test'
 or (public.reader_read_account()->>'displayName') is distinct from 'Synthetic Reader'
 then raise exception 'Reader account identity unavailable or incorrect';end if;
end$$;
rollback;
begin;
set local role authenticated;
set local request.jwt.claim.sub='a1500000-0000-4000-8000-000000000001';
do $$begin
 if exists(select 1 from public.stories where slug='ct15-draft') then raise exception 'Legacy editor flag bypassed scoped permissions';end if;
end$$;
rollback;
select 'CT15 cumulative synthetic migration and cross-module checks passed' as result;
