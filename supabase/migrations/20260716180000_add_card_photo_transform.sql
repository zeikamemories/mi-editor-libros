-- Guarda cómo el cliente posicionó su foto sobre la carta en el editor del modal de
-- "Cartas personalizadas" (zoom, rotación, y desplazamiento) — así el mockup y la producción
-- final usan exactamente el encuadre que eligió, no un crop automático.
--
-- Shape: { scale: number, rotation: 0|90|180|270, offsetX: number, offsetY: number }
-- offsetX/offsetY están en fracción del ancho/alto del frame (ej. 0.1 = 10% del frame),
-- no en píxeles absolutos, para que sea independiente del tamaño de pantalla donde se lea.

alter table public.orders add column if not exists card_photo_transform jsonb;
