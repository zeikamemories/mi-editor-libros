'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../lib/supabase'
import '../../mis-proyectos.css'

interface Order {
  id: string
  book_name: string
  size: string
  price_total: number
  price_paid: number
}

const PRICES: Record<string, number> = {
  chico_h:   1,
  mediano_h: 81500,
  grande_h:  100000,
  vertical:  81500,
  cuadrado:  97000,
}

const SIZE_NAMES: Record<string, string> = {
  chico_h:   'Chico Horizontal · 21×14,8 cm',
  mediano_h: 'Mediano Horizontal · 28×21,6 cm',
  grande_h:  'Grande Horizontal · 41×29 cm',
  vertical:  'Vertical · 28×21,6 cm',
  cuadrado:  'Cuadrado · 29×29 cm',
}

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

export default function PagarPage() {
  const router  = useRouter()
  const params  = useParams()
  const orderId = params.orderId as string

  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(false)

  const [copies,        setCopies]        = useState(1)
  const [deliveryType,  setDeliveryType]  = useState<'andreani' | 'pickup'>('andreani')
  const [address,       setAddress]       = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      supabase.from('orders').select('id, book_name, size, price_total, price_paid, status')
        .eq('id', orderId).eq('user_id', session.user.id).single()
        .then(({ data }) => {
          if (!data || !['preview_listo'].includes((data as any).status ?? '')) {
            router.replace(`/mis-proyectos/${orderId}`)
            return
          }
          setOrder(data as Order)
          setLoading(false)
        })
    })
  }, [orderId, router])

  if (loading || !order) return (
    <div className="mp-loading"><div className="mp-spinner" /></div>
  )

  const unitPrice = PRICES[order.size] ?? order.price_total
  const discount  = copies >= 3 ? 0.8 : 1
  const subtotal  = copies * unitPrice * discount
  const payNow    = Math.round(subtotal - order.price_paid)

  async function handlePay() {
    if (deliveryType === 'andreani' && !address.trim()) return
    setPaying(true)

    await supabase.from('orders').update({
      copies,
      delivery_type:    deliveryType,
      delivery_address: address,
    }).eq('id', order!.id)

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const res = await fetch('/api/payment', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order!.id,
        bookName:   order!.book_name,
        amount:     payNow,
        successUrl: `${siteUrl}/mis-proyectos/${order!.id}/confirmado`,
        failureUrl: `${siteUrl}/mis-proyectos/${order!.id}/pagar?error=1`,
      }),
    })
    const data = await res.json()
    if (data.url) window.location.href = data.url
    else setPaying(false)
  }

  return (
    <div className="mp-pagar-root">
      <header className="mp-pagar-header">
        <Link href={`/mis-proyectos/${orderId}`} className="mp-pagar-back">←</Link>
        <div style={{ flex: 1, fontFamily: '"forma-djr-display",sans-serif', fontSize: 16, fontWeight: 500 }}>
          Mis Proyectos
        </div>
      </header>

      <div className="mp-pagar-main">
        <h1 className="mp-pagar-title">Finalizar compra</h1>
        <p className="mp-pagar-sub">{order.book_name}</p>

        {/* Cantidad de copias */}
        <div className="mp-pagar-card">
          <span className="mp-pagar-card-label">Cantidad de copias</span>
          <div className="mp-copies-row">
            <div className="mp-copies-counter">
              <button className="mp-copies-btn" onClick={() => setCopies(c => Math.max(1, c - 1))} disabled={copies <= 1}>−</button>
              <span className="mp-copies-num">{copies}</span>
              <button className="mp-copies-btn" onClick={() => setCopies(c => c + 1)}>+</button>
            </div>
            <span className="mp-copies-price">{fmt(unitPrice * discount)} c/u · Total {fmt(subtotal * discount)}</span>
          </div>
          {copies >= 3 && (
            <div className="mp-discount-notice">A partir de 3 copias: 20% de descuento</div>
          )}
        </div>

        {/* Entrega */}
        <div className="mp-pagar-card">
          <span className="mp-pagar-card-label">Entrega</span>

          <div
            className={`mp-delivery-option ${deliveryType === 'andreani' ? 'mp-delivery-option--selected' : ''}`}
            onClick={() => setDeliveryType('andreani')}
          >
            <div className={`mp-delivery-radio ${deliveryType === 'andreani' ? 'mp-delivery-radio--selected' : ''}`} />
            <div className="mp-delivery-info">
              <div className="mp-delivery-title">
                Envío por Andreani
                <span className="mp-delivery-price">a calcular</span>
              </div>
              <div className="mp-delivery-desc">Todo el país y Uruguay · 2–7 días hábiles</div>
              {deliveryType === 'andreani' && (
                <input
                  className="mp-address-input"
                  placeholder="Dirección de entrega"
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                />
              )}
            </div>
          </div>

          <div
            className={`mp-delivery-option ${deliveryType === 'pickup' ? 'mp-delivery-option--selected' : ''}`}
            onClick={() => setDeliveryType('pickup')}
          >
            <div className={`mp-delivery-radio ${deliveryType === 'pickup' ? 'mp-delivery-radio--selected' : ''}`} />
            <div className="mp-delivery-info">
              <div className="mp-delivery-title">
                Retiro en fábrica
                <span className="mp-delivery-price" style={{ color: '#2a7a4f' }}>Gratis</span>
              </div>
              <div className="mp-delivery-desc">Concepción Arenal 4501, Chacarita · Lun–Vie 10–18 hs</div>
            </div>
          </div>
        </div>

        {/* Resumen */}
        <div className="mp-pagar-card">
          <div className="mp-summary-rows">
            <div className="mp-summary-row">
              <span>{copies} {copies === 1 ? 'copia' : 'copias'}</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="mp-summary-row mp-summary-row--deducted">
              <span>Ya pagaste</span>
              <span>− {fmt(order.price_paid)}</span>
            </div>
            {deliveryType === 'andreani' && (
              <div className="mp-summary-row">
                <span>Envío</span>
                <span>a calcular</span>
              </div>
            )}
            <hr className="mp-summary-divider" />
            <div className="mp-summary-total">
              <span>Pagás ahora</span>
              <span>{fmt(payNow)}{deliveryType === 'andreani' ? ' + envío' : ''}</span>
            </div>
          </div>
        </div>

        <button
          className="mp-cta-btn"
          onClick={handlePay}
          disabled={paying || (deliveryType === 'andreani' && !address.trim())}
        >
          {paying ? 'Redirigiendo...' : 'Aceptar y comprar'}
        </button>

        <p className="mp-legal">
          Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
        </p>
      </div>
    </div>
  )
}
