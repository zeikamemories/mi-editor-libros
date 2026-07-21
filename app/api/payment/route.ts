import { NextRequest, NextResponse } from 'next/server'
import { MercadoPagoConfig, Preference } from 'mercadopago'
import { createClient } from '@supabase/supabase-js'
import {
  computeBookTotal, computeVinoTotal, computeCartasTotal,
  REORDER_UNIT_PRICE, copiesDiscount,
} from '../../config/pricing'
import { fetchShippingPrice } from '../../lib/shippingQuote'

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN!,
})

// El monto a cobrar SIEMPRE se recalcula acá, del lado del servidor, a partir de lo que hay
// guardado en la orden — nunca se confía en un monto que mande el navegador (evita que alguien
// intercepte el pedido y pague de menos).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })

    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Checkout combinado ("Listos para comprar" — uno o varios pedidos juntos) ──
    if (Array.isArray(body.orders)) {
      const {
        orders: items, deliveryType, cp, address, isReorder,
        successUrl, failureUrl,
      } = body as {
        orders: { orderId: string; copies: number; cardType?: 'truco' | 'poker' }[]
        deliveryType: 'andreani' | 'pickup'
        cp?: string
        address?: string
        isReorder?: boolean
        successUrl?: string
        failureUrl?: string
      }

      if (!items?.length) return NextResponse.json({ error: 'Faltan pedidos' }, { status: 400 })

      const orderIds = items.map(i => i.orderId)
      const mpItems: { id: string; title: string; quantity: number; unit_price: number; currency_id: string }[] = []

      for (const item of items) {
        const copiesNum = Number(item.copies)
        if (!Number.isInteger(copiesNum) || copiesNum < 1 || copiesNum > 100) {
          return NextResponse.json({ error: 'Cantidad inválida' }, { status: 400 })
        }

        const { data: order, error: orderError } = await admin
          .from('orders')
          .select('size, price_paid, product_type, book_name, diseno_tipo')
          .eq('id', item.orderId)
          .single()

        if (orderError || !order) {
          return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
        }

        const effectivePaid = isReorder ? 0 : order.price_paid
        let amount: number
        let title: string

        if (order.product_type === 'cartas') {
          const total = computeCartasTotal(copiesNum)
          if (total === null) {
            return NextResponse.json({ error: 'Cantidad de mazos inválida' }, { status: 400 })
          }
          amount = Math.round(total - effectivePaid)
          title  = `Cartas personalizadas Zeika (${item.cardType ?? 'poker'}) — ${order.book_name}`
        } else if (order.product_type === 'vino') {
          const total = computeVinoTotal(order.diseno_tipo ?? '', copiesNum)
          if (total === null) {
            return NextResponse.json({ error: 'No se pudo calcular el precio del vino' }, { status: 400 })
          }
          amount = Math.round(total - effectivePaid)
          title  = `Vino personalizado Zeika — ${order.book_name}`
        } else {
          const unitPrice = REORDER_UNIT_PRICE[order.size]
          if (unitPrice === undefined) {
            return NextResponse.json({ error: 'Tamaño de pedido inválido' }, { status: 400 })
          }
          const subtotal = copiesNum * unitPrice * copiesDiscount(copiesNum)
          amount = Math.round(subtotal - effectivePaid)
          title  = `Fotolibro Zeika — ${order.book_name}`
        }

        if (!(amount > 0)) {
          return NextResponse.json({ error: 'El monto calculado no es válido' }, { status: 400 })
        }

        await admin.from('orders').update({
          copies: copiesNum,
          ...(order.product_type === 'cartas' ? { card_type: item.cardType ?? 'poker' } : {}),
        }).eq('id', item.orderId)

        mpItems.push({ id: item.orderId, title, quantity: 1, unit_price: amount, currency_id: 'ARS' })
      }

      // Envío — una sola cotización para todo el combo
      if (deliveryType === 'andreani') {
        if (!cp || !/^\d{4}$/.test(String(cp))) {
          return NextResponse.json({ error: 'Código postal inválido' }, { status: 400 })
        }
        let shippingTotal: number
        try {
          shippingTotal = await fetchShippingPrice(String(cp))
        } catch {
          return NextResponse.json({ error: 'No se pudo calcular el costo de envío' }, { status: 400 })
        }
        if (shippingTotal > 0) {
          mpItems.push({ id: 'envio', title: 'Envío Andreani', quantity: 1, unit_price: Math.round(shippingTotal), currency_id: 'ARS' })
        }
      }

      await admin.from('orders').update({
        delivery_type:    deliveryType,
        delivery_address: deliveryType === 'andreani' ? (address ?? '') : 'Retiro en fábrica',
      }).in('id', orderIds)

      const preference = new Preference(client)
      const result = await preference.create({
        body: {
          items: mpItems,
          back_urls: {
            success: successUrl ?? `${base}/mis-proyectos/confirmado?order_ids=${orderIds.join(',')}`,
            failure: failureUrl ?? `${base}/mis-proyectos?tab=listos&error=1`,
            pending: `${base}/mis-proyectos/confirmado?order_ids=${orderIds.join(',')}&status=pending`,
          },
          auto_return: 'approved',
          external_reference: JSON.stringify(orderIds),
        },
      })

      return NextResponse.json({ url: result.init_point })
    }

    // ── Pedido único — primer pago (fotolibro/vino recién creados) ──────────────
    const { orderId, bookName, successUrl, failureUrl } = body

    if (!orderId) return NextResponse.json({ error: 'Falta orderId' }, { status: 400 })

    const { data: order, error: orderError } = await admin
      .from('orders')
      .select('size, pages_base, extra_text, price_paid, status, product_type, diseno_tipo, copies')
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })
    }

    const isVino = order.product_type === 'vino'
    let amount: number

    if (isVino) {
      // Primer pago de un vino (recién creado en /orden-vino): 50% del precio recalculado acá.
      const total = computeVinoTotal(order.diseno_tipo, order.copies ?? 1)
      if (total === null) {
        return NextResponse.json({ error: 'No se pudo calcular el precio del pedido' }, { status: 400 })
      }
      amount = Math.round(total / 2)
    } else {
      // Primer pago de un fotolibro (recién creado en /orden): 50% del precio recalculado acá.
      const total = computeBookTotal(order.size, order.pages_base, order.extra_text)
      if (total === null) {
        return NextResponse.json({ error: 'No se pudo calcular el precio del pedido' }, { status: 400 })
      }
      amount = Math.round(total / 2)
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
