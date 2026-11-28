-- CT16 final catalog boundary check, disposable test only.
\set ON_ERROR_STOP on
do $fn$
declare name text; role_name text; table_oid regclass; f regprocedure; sig text;
begin
 foreach name in array array['editorial_privilege_settings','self_publication_events','work_assignments','work_assignment_members','work_assignment_events','homepage_visibility','poll_placement_state','poll_placement_events','story_translation_links','story_translation_events','translation_access_permits','poll_translation_settings','poll_translations','poll_translation_events'] loop
  table_oid:=to_regclass('newsroom_private.'||name);
  if table_oid is null or not exists(select 1 from pg_class c where c.oid=table_oid and c.relrowsecurity) then raise exception 'Missing protected RLS table: %',name;end if;
  foreach role_name in array array['anon','authenticated','service_role'] loop
   if has_table_privilege(role_name,table_oid,'SELECT,INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') then raise exception 'Private table privilege: %.%',role_name,name;end if;
  end loop;
 end loop;
 if has_schema_privilege('anon','newsroom_private','USAGE') then raise exception 'Anonymous private schema access';end if;
 foreach sig in array array['public.staff_read_poll_translation(uuid)','public.staff_change_poll_translation(uuid,integer,text,text,jsonb,text)','public.staff_read_story_translation(uuid)','public.staff_create_story_translation(uuid,text,text,uuid,text)','public.staff_refresh_story_translation(uuid,text,integer,timestamptz,uuid,text)','public.staff_retire_story_translation(uuid,text,integer,timestamptz,uuid,text)','public.staff_change_translation_access(uuid,text,integer,timestamptz,text,uuid,text)','public.staff_read_poll_placements(uuid)','public.staff_change_poll_placements(uuid,integer,text,jsonb,text)','public.staff_publish_own_story(uuid,text,uuid,text,text)'] loop
  f:=to_regprocedure(sig);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or not has_function_privilege('authenticated',f,'EXECUTE') or exists(select 1 from pg_proc p where p.oid=f and p.prosecdef) then raise exception 'Unsafe staff RPC: %',sig;end if;
 end loop;
 foreach sig in array array['public.public_story_translation_pairs(uuid[])','public.public_placed_polls(text,text,text)','public.public_list_polls(text,integer)','public.read_public_homepage_visibility()'] loop
  f:=to_regprocedure(sig);
  if f is null or not has_function_privilege('anon',f,'EXECUTE') or exists(select 1 from pg_proc p where p.oid=f and p.prosecdef) then raise exception 'Unsafe public projection: %',sig;end if;
 end loop;
 foreach sig in array array['newsroom_private.read_poll_translation(uuid)','newsroom_private.change_poll_translation(uuid,integer,text,text,jsonb,text)','newsroom_private.retire_story_translation(uuid,text,integer,timestamptz,uuid,text)','newsroom_private.change_translation_access(uuid,text,integer,timestamptz,text,uuid,text)'] loop
  f:=to_regprocedure(sig);
  if f is null or has_function_privilege('anon',f,'EXECUTE') or has_function_privilege('service_role',f,'EXECUTE') or not has_function_privilege('authenticated',f,'EXECUTE') or not exists(select 1 from pg_proc p where p.oid=f and p.prosecdef and exists(select 1 from unnest(p.proconfig) cfg where split_part(cfg,'=',1)='search_path' and trim(both '"' from split_part(cfg,'=',2))='')) then raise exception 'Unsafe private poll translation RPC: %',sig;end if;
 end loop;
 if exists(select 1 from newsroom_private.editorial_privilege_settings where enabled) or exists(select 1 from newsroom_private.poll_settings where public_enabled) or exists(select 1 from newsroom_private.poll_translation_settings where public_enabled) or exists(select 1 from newsroom_private.newsletter_settings where delivery_enabled) then raise exception 'Unexpected activated provider/publication gate';end if;
end;$fn$;
select 'CT16 catalog security boundaries and default-off activation gates passed' as result;
