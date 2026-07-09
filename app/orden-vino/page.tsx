'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { VINO_PRICE_BASE, VINO_DESIGN_EXTRA } from '../config/pricing'
import '../orden/orden.css'

const VARIEDAD_LABEL: Record<string, string> = {
  tinto:  'Tinto',
  blanco: 'Blanco',
}

const DISENO_LABEL: Record<string, string> = {
  foto_y_texto:         'Con foto y texto',
  diseno_personalizado: 'Con diseño personalizado',
}

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function OrdenVinoPage() {
  const router = useRouter()

  const [loading,        setLoading]        = useState(true)
  const [user,           setUser]           = useState<User | null>(null)
  const [variedad,       setVariedad]       = useState<'tinto' | 'blanco'>('tinto')
  const [disenoTipo,     setDisenoTipo]     = useState<'foto_y_texto' | 'diseno_personalizado'>('foto_y_texto')
  const [cantidad,       setCantidad]       = useState<1 | 6>(1)
  const [disenoMultiple, setDisenoMultiple] = useState<'mismo' | 'diferente' | null>(null)
  const [labelName,      setLabelName]      = useState('')
  const [whatsapp,       setWhatsapp]       = useState('')
  const [whatsappError,  setWhatsappError]  = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [error,          setError]          = useState('')
  const whatsappRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('zeika_product_selection')
      if (raw) {
        const sel = JSON.parse(raw)
        if (sel.productType === 'vino') {
          if (sel.variedad)                        setVariedad(sel.variedad)
          if (sel.disenoTipo)                       setDisenoTipo(sel.disenoTipo)
          if (sel.cantidad === 1 || sel.cantidad === 6) setCantidad(sel.cantidad)
          if (sel.disenoMultiple)                   setDisenoMultiple(sel.disenoMultiple)
          if (typeof sel.labelName === 'string')    setLabelName(sel.labelName)
        }
      }
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        sessionStorage.setItem('zeika_after_login', '/orden-vino')
        router.replace('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const unitPrice  = VINO_PRICE_BASE[variedad] + VINO_DESIGN_EXTRA[disenoTipo]
  const totalPrice = unitPrice * cantidad
  const payNow     = Math.round(totalPrice / 2)

  async function handleConfirm() {
    if (!user) return
    if (!whatsapp.trim()) {
      setWhatsappError(true)
      whatsappRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      whatsappRef.current?.focus()
      return
    }
    setSaving(true)
    setError('')

    const { data: order, error: orderError } = await supabase.from('orders').insert({
      user_id:         user.id,
      product_type:    'vino',
      variedad,
      diseno_tipo:     disenoTipo,
      diseno_multiple: cantidad === 6 ? disenoMultiple : null,
      copies:          cantidad,
      book_name:       labelName.trim() || 'Sin título',
      price_total:     totalPrice,
      price_paid:      payNow,
      status:          'pendiente_pago',
    }).select().single()

    if (orderError) {
      setError('Error al guardar el pedido: ' + orderError.message)
      setSaving(false)
      return
    }

    await supabase.from('profiles').upsert({ id: user.id, whatsapp })

    const siteUrl    = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const successUrl = `${siteUrl}/orden/confirmado?order_id=${order.id}`

    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   labelName.trim() || 'Sin título',
        successUrl,
        failureUrl: `${siteUrl}/orden-vino?error=1`,
      }),
    })
    const json = await res.json()
    if (json.url) {
      sessionStorage.removeItem('zeika_product_selection')
      sessionStorage.setItem('zeika_pending_order_id', order.id)
      window.location.href = json.url
      return
    }
    setError('Error al conectar con MercadoPago.')
    setSaving(false)
  }

  if (loading) return (
    <div className="orden-loading"><div className="orden-spinner" /></div>
  )

  const summaryContent = (
    <>
      <div className="orden__summary">
        <div className="orden__summary-row">
          <span className="orden__summary-key">VARIEDAD</span>
          <span className="orden__summary-val">{VARIEDAD_LABEL[variedad]}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">TIPO DE DISEÑO</span>
          <span className="orden__summary-val">{DISENO_LABEL[disenoTipo]}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">CANTIDAD</span>
          <span className="orden__summary-val">{cantidad} botella{cantidad > 1 ? 's' : ''}</span>
        </div>
        {cantidad === 6 && (
          <div className="orden__summary-row">
            <span className="orden__summary-key">DISEÑO PARA LAS 6</span>
            <span className="orden__summary-val">{disenoMultiple === 'diferente' ? 'Diseño diferente' : 'Mismo diseño'}</span>
          </div>
        )}
        <div className="orden__summary-row">
          <span className="orden__summary-key">NOMBRE</span>
          <span className="orden__summary-val">{labelName || '—'}</span>
        </div>
      </div>

      <div className="orden__totals">
        <div className="orden__total-col">
          <span className="orden__total-label orden__total-label--blue">TOTAL:</span>
          <span className="orden__total-price orden__total-price--blue">{fmt(totalPrice)}</span>
        </div>
        <div className="orden__total-col">
          <span className="orden__total-label">A PAGAR AHORA (50%)</span>
          <span className="orden__total-now">{fmt(payNow)}</span>
        </div>
      </div>

      <p className="orden__legal">El 50% restante se paga cuando se aprueba el diseño final.</p>

      <div className="orden__field">
        <label className="orden__label">WHATSAPP</label>
        <p className="orden__note">Para coordinar tu etiqueta: te contactamos por acá para definir el diseño final.</p>
        <div className={`orden__phone-row${whatsappError ? ' orden__phone-row--error' : ''}`}>
          <span className="orden__phone-prefix">+54</span>
          <input
            ref={whatsappRef}
            className="orden__input orden__input--phone"
            placeholder="11 1234 5678"
            value={whatsapp}
            inputMode="numeric"
            onChange={e => { setWhatsapp(e.target.value); if (e.target.value.trim()) setWhatsappError(false) }}
          />
        </div>
      </div>

      {error && <p className="orden__error">{error}</p>}
    </>
  )

  return (
    <div className="orden">
      <header className="orden__header">
        <a href="/"><Image src="/LogoZeika.png" alt="Zeika" width={50} height={50} /></a>
      </header>

      {/* ── Desktop: two-column layout ── */}
      <div className="orden__desktop-body">
        <div className="orden__left-col">
          <a className="orden__back-link orden__back-link--side" href="/">←</a>
          <div className="orden__product-frame">
            <img src="/fotos/vinos.jpg" alt="Vino Personalizado" className="orden__product-img" />
          </div>
        </div>

        <div className="orden__right-col">
          <h1 className="orden__title">Mi vino personalizado</h1>
          <p className="orden__subtitle-blue">
            Una vez abonado, coordinamos por WhatsApp el diseño de tu etiqueta.
          </p>
          {summaryContent}
          <button
            className="orden__cta-btn orden__cta-btn--desktop"
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? 'Guardando...' : `PAGAR SEÑA (50%) · ${fmt(payNow)}`}
          </button>
        </div>
      </div>

      {/* ── Mobile: single-column scroll + fixed CTA ── */}
      <div className="orden__scroll">
        <div className="orden__content orden__content--summary">
          <a className="orden__back-link" href="/">←</a>
          <h1 className="orden__title">Mi vino personalizado</h1>
          <p className="orden__subtitle-blue">
            Una vez abonado, coordinamos por WhatsApp el diseño de tu etiqueta.
          </p>
          {summaryContent}
        </div>
      </div>

      <div className="orden__cta-bar">
        <button
          className="orden__cta-btn"
          disabled={saving}
          onClick={handleConfirm}
        >
          {saving ? 'Guardando...' : `PAGAR ${fmt(payNow)}`}
        </button>
      </div>
    </div>
  )
}
