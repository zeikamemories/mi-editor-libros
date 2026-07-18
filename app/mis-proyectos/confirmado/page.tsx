'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Navbar from '../../components/Landing/Navbar/Navbar'
import '../mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string | null
  product_type: string | null
  copies: number | null
  price_paid: number
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function orderName(o: Order) {
  return o.product_type === 'cartas' ? `Cartas — ${o.book_name}` : o.book_name
}

function ConfirmadoContent() {
  const searchParams = useSearchParams()
  const router        = useRouter()
  const status        = searchParams.get('status')
  const paymentId     = searchParams.get('payment_id') || searchParams.get('collection_id')
  const orderIds      = (searchParams.get('order_ids') ?? '').split(',').filter(Boolean)

  const [orders, setOrders] = useState<Order[]>([])
  const [done,   setDone]   = useState(false)

  useEffect(() => {
    if (status === 'failure' || orderIds.length === 0) { setDone(true); return }

    // El estado de estos pedidos solo lo escribe el servidor, después de verificar el pago
    // contra la API real de MercadoPago — ver app/api/confirm-payment/route.ts.
    fetch('/api/confirm-payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderIds, paymentId }),
    })
      .then(res => res.json())
      .then(data => {
        setOrders((data.orders ?? []) as Order[])
        setDone(true)
      })
      .catch(() => setDone(true))
  }, [status, paymentId, orderIds.join(',')])

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
        <button className="mpconf2-cta" onClick={() => router.push('/mis-proyectos?tab=listos')}>
          Volver al pago
        </button>
      </div>
    </div>
  )

  return (
    <div className="mpconf2-page">
      <Navbar />
      <div className="mpconf2-body">

        <div className="mpconf2-hero">
          <div className="mpconf2-check-circle">
            <svg width="22" height="17" viewBox="0 0 22 17" fill="none">
              <path d="M2 8.5L8.5 15L20 2" stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p className="mpconf2-title">¡Pedido{orders.length > 1 ? 's' : ''} confirmado{orders.length > 1 ? 's' : ''}!</p>
          <p className="mpconf2-subtitle">
            {orders.length > 1
              ? 'Tus productos están siendo enviados a producción.'
              : 'Tu producto está siendo enviado a producción.'}
          </p>
        </div>

        <div className="mpconf2-wpp-box">
          Te mandamos el comprobante por WhatsApp al +54 9 11 6264 3005.<br /><br />
          También te avisamos cuando salga a distribución.
        </div>

        <div className="mp-listos-list">
          {orders.map(o => (
            <div key={o.id} className="mp-listos-row">
              <div className="mp-listos-info">
                <span className="mp-listos-name">{orderName(o)}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mpconf2-cta-wrap">
          <button className="mpconf2-cta" onClick={() => router.push('/mis-proyectos')}>
            Ir a mis pedidos
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ConfirmadoPage() {
  return <Suspense><ConfirmadoContent /></Suspense>
}
