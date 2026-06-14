import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const cp = req.nextUrl.searchParams.get('cp')?.trim()

  if (!cp || !/^\d{4}$/.test(cp)) {
    return NextResponse.json({ error: 'Código postal inválido (debe ser 4 dígitos)' }, { status: 400 })
  }

  try {
    const res = await fetch('https://www.fabricadefotolibros.com/calculo-costo-de-envio/', {
      method:  'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body:    `action=calcular&cp=${cp}`,
    })

    const html = await res.text()

    // Extract price from: <span>$ ar 9832.27 *</span>
    const match = html.match(/\$\s*ar\s*([\d.,]+)/)
    if (!match) {
      return NextResponse.json({ error: 'No se encontró precio para ese código postal' }, { status: 404 })
    }

    const price = parseFloat(match[1].replace(',', '.'))
    return NextResponse.json({ cp, price })
  } catch {
    return NextResponse.json({ error: 'No se pudo consultar el costo de envío' }, { status: 500 })
  }
}
