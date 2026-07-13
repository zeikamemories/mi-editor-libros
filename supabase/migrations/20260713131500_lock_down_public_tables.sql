-- Fix: Supabase flagged order_notes / projects / preview_annotations as
-- publicly accessible (no RLS). order_notes and projects also had leftover
-- wide-open policies (`notes_open`, `projects_open`, `authenticated_all`)
-- that granted ALL access to `public`/`authenticated` unconditionally —
-- those are dropped here, since a permissive policy is OR'd with any
-- other policy on the same table and silently defeats it.
--
-- Access model kept intentional per table:
--   - order_notes: no anonymous flow touches it (client must be logged in
--     to see /mis-proyectos, admin must pass isAdminEmail) -> locked to
--     order-owner or Zeika staff.
--   - projects: /editor?pid=... and /preview/[projectId] work without
--     login by design (shareable links, no user_id column exists) ->
--     select/insert/update stay open to anon+authenticated, only DELETE
--     is restricted (no app flow deletes a project today).
--   - preview_annotations: comments/drawings on the preview link have no
--     server-side ownership check today (isOwner is client-side only) ->
--     left fully open to match current app behavior; tightening this
--     needs a real ownership/session mechanism first.

-- ── order_notes ──────────────────────────────────────────────────────────

drop policy if exists "notes_open" on public.order_notes;

alter table public.order_notes enable row level security;

drop policy if exists "order_notes_select_owner_or_admin" on public.order_notes;
create policy "order_notes_select_owner_or_admin"
on public.order_notes for select
to authenticated
using (
  exists (
    select 1 from public.orders o
    where o.id = order_notes.order_id
      and o.user_id = auth.uid()
  )
  or (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
);

drop policy if exists "order_notes_insert_owner_or_admin" on public.order_notes;
create policy "order_notes_insert_owner_or_admin"
on public.order_notes for insert
to authenticated
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_notes.order_id
      and o.user_id = auth.uid()
  )
  or (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
);

-- ── projects ─────────────────────────────────────────────────────────────

drop policy if exists "projects_open" on public.projects;
drop policy if exists "authenticated_all" on public.projects;

alter table public.projects enable row level security;

drop policy if exists "projects_select_all" on public.projects;
create policy "projects_select_all"
on public.projects for select
to anon, authenticated
using (true);

drop policy if exists "projects_insert_all" on public.projects;
create policy "projects_insert_all"
on public.projects for insert
to anon, authenticated
with check (true);

drop policy if exists "projects_update_all" on public.projects;
create policy "projects_update_all"
on public.projects for update
to anon, authenticated
using (true)
with check (true);

drop policy if exists "projects_delete_admin_only" on public.projects;
create policy "projects_delete_admin_only"
on public.projects for delete
to authenticated
using (
  (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
);

-- ── preview_annotations ──────────────────────────────────────────────────

alter table public.preview_annotations enable row level security;

drop policy if exists "preview_annotations_all_access" on public.preview_annotations;
create policy "preview_annotations_all_access"
on public.preview_annotations for all
to anon, authenticated
using (true)
with check (true);
