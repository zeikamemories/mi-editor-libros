'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useParams } from 'next/navigation'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import { REORDER_UNIT_PRICE } from '../../../config/pricing'
import Navbar from '../../../components/Landing/Navbar/Navbar'
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
  status_dates: Record<string, string> | null
}

const STEPS = [
  { key: 'confirmado',        label: 'Pedido confirmado'  },
  { key: 'material_recibido', label: 'Material recibido'  },
  { key: 'en_diseno',         label: 'En diseño'          },
  { key: 'preview_listo',     label: 'Preview disponible' },
  { key: 'en_produccion',     label: 'En producción'      },
  { key: 'en_camino',         label: 'En camino'          },
  { key: 'entregado',         label: 'Entregado'          },
]

const STATUS_ORDER = STEPS.map(s => s.key)

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function ConfirmadoContent() {
  const params       = useParams()
  const searchParams = useSearchParams()
  const router       = useRouter()
  const orderId      = params.orderId as string
  const status       = searchParams.get('status')

  const [order, setOrder] = useState<Order | null>(null)
  const [done,  setDone]  = useState(false)

  useEffect(() => {
    if (status === 'failure') { setDone(true); return }

    supabase.from('orders').select('*').eq('id', orderId).single()
      .then(async ({ data }) => {
        if (!data) { setDone(true); return }
        const discount   = (data.copies ?? 1) >= 3 ? 0.8 : 1
        const total      = (data.copies ?? 1) * (REORDER_UNIT_PRICE[data.size] ?? data.price_total) * discount
        const secondPaid = Math.round(total - data.price_paid)
        const nowIso     = new Date().toISOString()
        const newDates   = { ...(data.status_dates ?? {}), en_produccion: nowIso }
        await supabase.from('orders').update({
          status:            'en_produccion',
          second_price_paid: secondPaid,
          status_dates:      newDates,
        }).eq('id', orderId)
        setOrder({ ...data, status_dates: newDates } as Order)
        setDone(true)
      })
  }, [orderId, status])

  if (!done) return <div className="mp-loading"><div className="mp-spinner" /></div>

  if (status === 'failure') return (
    <div className="mpconf2-page">
      <Navbar />
      <div className="mpconf2-body">
        <div className="mpconf2-hero">
          <div className="mpconf2-check-circle mpconf2-check-circle--error">✕</div>
          <p className="mpconf2-title">El pago no se completó</p>
          <p className="mpconf2-subtitle">Podés intentarlo de nuevo.</p>
        </div>
        <button className="mpconf2-cta" onClick={() => router.push(`/mis-proyectos/${orderId}/pagar`)}>
          Volver al pago
        </button>
      </div>
    </div>
  )

  if (!order) return null

  const dates        = order.status_dates ?? {}
  const currentIdx   = STATUS_ORDER.indexOf('en_produccion')

  return (
    <div className="mpconf2-page">
      <Navbar />
      <div className="mpconf2-body">

        {/* Hero */}
        <div className="mpconf2-hero">
          <div className="mpconf2-check-circle">
            <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
              <path d="M2 8.5L8.5 15L20 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="mpconf2-title">¡Pedido confirmado!</p>
          <p className="mpconf2-subtitle">
            Tu libro está siendo enviado a producción.<br />
            En 2-3 días hábiles empieza a imprimirse.
          </p>
        </div>

        {/* WhatsApp notice */}
        <div className="mpconf2-wpp-box">
          Te mandamos el comprobante por WhatsApp al +54 9 11 6264 3005.<br /><br />
          También te avisamos cuando el libro salga a distribución.
        </div>

        {/* Próximos pasos */}
        <p className="mpconf2-next-title">Próximos pasos</p>

        {/* Status + CTA pegados */}
        <div className="mpconf2-status-block">
          <div className="mpconf2-status-section">
            <div className="mpconf2-status-header">Estado</div>
            {STEPS.map((step, idx) => {
              const isDone   = idx < currentIdx
              const isActive = idx === currentIdx
              const isFuture = idx > currentIdx
              const dateStr  = dates[step.key]

              return (
                <div
                  key={step.key}
                  className={`mpconf2-status-row${isActive ? ' mpconf2-status-row--active' : ''}`}
                >
                  <div className={
                    `mpconf2-status-icon${isDone ? ' mpconf2-status-icon--done' : isActive ? ' mpconf2-status-icon--active' : ' mpconf2-status-icon--future'}`
                  }>
                    {isDone && (
                      <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
                        <path d="M1.5 6L6 10.5L14.5 1.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {isActive && <span className="mpconf2-status-icon__dot" />}
                  </div>
                  <div className="mpconf2-status-text">
                    <p className={`mpconf2-status-label${isFuture ? ' mpconf2-status-label--future' : ''}`}>
                      {step.label}
                    </p>
                    {dateStr && (
                      <p className="mpconf2-status-date">{fmtDate(dateStr)}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* CTA */}
          <div className="mpconf2-cta-wrap">
            <button className="mpconf2-cta" onClick={() => router.push(`/mis-proyectos/${orderId}`)}>
              Ir al proyecto
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmadoPage() {
  return <Suspense><ConfirmadoContent /></Suspense>
}
