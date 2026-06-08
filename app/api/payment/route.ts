import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const { orderId, bookName, amount, successUrl, failureUrl } = await req.json()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const preference = new Preference(client)
    const result = await preference.create({
      body: {
        items: [
          {
            id:         orderId,
            title:      `Fotolibro Zeika — ${bookName}`,
            quantity:   1,
            unit_price: amount,
            currency_id: 'ARS',
          },
        ],
        back_urls: {
          success: successUrl ?? `${base}/orden/confirmado?order_id=${orderId}`,
          failure: failureUrl ?? `${base}/orden/confirmado?order_id=${orderId}&status=failure`,
          pending: `${base}/orden/confirmado?order_id=${orderId}&status=pending`,
        },
        auto_return: 'approved',
        external_reference: orderId,
      },
    })

    return NextResponse.json({ url: result.init_point })
  } catch (err) {
    console.error('MP error:', err)
    return NextResponse.json({ error: 'Error creando preferencia' }, { status: 500 })
  }
}
