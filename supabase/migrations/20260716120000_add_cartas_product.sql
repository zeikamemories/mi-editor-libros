-- Agrega soporte para el tercer tipo de producto: "cartas personalizadas"
-- (mazos de truco/poker con una misma foto en todas las cartas, $25.000,
-- pago 100% al comprar — sin etapa de diseño/preview).
--
-- `orders` no tenía ninguna migración en el repo hasta ahora — el schema
-- completo vivía solo en el dashboard de Supabase. Se documenta acá, para
-- referencia, el set de columnas inferido leyendo todo el código que hace
-- `.from('orders')` (ver app/orden/page.tsx, app/orden-vino/page.tsx,
-- app/orden/confirmado/page.tsx, app/mis-proyectos/**, app/api/payment,
-- app/dashboard/pedidos/[orderId]/page.tsx):
--
--   id, user_id, created_at, book_name, size, status, status_dates(jsonb),
--   price_total, price_paid, second_price_paid, pages_base, extra_pages,
--   extra_text, preview_url, tracking_number, drive_link, docs_link,
--   reference_images(text[]), change_requests_used, estimated_design_date,
--   estimated_delivery_date, delivery_type, delivery_address, copies,
--   designer, product_type, variedad, diseno_tipo, diseno_multiple
--
-- `product_type` es texto libre (sin constraint): fotolibro es implícito
-- (null/undefined), vino usa 'vino'. Cartas suma 'cartas' como tercer valor,
-- sin agregar una constraint nueva para no romper filas existentes.

alter table public.orders add column if not exists card_type text;        -- 'truco' | 'poker'
alter table public.orders add column if not exists card_photo_url text;   -- foto única del mazo, subida a Cloudinary
