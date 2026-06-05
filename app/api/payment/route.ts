import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

export async function POST(req: NextRequest) {
  try {
    const { orderId, bookName, amount } = await req.json()

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
          success: `http://localhost:3000/orden/confirmado?order_id=${orderId}`,
          failure: `http://localhost:3000/orden/confirmado?order_id=${orderId}&status=failure`,
          pending: `http://localhost:3000/orden/confirmado?order_id=${orderId}&status=pending`,
        },
        external_reference: orderId,
      },
    })

    return NextResponse.json({ url: result.init_point })
  } catch (err) {
    console.error('MP error:', err)
    return NextResponse.json({ error: 'Error creando preferencia' }, { status: 500 })
  }
}
