-- CT-05b.1 STAGED ONLY. CLI-generated filename #45440492880.
-- Preserve existing CT-02e guards. Limit direct assigned-only draft writes to
-- copy; a submitted draft cannot be reopened or edited by its contributor.
begin;
create function newsroom_private.guard_assigned_draft_copy()
returns trigger language plpgsql security invoker set search_path=''
as $fn$
begin
  if current_user<>'authenticated' then return new; end if;
  if newsroom_private.has_staff_permission('story.edit_all',old.id) then return new; end if;
  if not newsroom_private.has_staff_permission('newsroom.access')
    or not newsroom_private.has_staff_permission('story.view_assigned',old.id)
    or not newsroom_private.has_staff_permission('story.edit_assigned',old.id)
    or old.status<>'draft'
    or new.status not in ('draft','in_review')
    or new.updated_by is distinct from (select auth.uid())
    or (to_jsonb(new)-array['headline','subheadline','summary','body','status','updated_at','updated_by'])
      is distinct from (to_jsonb(old)-array['headline','subheadline','summary','body','status','updated_at','updated_by']) then
    raise exception 'Assigned draft copy change denied' using errcode='42501';
  end if;
  if new.status='in_review' and not newsroom_private.has_staff_permission('story.submit_review',old.id) then
    raise exception 'Assigned review submission denied' using errcode='42501';
  end if;
  if length(btrim(new.headline)) not between 1 and 300
    or length(coalesce(new.subheadline,''))>600
    or length(coalesce(new.summary,''))>3000
    or jsonb_typeof(new.body)<>'object'
    or new.body->>'type' is distinct from 'doc'
    or octet_length(new.body::text)>524288 then
    raise exception 'Invalid draft copy' using errcode='22023';
  end if;
  -- Existing inline images may be retained/removed, not introduced or changed.
  -- Strip null-valued attributes added by the existing TipTap schema.
  if exists(
    select 1 from jsonb_path_query(new.body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) n(node)
    where not exists(select 1 from jsonb_path_query(old.body,'strict $.** ? (@.type == "image")'::jsonpath,silent=>true) o(node)
      where jsonb_strip_nulls(n.node)=jsonb_strip_nulls(o.node))
  ) then raise exception 'New inline media requires editorial review' using errcode='42501'; end if;
  return new;
end;
$fn$;
revoke all on function newsroom_private.guard_assigned_draft_copy() from public,anon,authenticated;
create trigger ct05b_assigned_draft_copy_guard before update on public.stories
for each row execute function newsroom_private.guard_assigned_draft_copy();
commit;
