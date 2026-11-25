\set ON_ERROR_STOP on
\i tests/ct09-postgres-polls.sql
-- Minimal restored homepage model for the full stack fixture (CT02h standalone fixture already validates legacy RLS).
create type public.homepage_slot_type as enum('lead','secondary','headline_bar');
create table public.homepage_slots(id uuid primary key default gen_random_uuid(),slot public.homepage_slot_type not null,story_id uuid references public.stories(id),position integer not null,category_id uuid,active boolean not null default true,starts_at timestamptz,ends_at timestamptz,created_by uuid,updated_by uuid);
create table public.homepage_layout_drafts(id text primary key,selections jsonb not null,updated_by uuid,updated_at timestamptz not null default now());
alter table public.homepage_slots enable row level security;
alter table public.homepage_layout_drafts enable row level security;
grant select,insert,update,delete on public.homepage_slots,public.homepage_layout_drafts to authenticated;
create function public.publish_homepage_layout(jsonb,uuid) returns void language plpgsql as $fn$begin raise exception 'Legacy endpoint must be revoked';end;$fn$;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id,k::public.staff_capability_key,'all' from public.staff_role_presets p cross join unnest(array['homepage.view_editor','homepage.edit']) k where p.role_key in ('owner','editor') on conflict do nothing;
insert into public.staff_role_capabilities(role_preset_id,capability_key,scope)
select p.id,'homepage.publish','all' from public.staff_role_presets p where p.role_key='owner' on conflict do nothing;
insert into public.homepage_slots(slot,story_id,position) values('lead','20000000-0000-0000-0000-000000000001',0);
\i supabase/migrations/20261125004543_ct11b_homepage_history.sql
do $fn$begin
 if has_table_privilege('authenticated','public.homepage_slots','DELETE') or has_table_privilege('authenticated','public.homepage_layout_drafts','UPDATE') or has_table_privilege('authenticated','newsroom_private.homepage_versions','SELECT') or has_function_privilege('authenticated','public.publish_homepage_layout(jsonb,uuid)','EXECUTE') or has_function_privilege('anon','public.staff_read_homepage_versioned()','EXECUTE') then raise exception 'Layout privilege leak';end if;
end;$fn$;
begin;
set local role authenticated;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $fn$declare p jsonb;c jsonb:='[{"slot":"secondary","position":0,"storyId":"20000000-0000-0000-0000-000000000001","categoryId":null}]';begin
 p:=public.staff_read_homepage_versioned();if (p->>'revision')::int<>0 then raise exception 'Initial version';end if;
 p:=public.staff_change_homepage_versioned('save',0,c,null);if (p->>'revision')::int<>1 or p->'published'->0->>'slot'<>'lead' then raise exception 'Save changed public layout';end if;
 begin perform public.staff_change_homepage_versioned('save',0,c,null);raise exception 'Stale save accepted';exception when serialization_failure then null;end;
 begin perform public.staff_change_homepage_versioned('publish',1,c,null);raise exception 'Editor published';exception when insufficient_privilege then null;end;
end;$fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
do $fn$declare p jsonb;c jsonb:='[{"slot":"secondary","position":0,"storyId":"20000000-0000-0000-0000-000000000001","categoryId":null}]';begin
 p:=public.staff_change_homepage_versioned('publish',1,c,null);
 if p->'published'->0->>'slot'<>'secondary' or jsonb_array_length(p->'history')<>2 then raise exception 'Publish and history failed';end if;
 p:=public.staff_change_homepage_versioned('restore',2,null,0);
 if p->'published'->0->>'slot'<>'secondary' or p->'selections'->0->>'slot'<>'lead' then raise exception 'Restore published';end if;
 p:=public.staff_change_homepage_versioned('revert',3,null,null);
 if p->'selections'<>p->'published' or (p->>'revision')::int<>4 then raise exception 'Revert failed';end if;
 begin perform public.staff_change_homepage_versioned('publish',4,c||c,null);raise exception 'Duplicate accepted';exception when invalid_parameter_value then null;end;
 if (public.staff_read_homepage_versioned()->>'revision')::int<>4 then raise exception 'Invalid command changed revision';end if;
end;$fn$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000005';
do $fn$begin begin perform public.staff_read_homepage_versioned();raise exception 'Reader accessed layout';exception when insufficient_privilege then null;end;end;$fn$;
commit;
select 'CT11b isolated layout CAS, history, restore and authorization checks passed' as result;
