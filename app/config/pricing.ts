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
// Precios placeholder — a definir con el dueño del producto antes de lanzar.

export const VINO_PRICE_BASE: Record<'tinto' | 'blanco', number> = {
  tinto:  45000,
  blanco: 45000,
}

export const VINO_DESIGN_EXTRA: Record<'foto_y_texto' | 'diseno_personalizado', number> = {
  foto_y_texto:         0,
  diseno_personalizado: 15000,
}

export const VINO_CANTIDADES = [1, 6] as const

/**
 * Recalcula el precio total de un pedido de vino a partir de campos guardados en la orden.
 * Usado server-side para no confiar en el monto que manda el navegador.
 */
export function computeVinoTotal(
  variedad: string, disenoTipo: string, cantidad: number,
): number | null {
  const base  = VINO_PRICE_BASE[variedad as 'tinto' | 'blanco']
  const extra = VINO_DESIGN_EXTRA[disenoTipo as 'foto_y_texto' | 'diseno_personalizado']
  if (base === undefined || extra === undefined) return null
  if (!VINO_CANTIDADES.includes(cantidad as 1 | 6)) return null
  return (base + extra) * cantidad
}
