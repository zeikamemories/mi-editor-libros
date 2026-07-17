-- Diseño final de la etiqueta de vino, subido por el equipo (no por el
-- cliente) y compuesto sobre /fotos/MockupVino.jpg tanto en el panel de
-- admin como en el preview del cliente (VinoMockupFrame). Análogo a
-- preview_url para fotolibros, pero una sola imagen en vez de un libro.

alter table public.orders add column if not exists vino_design_url text;
