'use client'

import { useEffect, useRef, useState, Suspense } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { supabase } from '../../../lib/supabase'
import Navbar from '../../../components/Landing/Navbar/Navbar'
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
  return '$' + Math.round(n).toLocaleString('es-AR')
}

function PagarContent() {
  const router       = useRouter()
  const params       = useParams()
  const searchParams = useSearchParams()
  const orderId      = params.orderId as string
  const isReorder    = searchParams.get('reorder') === 'true'

  const [order,   setOrder]   = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [paying,  setPaying]  = useState(false)
  const [userName,  setUserName]  = useState('')
  const [userEmail, setUserEmail] = useState('')

  const [copies,          setCopies]          = useState(1)
  const [deliveryType,    setDeliveryType]    = useState<'andreani' | 'pickup'>('andreani')
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Structured address fields
  const [pais,      setPais]      = useState('')
  const [provincia, setProvincia] = useState('')
  const [ciudad,    setCiudad]    = useState('')
  const [calle,     setCalle]     = useState('')
  const [numero,    setNumero]    = useState('')
  const [piso,      setPiso]      = useState('')
  const [depto,     setDepto]     = useState('')
  const [cp,        setCp]        = useState('')

  // Debounce CP → shipping quote
  useEffect(() => {
    if (deliveryType !== 'andreani') return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = cp.trim()
    if (!/^\d{4}$/.test(trimmed)) { setShippingPrice(null); return }
    setShippingLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/shipping-quote?cp=${trimmed}`)
        const data = await res.json()
        setShippingPrice(res.ok ? (data.price as number) : null)
      } catch {
        setShippingPrice(null)
      } finally {
        setShippingLoading(false)
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cp, deliveryType])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) { router.replace('/orden'); return }
      const meta = session.user.user_metadata
      setUserName(meta?.full_name || meta?.name || session.user.email?.split('@')[0] || '')
      setUserEmail(session.user.email ?? '')
      supabase.from('orders').select('id, book_name, size, price_total, price_paid, status')
        .eq('id', orderId).eq('user_id', session.user.id).single()
        .then(({ data }) => {
          const status = (data as any)?.status ?? ''
          const allowed = isReorder ? status === 'entregado' : status === 'preview_listo'
          if (!data || !allowed) {
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

  const unitPrice      = PRICES[order.size] ?? order.price_total
  const discount       = copies >= 3 ? 0.8 : 1
  const subtotal       = copies * unitPrice * discount
  const shippingTotal  = deliveryType === 'andreani' ? (shippingPrice ?? 0) : 0
  const effectivePaid  = isReorder ? 0 : order.price_paid
  const payNow         = Math.round(subtotal - effectivePaid + shippingTotal)
  const firstName      = userName.split(' ')[0]
  const shippingLabel  = shippingLoading ? 'Calculando...' : shippingPrice !== null ? fmt(shippingPrice) : 'A calcular'
  const shippingReady  = deliveryType === 'pickup' || shippingPrice !== null

  const addressFilled = deliveryType === 'pickup' || (
    pais.trim() && provincia.trim() && ciudad.trim() && calle.trim() && numero.trim() && cp.trim()
  )

  const fullAddress = [
    calle, numero, piso && `Piso ${piso}`, depto && `Depto ${depto}`,
    ciudad, provincia, pais, cp && `CP ${cp}`,
  ].filter(Boolean).join(', ')

  async function handlePay() {
    if (!addressFilled) return
    setPaying(true)

    await supabase.from('orders').update({
      copies,
      delivery_type:    deliveryType,
      delivery_address: deliveryType === 'andreani' ? fullAddress : 'Retiro en fábrica',
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

  const ctaBlock = (
    <>
      <button
        className={`mpd-cta-btn${addressFilled && shippingReady ? ' mpd-cta-btn--active' : ''}`}
        onClick={handlePay}
        disabled={!addressFilled || !shippingReady || paying}
      >
        {paying ? 'Redirigiendo...' : 'Aceptar y finalizar'}
      </button>
      <p className="mpd-legal" style={{ marginTop: 10 }}>
        Por tratarse de un producto personalizado, no realizamos cambios ni devoluciones una vez enviado a producción.
      </p>
    </>
  )

  const formContent = (
    <>
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Nombre</span>
        <span className="mpd-row__val">{order.book_name}</span>
      </div>
      <div className="mpd-row mpd-row--white">
        <span className="mpd-row__key">Formato</span>
        <span className="mpd-row__val">{SIZE_NAMES[order.size] ?? order.size}</span>
      </div>

      {/* Cantidad de copias */}
      <div className="mpag-copies-section">
        <div className="mpag-copies-top">
          <div className="mpag-copies-left">
            <span className="mpag-section-label">Cantidad de copias</span>
            <div className="mpag-counter">
              <button className="mpag-counter-btn" onClick={() => setCopies(c => Math.max(1, c - 1))} disabled={copies <= 1}>−</button>
              <span className="mpag-counter-num">{copies}</span>
              <button className="mpag-counter-btn" onClick={() => setCopies(c => c + 1)}>+</button>
            </div>
          </div>
          <div className="mpag-copies-right">
            <span className="mpag-unit-price">{fmt(unitPrice * discount)} <span className="mpag-cu">c/u</span></span>
            <span className="mpag-total-label">Total: {fmt(subtotal)}</span>
          </div>
        </div>
        <div className="mpag-discount-banner">
          A partir de 3 copias: 20% de descuento
        </div>
      </div>

      {/* Entrega */}
      <div className="mpag-entrega-section">
        <span className="mpag-section-label">Entrega</span>

        <div
          className={`mpag-delivery-card${deliveryType === 'andreani' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('andreani')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'andreani' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Envío por Andreani</span>
            </div>
            <span className={`mpag-delivery-price${shippingPrice !== null ? ' mpag-delivery-price--known' : ''}`}>
              {shippingLabel}
            </span>
          </div>
          <p className="mpag-delivery-desc">Todo el país y Uruguay:<br />2-7 días hábiles</p>

          {deliveryType === 'andreani' && (
            <div className="mpag-address-fields" onClick={e => e.stopPropagation()}>
              <div className="mpag-field">
                <label className="mpag-field-label">País</label>
                <input className="mpag-field-input" placeholder="País" value={pais} onChange={e => setPais(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Provincia</label>
                  <input className="mpag-field-input" placeholder="Provincia" value={provincia} onChange={e => setProvincia(e.target.value)} />
                </div>
                <div className="mpag-field">
                  <label className="mpag-field-label">Ciudad</label>
                  <input className="mpag-field-input" placeholder="Ciudad" value={ciudad} onChange={e => setCiudad(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Calle</label>
                <input className="mpag-field-input" placeholder="Calle" value={calle} onChange={e => setCalle(e.target.value)} />
              </div>
              <div className="mpag-field-row">
                <div className="mpag-field">
                  <label className="mpag-field-label">Número</label>
                  <input className="mpag-field-input" placeholder="Número" value={numero} onChange={e => setNumero(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Piso</label>
                  <input className="mpag-field-input" placeholder="Piso" value={piso} onChange={e => setPiso(e.target.value)} />
                </div>
                <div className="mpag-field mpag-field--sm">
                  <label className="mpag-field-label">Depto</label>
                  <input className="mpag-field-input" placeholder="Depto" value={depto} onChange={e => setDepto(e.target.value)} />
                </div>
              </div>
              <div className="mpag-field">
                <label className="mpag-field-label">Código postal</label>
                <input className="mpag-field-input" placeholder="Código postal" value={cp} maxLength={6} onChange={e => setCp(e.target.value.replace(/\D/g, ''))} />
              </div>
            </div>
          )}
        </div>

        <div
          className={`mpag-delivery-card${deliveryType === 'pickup' ? ' mpag-delivery-card--selected' : ''}`}
          onClick={() => setDeliveryType('pickup')}
        >
          <div className="mpag-delivery-card__header">
            <div className="mpag-delivery-card__left">
              <div className={`mpag-radio${deliveryType === 'pickup' ? ' mpag-radio--selected' : ''}`} />
              <span className="mpag-delivery-name">Retiro en fábrica</span>
            </div>
            <span className="mpag-delivery-price mpag-delivery-price--free">Gratis</span>
          </div>
          <p className="mpag-delivery-desc">Retiro por Concepción Arenal 4501, Chacarita, Bs As,<br />Lunes a Viernes 10-18 hs</p>
        </div>
      </div>

      {/* Resumen final */}
      <div className="mpag-resumen-section">
        <span className="mpag-section-label">Resumen final</span>
        <div className="mpd-row">
          <span className="mpd-row__key">{copies} {copies === 1 ? 'copia' : 'copias'}</span>
          <span className="mpd-row__val">{fmt(subtotal)}</span>
        </div>
        {!isReorder && (
          <div className="mpd-row">
            <span className="mpd-row__key">Ya pagaste</span>
            <span className="mpd-row__val">−{fmt(order.price_paid)}</span>
          </div>
        )}
        <div className="mpd-row">
          <span className="mpd-row__key">Envío</span>
          <span className="mpd-row__val">{deliveryType === 'pickup' ? 'Gratis' : shippingLabel}</span>
        </div>
        <div className="mpd-row mpd-row--balance">
          <span className="mpd-row__key">Pagás ahora</span>
          <span className="mpd-row__val">
            {shippingReady ? fmt(payNow) : `${fmt(Math.round(subtotal - effectivePaid))} + envío`}
          </span>
        </div>
      </div>
    </>
  )

  return (
    <div className="mpd-root">
      <Navbar hideLinks />

      <div className="mp-user-strip">
        <div className="mp-user-strip__initial">{firstName[0]?.toUpperCase() ?? '?'}</div>
        <div className="mp-user-strip__info">
          <p className="mp-user-strip__name">{userName}</p>
          <p className="mp-user-strip__email">{userEmail}</p>
        </div>
      </div>

      <div className="mpd-body">

        <div className="mpd-hero">
          <a href={`/mis-proyectos/${orderId}`} className="mpd-back">‹ Detalle proyecto</a>
          <h1 className="mpd-title">Finalizar compra</h1>
        </div>

        {/* Mobile: single column */}
        <div className="mpd-mobile-only">
          <div className="mpd-accordions" style={{ gap: 0 }}>
            {formContent}
          </div>
          <div className="mpd-bottom">{ctaBlock}</div>
        </div>

        {/* Desktop: two columns */}
        <div className="mpd-desktop-only">
          <div className="mpd-desktop-layout">

            <div className="mpd-desktop-left">
              <div className="mpd-bottom" style={{ padding: 0 }}>{ctaBlock}</div>
            </div>

            <div className="mpd-desktop-divider" />

            <div className="mpd-desktop-right">
              <div className="mpd-desktop-panel">
                {formContent}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  )
}

export default function PagarPage() {
  return <Suspense><PagarContent /></Suspense>
}
