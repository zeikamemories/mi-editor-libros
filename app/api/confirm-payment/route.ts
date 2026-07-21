import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { fetchMpPayment } from '../../lib/mercadopago'
import { getServiceAccountAuth, buildDocsTemplateRequests, ZEIKA_EMAIL } from '../../lib/googleWorkspace'
import { REORDER_UNIT_PRICE, copiesDiscount, computeVinoTotal, computeCartasTotal } from '../../config/pricing'

// Único lugar que puede marcar un pedido como pagado. MercadoPago redirige al browser al
// back_url con `payment_id` + `status` en la URL — pero esos query params los controla
// completamente el que arma la URL (cualquiera puede navegar directo a /orden/confirmado?
// order_id=X sin haber pagado nada). Antes, esas dos páginas hacían el `supabase.update()`
// directo confiando en esos params. Acá se verifica primero, contra la API real de
// MercadoPago, que el pago exista, esté aprobado, y que su `external_reference` coincida
// exactamente con el/los pedido(s) que se están confirmando — recién ahí se escribe.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      paymentId?: string
      status?: string
      orderId?: string
      reorderFrom?: string
      orderIds?: string[]
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 })
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    // ── Pago combinado (segundo pago / reórdenes / cartas / "listos para comprar") ──
    if (Array.isArray(body.orderIds) && body.orderIds.length > 0) {
      const { orderIds, paymentId } = body
      if (!paymentId) return NextResponse.json({ error: 'Falta paymentId' }, { status: 400 })

      const payment = await fetchMpPayment(String(paymentId))
      if (!payment || payment.status !== 'approved') {
        return NextResponse.json({ error: 'El pago no está aprobado' }, { status: 402 })
      }
      if (payment.external_reference !== JSON.stringify(orderIds)) {
        return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 })
      }

      const nowIso = new Date().toISOString()
      const results = []
      for (const id of orderIds) {
        const { data } = await admin.from('orders').select('*').eq('id', id).single()
        if (!data) continue

        // Idempotente — si ya se procesó (reintento del usuario, doble llamada), no repetir.
        if (['en_produccion', 'en_camino', 'entregado'].includes(data.status)) {
          results.push(data)
          continue
        }

        const newDates = { ...(data.status_dates ?? {}), en_produccion: nowIso }
        const secondPaid = data.product_type === 'cartas'
          ? Math.round(computeCartasTotal(data.copies ?? 1) ?? 0)
          : data.product_type === 'vino'
            ? Math.round((computeVinoTotal(data.diseno_tipo, data.copies ?? 1) ?? 0) - data.price_paid)
            : Math.round((data.copies ?? 1) * (REORDER_UNIT_PRICE[data.size] ?? data.price_total) * copiesDiscount(data.copies ?? 1) - data.price_paid)

        await admin.from('orders').update({
          status: 'en_produccion',
          second_price_paid: secondPaid,
          status_dates: newDates,
        }).eq('id', id)

        results.push({ ...data, status: 'en_produccion', second_price_paid: secondPaid })
      }

      return NextResponse.json({ ok: true, orders: results })
    }

    // ── Pedido único — primer pago (fotolibro/vino recién creados) ──────────────
    const { orderId, status, reorderFrom, paymentId } = body
    if (!orderId) return NextResponse.json({ error: 'Falta orderId' }, { status: 400 })

    if (status === 'pending') {
      await admin.from('orders').update({ status: 'pendiente_pago' }).eq('id', orderId)
      const { data: order } = await admin.from('orders').select('product_type').eq('id', orderId).single()
      return NextResponse.json({ ok: true, pending: true, isVino: order?.product_type === 'vino' })
    }
    if (status === 'failure') {
      const { data: order } = await admin.from('orders').select('product_type').eq('id', orderId).single()
      return NextResponse.json({ ok: true, failure: true, isVino: order?.product_type === 'vino' })
    }

    if (!paymentId) return NextResponse.json({ error: 'Falta paymentId' }, { status: 400 })
    const payment = await fetchMpPayment(String(paymentId))
    if (!payment || payment.status !== 'approved') {
      return NextResponse.json({ error: 'El pago no está aprobado' }, { status: 402 })
    }
    if (payment.external_reference !== orderId) {
      return NextResponse.json({ error: 'El pago no corresponde a este pedido' }, { status: 403 })
    }

    const { data: order, error: orderError } = await admin.from('orders').select('*').eq('id', orderId).single()
    if (orderError || !order) return NextResponse.json({ error: 'Pedido no encontrado' }, { status: 404 })

    // Idempotente — si ya estaba confirmado (reintento), no repetir la creación de carpeta/doc.
    if (order.status !== 'pendiente_pago' && order.status !== 'confirmado') {
      return NextResponse.json({ ok: true, isVino: order.product_type === 'vino', alreadyProcessed: true })
    }

    const now = new Date().toISOString()
    await admin.from('orders').update({
      status: 'confirmado',
      status_dates: { ...(order.status_dates ?? {}), confirmado: now },
    }).eq('id', orderId)

    if (order.product_type === 'vino') {
      return NextResponse.json({ ok: true, isVino: true })
    }

    const { data: existingProject } = await admin.from('projects').select('id').eq('order_id', orderId).maybeSingle()
    if (existingProject) {
      return NextResponse.json({ ok: true })
    }

    // El email del cliente se resuelve acá server-side (nunca se confía en uno que mande
    // el browser) para compartirle la carpeta/doc de Drive.
    const { data: userData } = await admin.auth.admin.getUserById(order.user_id)
    const clientEmail = userData.user?.email ?? null

    if (reorderFrom) {
      const { data: srcProject } = await admin
        .from('projects')
        .select('spreads, photos, total_spreads, cover_thumbnail')
        .eq('order_id', reorderFrom)
        .maybeSingle()

      await admin.from('projects').insert({
        name:             order.book_name ?? 'Sin título',
        book_size:        order.size ?? 'vertical',
        total_spreads:    srcProject?.total_spreads ?? 13,
        photos:           srcProject?.photos        ?? [],
        spreads:          srcProject?.spreads       ?? {},
        cover_thumbnail:  srcProject?.cover_thumbnail ?? null,
        order_id:         orderId,
      })

      await admin.from('orders').update({
        status: 'material_recibido',
        status_dates: { ...(order.status_dates ?? {}), confirmado: now, material_recibido: now },
      }).eq('id', orderId)

      return NextResponse.json({ ok: true, isReorder: true })
    }

    const folderName = `Zeika - ${order.book_name ?? 'Sin título'} - ${orderId.slice(0, 8).toUpperCase()}`
    let driveLink: string | null = null
    let docsLink:  string | null = null

    try {
      const auth  = getServiceAccountAuth()
      const drive = google.drive({ version: 'v3', auth })
      const docs  = google.docs({ version: 'v1', auth })

      const folder = await drive.files.create({
        requestBody: { name: folderName, mimeType: 'application/vnd.google-apps.folder' },
        fields: 'id',
      })
      const folderId = folder.data.id!
      driveLink = `https://drive.google.com/drive/folders/${folderId}`

      await drive.permissions.create({
        fileId: folderId, sendNotificationEmail: true,
        requestBody: { type: 'user', role: 'writer', emailAddress: ZEIKA_EMAIL },
      })
      if (clientEmail) {
        await drive.permissions.create({
          fileId: folderId, sendNotificationEmail: true,
          requestBody: { type: 'user', role: 'writer', emailAddress: clientEmail },
        })
      }

      const file = await drive.files.create({
        requestBody: {
          name: `Textos - ${order.book_name ?? 'Sin título'}`,
          mimeType: 'application/vnd.google-apps.document',
          parents: [folderId],
        },
        fields: 'id',
      })
      const docId = file.data.id!
      await docs.documents.batchUpdate({
        documentId: docId,
        requestBody: { requests: buildDocsTemplateRequests(order.book_name ?? 'Sin título', order.extra_text ?? false) },
      })
      await drive.permissions.create({
        fileId: docId, sendNotificationEmail: false,
        requestBody: { type: 'user', role: 'writer', emailAddress: ZEIKA_EMAIL },
      })
      if (clientEmail) {
        await drive.permissions.create({
          fileId: docId, sendNotificationEmail: false,
          requestBody: { type: 'user', role: 'writer', emailAddress: clientEmail },
        })
      }
      docsLink = `https://docs.google.com/document/d/${docId}/edit`
    } catch (err) {
      // El proyecto se crea igual — la carpeta/doc se puede regenerar después desde
      // "Mis proyectos" (botón "Generar carpeta de Drive").
      console.error('confirm-payment: drive/docs error:', err)
    }

    const SIZE_MAP: Record<string, string> = {
      chico_h: 'chico', mediano_h: 'mediano', grande_h: 'grande',
      vertical: 'vertical', cuadrado: 'cuadrado',
    }
    const bookSizeId = SIZE_MAP[order.size ?? ''] ?? 'vertical'
    const totalPages = (order.pages_base ?? 20) + (order.extra_pages ?? 0)

    await Promise.all([
      admin.from('projects').insert({
        name:          order.book_name ?? 'Sin título',
        book_size:     bookSizeId,
        total_spreads: totalPages - 1,
        photos:        [],
        spreads:       {},
        order_id:      orderId,
      }),
      admin.from('orders').update({
        ...(driveLink ? { drive_link: driveLink } : {}),
        ...(docsLink  ? { docs_link:  docsLink  } : {}),
      }).eq('id', orderId),
    ])

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('confirm-payment error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
