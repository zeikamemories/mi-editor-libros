'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import { computeCartasTotal } from '../config/pricing'
import CardPhotoFrame, { DEFAULT_CARD_TRANSFORM, type CardTransform } from '../components/CardPhotoFrame/CardPhotoFrame'
import '../orden/orden.css'

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function OrdenCartasPage() {
  const router = useRouter()

  const [loading,   setLoading]   = useState(true)
  const [user,      setUser]      = useState<User | null>(null)
  const [cardType,  setCardType]  = useState<'truco' | 'poker' | null>(null)
  const [photoUrl,  setPhotoUrl]  = useState<string | null>(null)
  const [photoTransform, setPhotoTransform] = useState<CardTransform>(DEFAULT_CARD_TRANSFORM)
  const [labelName, setLabelName] = useState('')
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('zeika_product_selection')
      if (raw) {
        const sel = JSON.parse(raw)
        if (sel.productType === 'cartas') {
          if (sel.cardType === 'truco' || sel.cardType === 'poker') setCardType(sel.cardType)
          if (typeof sel.photoUrl === 'string')  setPhotoUrl(sel.photoUrl)
          if (sel.photoTransform) setPhotoTransform(sel.photoTransform)
          if (typeof sel.labelName === 'string') setLabelName(sel.labelName)
        }
      }
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        sessionStorage.setItem('zeika_after_login', '/orden-cartas')
        router.replace('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const totalPrice = computeCartasTotal(1) ?? 0

  async function handleConfirm() {
    if (!user || !photoUrl) return
    setSaving(true)
    setError('')

    const now = new Date().toISOString()
    const { error: orderError } = await supabase.from('orders').insert({
      user_id:         user.id,
      product_type:    'cartas',
      card_photo_url:  photoUrl,
      card_photo_transform: photoTransform,
      card_type:       cardType,
      book_name:       labelName.trim() || 'Sin título',
      copies:          1,
      price_total:     totalPrice,
      price_paid:      0,
      status:          'aprobado',
      status_dates: {
        confirmado:         now,
        material_recibido:  now,
        en_diseno:           now,
        preview_listo:       now,
        aprobado:            now,
      },
    }).select().single()

    if (orderError) {
      setError('Error al guardar el pedido: ' + orderError.message)
      setSaving(false)
      return
    }

    sessionStorage.removeItem('zeika_product_selection')
    window.location.href = '/mis-proyectos?tab=listos'
  }

  if (loading) return (
    <div className="orden-loading"><div className="orden-spinner" /></div>
  )

  if (!photoUrl) {
    return (
      <div className="orden">
        <header className="orden__header">
          <a href="/"><Image src="/LogoZeika.png" alt="Zeika" width={50} height={50} /></a>
        </header>
        <div className="orden__content">
          <p className="orden__error">No encontramos tu foto — volvé a la landing e intentá de nuevo.</p>
          <a className="orden__back-link" href="/#productos">← Volver</a>
        </div>
      </div>
    )
  }

  const summaryContent = (
    <>
      <div className="orden__summary">
        <div className="orden__summary-row">
          <span className="orden__summary-key">TIPO</span>
          <span className="orden__summary-val">{cardType === 'truco' ? 'Truco' : cardType === 'poker' ? 'Poker' : '—'}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">NOMBRE</span>
          <span className="orden__summary-val">{labelName || '—'}</span>
        </div>
      </div>

      <div className="orden__totals">
        <div className="orden__total-col">
          <span className="orden__total-label orden__total-label--blue">PRECIO POR MAZO:</span>
          <span className="orden__total-price orden__total-price--blue">{fmt(totalPrice)}</span>
        </div>
      </div>

      <p className="orden__legal">
        Todavía no se cobra nada. Tu pedido va a quedar en &quot;Mis pedidos → Listos para
        comprar&quot;, donde elegís la cantidad de mazos y pagás cuando quieras.
      </p>

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
            <CardPhotoFrame src={photoUrl} transform={photoTransform} className="orden__product-photoframe" />
          </div>
        </div>

        <div className="orden__right-col">
          <h1 className="orden__title">Mis cartas personalizadas</h1>
          <p className="orden__subtitle-blue">
            Confirmá tu foto y encontrá tu mazo en &quot;Mis pedidos&quot; cuando quieras comprarlo.
          </p>
          {summaryContent}
          <button
            className="orden__cta-btn orden__cta-btn--desktop"
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? 'Guardando...' : 'CONFIRMAR FOTO'}
          </button>
        </div>
      </div>

      {/* ── Mobile: single-column scroll + fixed CTA ── */}
      <div className="orden__scroll">
        <div className="orden__content orden__content--summary">
          <a className="orden__back-link" href="/">←</a>
          <h1 className="orden__title">Mis cartas personalizadas</h1>
          <p className="orden__subtitle-blue">
            Confirmá tu foto y encontrá tu mazo en &quot;Mis pedidos&quot; cuando quieras comprarlo.
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
          {saving ? 'Guardando...' : 'CONFIRMAR FOTO'}
        </button>
      </div>
    </div>
  )
}
