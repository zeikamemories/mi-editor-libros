'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import '../../mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string
  copies: number
  delivery_type: string
  delivery_address: string
  price_total: number
  price_paid: number
  created_at: string
}

const SIZE_NAMES: Record<string, string> = {
  chico_h:   'Chico Horizontal · 21×14,8 cm',
  mediano_h: 'Mediano Horizontal · 28×21,6 cm',
  grande_h:  'Grande Horizontal · 41×29 cm',
  vertical:  'Vertical · 28×21,6 cm',
  cuadrado:  'Cuadrado · 29×29 cm',
}

const PRICES: Record<string, number> = {
  chico_h: 100, mediano_h: 81500, grande_h: 100000, vertical: 81500, cuadrado: 97000,
}

function fmt(n: number) { return '$' + n.toLocaleString('es-AR') }
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ConfirmadoSegundoPagoContent() {
  const params      = useParams()
  const searchParams = useSearchParams()
  const orderId     = params.orderId as string
  const status      = searchParams.get('status')

  const [order, setOrder] = useState<Order | null>(null)
  const [done,  setDone]  = useState(false)

  useEffect(() => {
    if (status === 'failure') { setDone(true); return }

    supabase.from('orders').select('*').eq('id', orderId).single()
      .then(async ({ data }) => {
        if (!data) { setDone(true); return }
        setOrder(data as Order)
        const discount   = (data.copies ?? 1) >= 3 ? 0.8 : 1
        const total      = (data.copies ?? 1) * (PRICES[data.size] ?? data.price_total) * discount
        const secondPaid = Math.round(total - data.price_paid)
        await supabase.from('orders').update({
          status:            'en_produccion',
          second_price_paid: secondPaid,
          status_dates:      { ...(data.status_dates ?? {}), en_produccion: new Date().toISOString() },
        }).eq('id', orderId)
        setDone(true)
      })
  }, [orderId, status])

  if (!done) return <div className="mp-loading"><div className="mp-spinner" /></div>

  if (status === 'failure') return (
    <div className="mp-conf-root">
      <div className="mp-conf-check" style={{ background: '#c0392b' }}>✕</div>
      <h2 className="mp-conf-title">El pago no se completó</h2>
      <p className="mp-conf-sub">Podés intentarlo de nuevo.</p>
      <Link href={`/mis-proyectos/${orderId}/pagar`} className="mp-conf-btn">
        Volver al pago
      </Link>
    </div>
  )

  if (!order) return null

  const copies   = order.copies ?? 1
  const discount = copies >= 3 ? 0.8 : 1
  const total    = copies * (PRICES[order.size] ?? order.price_total) * discount
  const pagado   = fmt(Math.round(total - order.price_paid) + (order.delivery_type === 'pickup' ? 0 : 0))

  return (
    <div className="mp-conf-root">
      <div className="mp-conf-check">✓</div>
      <h2 className="mp-conf-title">¡Compra confirmada!</h2>
      <p className="mp-conf-sub">Tu libro va a producción. En 2–3 días hábiles empieza a imprimirse.</p>

      <div className="mp-conf-summary">
        <div className="mp-conf-summary-label">Resumen</div>
        <div className="mp-conf-row"><span>Proyecto</span><span>{order.book_name}</span></div>
        <div className="mp-conf-row"><span>Copias</span><span>{copies}</span></div>
        <div className="mp-conf-row"><span>Formato</span><span>{SIZE_NAMES[order.size] ?? order.size}</span></div>
        <div className="mp-conf-row">
          <span>Entrega</span>
          <span>{order.delivery_type === 'pickup' ? 'Retiro en fábrica' : `Andreani · ${order.delivery_address}`}</span>
        </div>
        <div className="mp-conf-row"><span>Pagado</span><span>{pagado}</span></div>
      </div>

      <div className="mp-conf-wpp">
        Te mandamos el comprobante por WhatsApp. También te avisamos cuando el libro salga a distribución.
      </div>

      <p className="mp-conf-next-title">Qué pasa ahora</p>
      <div className="mp-conf-timeline">
        {[
          { label: 'Pago confirmado', date: fmtDate(new Date().toISOString()), done: true },
          { label: 'En producción',   date: 'Estimado: 2–3 días hábiles',      done: false },
          { label: 'En camino',       date: 'Estimado: 5–7 días hábiles',      done: false },
          { label: 'Entregado',       date: 'Estimado: 7–10 días hábiles',     done: false },
        ].map((step, i) => (
          <div key={i} className="mp-timeline-step">
            <div className={`mp-step-icon ${step.done ? 'mp-step-icon--done' : 'mp-step-icon--grey'}`}>
              {step.done ? '✓' : null}
            </div>
            <div className="mp-step-info">
              <div className="mp-step-label">{step.label}</div>
              <div className="mp-step-date">{step.date}</div>
            </div>
          </div>
        ))}
      </div>

      <Link href="/mis-proyectos" className="mp-conf-btn">
        Ir a mis proyectos
      </Link>
    </div>
  )
}

export default function ConfirmadoSegundoPagoPage() {
  return <Suspense><ConfirmadoSegundoPagoContent /></Suspense>
}
