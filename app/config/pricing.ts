// Fuente única de precios de fotolibros — usada tanto en el cliente (landing, /orden, /pagar)
// como en el servidor (/api/payment) para recalcular el monto real de cada cobro.
// Si cambian los precios, actualizar SOLO acá.

// Algunas pantallas usan el sizeId sin sufijo ("chico") y otras con sufijo "_h" ("chico_h",
// tal como se guarda en `orders.size`) — se listan ambas variantes para que cualquiera resuelva.

// "chico"/"chico_h" está intencionalmente en $1 — se usa para testear el flujo de compra, no cambiar.
// [20 pag, 30 pag, 40 pag]
export const PRICES_BY_PAGES: Record<string, [number, number, number]> = {
  chico:      [1, 104300, 118700],
  chico_h:    [1, 104300, 118700],
  mediano:    [94700,  116700, 138700],
  mediano_h:  [94700,  116700, 138700],
  grande:     [128800, 164800, 200800],
  grande_h:   [128800, 164800, 200800],
  vertical:   [94700,  116700, 138700],
  cuadrado:   [125800, 161800, 197800],
}

// "chico"/"chico_h" está intencionalmente en $1 — se usa para testear el flujo de compra, no cambiar.
export const TEXT_EXTRA_BY_SIZE: Record<string, number> = {
  chico:      1,
  chico_h:    1,
  mediano:    10000,
  mediano_h:  10000,
  grande:     10000,
  grande_h:   10000,
  vertical:   10000,
  cuadrado:   10000,
}

export const PAGE_OPTIONS_SMALL = [
  { photos: 'hasta 100 fotos', pages: 20 },
  { photos: 'hasta 180 fotos', pages: 30 },
  { photos: 'hasta 240 fotos', pages: 40 },
]
export const PAGE_OPTIONS_LARGE = [
  { photos: 'hasta 160 fotos', pages: 20 },
  { photos: 'hasta 240 fotos', pages: 30 },
  { photos: 'hasta 350 fotos', pages: 40 },
]

export const LARGE_SIZES = ['grande', 'grande_h', 'cuadrado']

// Precio plano por unidad — usado para copias extra / reórdenes (no depende de cantidad de páginas,
// se toma el precio base de 20 páginas de PRICES_BY_PAGES como valor único).
// "chico_h" está intencionalmente en $1 — se usa para testear el flujo de compra, no cambiar.
export const REORDER_UNIT_PRICE: Record<string, number> = {
  chico_h:   1,
  mediano_h: 94700,
  grande_h:  128800,
  vertical:  94700,
  cuadrado:  125800,
}

/**
 * Recalcula el precio total de un fotolibro nuevo a partir de campos guardados en la orden.
 * Usado server-side para no confiar en el monto que manda el navegador.
 */
export function computeBookTotal(sizeId: string, pagesBase: number, extraText: boolean): number | null {
  const isLarge     = LARGE_SIZES.includes(sizeId)
  const pageOptions = isLarge ? PAGE_OPTIONS_LARGE : PAGE_OPTIONS_SMALL
  const pageIdx     = pageOptions.findIndex(o => o.pages === pagesBase)
  if (pageIdx === -1) return null

  const prices = PRICES_BY_PAGES[sizeId]
  if (!prices) return null

  const textExtraPrice = TEXT_EXTRA_BY_SIZE[sizeId] ?? 10000
  return prices[pageIdx] + (extraText ? textExtraPrice : 0)
}

/** Descuento por cantidad de copias — 20% off a partir de 3 unidades. */
export function copiesDiscount(copies: number): number {
  return copies >= 3 ? 0.8 : 1
}

// ─── Vinos ──────────────────────────────────────────────────────────────────
// Precio base en $2 intencionalmente — se usa para testear el flujo de compra, no cambiar
// (mismo criterio que "chico"/"chico_h" en PRICES_BY_PAGES). Está en $2 y no $1 para que la
// seña (50%) y el saldo (50%) den $1 cada uno en vez de $1 + $0 por el redondeo.

export const VINO_PRICE_BASE = 2

export const VINO_INFO = {
  nombre:   'Las Perdices',
  bodega:   'Viña Las Perdices',
  linea:    'Reserva',
  varietal: 'Pinot Noir',
  origen:   'Mendoza, Argentina',
  volumen:  '750 ml',
}

export const VINO_DESIGN_EXTRA: Record<'foto_y_texto' | 'diseno_personalizado', number> = {
  foto_y_texto:         0,
  diseno_personalizado: 1,
}

export const VINO_CANTIDADES = [1, 2, 3, 4, 5, 6] as const
export const VINO_CANTIDAD_MAX = 6

/** 25% off al pedir el máximo de 6 botellas. */
export function vinoDiscount(cantidad: number): number {
  return cantidad >= 6 ? 0.75 : 1
}

/**
 * Recalcula el precio total de un pedido de vino a partir de campos guardados en la orden.
 * Usado server-side para no confiar en el monto que manda el navegador.
 */
export function computeVinoTotal(disenoTipo: string, cantidad: number): number | null {
  const extra = VINO_DESIGN_EXTRA[disenoTipo as 'foto_y_texto' | 'diseno_personalizado']
  if (extra === undefined) return null
  if (!VINO_CANTIDADES.includes(cantidad as typeof VINO_CANTIDADES[number])) return null
  return (VINO_PRICE_BASE + extra) * cantidad * vinoDiscount(cantidad)
}

// ─── Cartas personalizadas ─────────────────────────────────────────────────
// Mazo de truco o poker con la misma foto en todas las cartas. Mismo precio
// para ambos tipos. Se paga 100% al comprar (sin seña) porque no hay etapa
// de diseño/preview — el cliente sube una foto y se imprime tal cual.
// Precio en $1 intencionalmente — se usa para testear el flujo de compra, no cambiar.

export const CARTA_PRICE = 1

/**
 * Recalcula el precio total de un pedido de cartas a partir de la cantidad de mazos.
 * Usado server-side para no confiar en el monto que manda el navegador.
 */
export function computeCartasTotal(copies: number): number | null {
  if (!Number.isInteger(copies) || copies < 1) return null
  return CARTA_PRICE * copies
}
