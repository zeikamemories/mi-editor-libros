import { NextRequest, NextResponse } from 'next/server'
import { fetchShippingPrice } from '../../lib/shippingQuote'

export async function GET(req: NextRequest) {
  const cp = req.nextUrl.searchParams.get('cp')?.trim()

  if (!cp || !/^\d{4}$/.test(cp)) {
    return NextResponse.json({ error: 'Código postal inválido (debe ser 4 dígitos)' }, { status: 400 })
  }

  try {
    const price = await fetchShippingPrice(cp)
    return NextResponse.json({ cp, price })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'No se pudo consultar el costo de envío'
    return NextResponse.json({ error: message }, { status: 404 })
  }
}
