drop policy if exists "Dev bypass can update editorial profiles"
on public.editorial_profiles;

create policy "Dev bypass can update editorial profiles"
on public.editorial_profiles
for update
to anon
using (true)
with check (true);