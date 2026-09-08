drop policy if exists "Editors can update editorial profiles"
on public.editorial_profiles;

create policy "Editors can update editorial profiles"
on public.editorial_profiles
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_editor = true
  )
)
with check (
  exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.is_editor = true
  )
);