import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import { computeBookTotal, computeVinoTotal, REORDER_UNIT_PRICE, copiesDiscount } from '../../config/pricing'
import { fetchShippingPrice } from '../../lib/shippingQuote'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

// El monto a cobrar SIEMPRE se recalcula acá, del lado del servidor, a partir de lo que hay
// guardado en la orden — nunca se confía en un monto que mande el navegador (evita que alguien
// intercepte el pedido y pague de menos).
export async function POST(req: NextRequest) {
  try {
    const { orderId, bookName, successUrl, failureUrl, copies, deliveryType, cp, isReorder } = await req.json()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    if (!orderId) return NextResponse.json({ error: 'Falta orderId' }, { status: 400 })

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('size, pages_base, extra_text, price_paid, status, product_type, variedad, diseno_tipo, copies')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const isVino = order.product_type === 'vino'
    let amount: number

    if (order.status === 'pendiente_pago' && isVino) {
      // Primer pago de un vino (recién creado en /orden-vino): 50% del precio recalculado acá.
      const total = computeVinoTotal(order.variedad, order.diseno_tipo, order.copies ?? 1)
      if (total === null) {
        return NextResponse.json({ error: 'No se pudo calcular el precio del pedido' }, { status: 400 })
      }
      amount = Math.round(total / 2)
    } else if (order.status === 'pendiente_pago') {
      // Primer pago de un fotolibro (recién creado en /orden): 50% del precio recalculado acá.
      const total = computeBookTotal(order.size, order.pages_base, order.extra_text)
      if (total === null) {
        return NextResponse.json({ error: 'No se pudo calcular el precio del pedido' }, { status: 400 })
      }
      amount = Math.round(total / 2)
    } else {
      // Segundo pago (preview aprobado) o reorden: copias + envío − lo ya pagado.
      const copiesNum = Number(copies)
      if (!Number.isInteger(copiesNum) || copiesNum < 1 || copiesNum > 100) {
        return NextResponse.json({ error: 'Cantidad de copias inválida' }, { status: 400 })
      }

      const unitPrice = REORDER_UNIT_PRICE[order.size]
      if (unitPrice === undefined) {
        return NextResponse.json({ error: 'Tamaño de pedido inválido' }, { status: 400 })
      }

      const subtotal = copiesNum * unitPrice * copiesDiscount(copiesNum)

      let shippingTotal = 0
      if (deliveryType === 'andreani') {
        if (!cp || !/^\d{4}$/.test(String(cp))) {
          return NextResponse.json({ error: 'Código postal inválido' }, { status: 400 })
        }
        try {
          shippingTotal = await fetchShippingPrice(String(cp))
        } catch {
          return NextResponse.json({ error: 'No se pudo calcular el costo de envío' }, { status: 400 })
        }
      }

      const effectivePaid = isReorder ? 0 : order.price_paid
      amount = Math.round(subtotal - effectivePaid + shippingTotal)
    }

    if (!(amount > 0)) {
      return NextResponse.json({ error: 'El monto calculado no es válido' }, { status: 400 })
    }

    const preference = new Preference(client)
    const result = await preference.create({
      body: {
        items: [
          {
            id:         orderId,
            title:      isVino ? `Vino personalizado Zeika — ${bookName}` : `Fotolibro Zeika — ${bookName}`,
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
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : JSON.stringify(err)
    console.error('MP error:', msg)
    return NextResponse.json({ error: 'Error creando preferencia', detail: msg }, { status: 500 })
  }
}
