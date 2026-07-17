-- Designers need to mark client comments/change-requests as handled ("tildar
-- completado") and delete client drawings from the preview once they've been
-- addressed. Adds a `resolved` flag to both tables that carry client feedback.

-- ── order_notes (pedidos de cambio) ─────────────────────────────────────────

alter table public.order_notes
  add column if not exists resolved boolean not null default false;

drop policy if exists "order_notes_update_admin_only" on public.order_notes;
create policy "order_notes_update_admin_only"
on public.order_notes for update
to authenticated
using (
  (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
)
with check (
  (auth.jwt() ->> 'email') in (
    'maikasacerdote@gmail.com',
    'zeika.memories@gmail.com',
    'azucenaurangaa@gmail.com',
    'josefinaadevicentis@gmail.com',
    'totitasuarez1@gmail.com'
  )
);

-- ── preview_annotations (comentarios del preview) ───────────────────────────
-- Drawings don't need `resolved` — the designer just deletes them once handled
-- (already covered by the existing "preview_annotations_all_access" policy).

alter table public.preview_annotations
  add column if not exists resolved boolean not null default false;
