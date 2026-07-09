// Consulta el costo de envío por código postal — usado tanto por /api/shipping-quote (para
// mostrarlo en pantalla) como por /api/payment (para recalcular el monto a cobrar server-side).
export async function fetchShippingPrice(cp: string): Promise<number> {
  const res = await fetch('https://www.fabricadefotolibros.com/calculo-costo-de-envio/', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    `action=calcular&cp=${cp}`,
  })

  const html = await res.text()

  // Extract price from: <span>$ ar 9832.27 *</span>
  const match = html.match(/\$\s*ar\s*([\d.,]+)/)
  if (!match) throw new Error('No se encontró precio para ese código postal')

  return parseFloat(match[1].replace(',', '.'))
}
