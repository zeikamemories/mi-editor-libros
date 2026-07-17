-- Vino orders never had a place to store the client's own material — the
-- project detail page ("Tu material") was showing the fotolibro flow
-- (Drive/Docs links, "referencias de diseño de tapa") which doesn't apply
-- to wine (no in-app design editor, no Drive folder, per the agreed plan).
--
-- For diseno_tipo = 'foto_y_texto' the client uploads one photo + writes the
-- label text directly on /mis-proyectos/[orderId] — these two new columns
-- back that. For diseno_tipo = 'diseno_personalizado' we reuse the existing
-- reference_images(text[]) column and order_notes table, no new columns
-- needed for that branch.

alter table public.orders add column if not exists label_photo_url text; -- client's photo for the wine label (foto_y_texto)
alter table public.orders add column if not exists label_text      text; -- label text the client wrote (foto_y_texto)
