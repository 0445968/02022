\set ON_ERROR_STOP on
\set ct08b2b_projection 1
\i tests/ct08a-postgres-calendar.sql
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$ declare p jsonb;begin
 p:=public.staff_read_story_publication_queue(array['20000000-0000-0000-0000-000000000001','20000000-0000-0000-0000-000000000002']::uuid[]);
 if jsonb_array_length(p->'items')<>0 then raise exception 'Finished queue returned';end if;
end; $fn$;
rollback;
select 'CT08b.2b scoped page projection verified' as result;
