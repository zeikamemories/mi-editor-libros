'use client'
import { useEffect, useState, useRef } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'
import './orden.css'

const SIZES = [
  { id: 'chico_h',   name: 'Chico Horizontal',  dims: '21 × 14,8 cm' },
  { id: 'mediano_h', name: 'Mediano Horizontal', dims: '28 × 21,6 cm' },
  { id: 'grande_h',  name: 'Grande Horizontal',  dims: '41 × 29 cm'   },
  { id: 'vertical',  name: 'Vertical',           dims: '28 × 21,6 cm' },
  { id: 'cuadrado',  name: 'Cuadrado',           dims: '29 × 29 cm'   },
]

const PRODUCT_IMAGES: Record<string, string> = {
  chico_h:   '/fotos/chico.jpg',
  mediano_h: '/fotos/mediano.jpg',
  grande_h:  '/fotos/grande.jpg',
  vertical:  '/fotos/vertical.jpg',
  cuadrado:  '/fotos/cuadrado.jpg',
}

const PRICES_BY_PAGES: Record<string, [number, number, number]> = {
  chico_h:   [1,  104300, 118700],
  mediano_h: [94700,  116700, 138700],
  grande_h:  [128800, 164800, 200800],
  vertical:  [94700,  116700, 138700],
  cuadrado:  [125800, 161800, 197800],
}

const TEXT_EXTRA_BY_SIZE: Record<string, number> = {
  chico_h:   1,
  mediano_h: 10000,
  grande_h:  10000,
  vertical:  10000,
  cuadrado:  10000,
}

const PAGE_OPTIONS_SMALL = [
  { label: '20-100 fotos · 20 páginas',  pages: 20 },
  { label: '101-180 fotos · 30 páginas', pages: 30 },
  { label: '180-240 fotos · 40 páginas', pages: 40 },
]
const PAGE_OPTIONS_LARGE = [
  { label: '20-160 fotos · 20 páginas',  pages: 20 },
  { label: '161-240 fotos · 30 páginas', pages: 30 },
  { label: '241-350 fotos · 40 páginas', pages: 40 },
]


function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

export default function OrdenPage() {
  const router = useRouter()

  const [loading,       setLoading]       = useState(true)
  const [user,          setUser]          = useState<User | null>(null)
  const [sizeId,        setSizeId]        = useState('chico_h')
  const [pageIdx,       setPageIdx]       = useState(0)
  const [textExtra,     setTextExtra]     = useState(false)
  const [bookName,      setBookName]      = useState('')
  const [whatsapp,      setWhatsapp]      = useState('')
  const [whatsappError, setWhatsappError] = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState('')
  const whatsappRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('zeika_product_selection')
      if (raw) {
        const sel = JSON.parse(raw)
        if (sel.sizeId)                         setSizeId(sel.sizeId)
        if (typeof sel.pageIdx   === 'number')  setPageIdx(sel.pageIdx)
        if (typeof sel.textExtra === 'boolean') setTextExtra(sel.textExtra)
        if (typeof sel.bookName  === 'string')  setBookName(sel.bookName)
      }
    } catch {}

    // Pre-select size and save reorderFrom if coming from a reorder
    const params = new URLSearchParams(window.location.search)
    const sizeParam      = params.get('size')
    const reorderFromParam = params.get('reorderFrom')
    if (sizeParam) setSizeId(sizeParam)
    if (reorderFromParam) sessionStorage.setItem('zeika_reorder_from', reorderFromParam)
    else sessionStorage.removeItem('zeika_reorder_from')

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        setLoading(false)
      } else {
        sessionStorage.setItem('zeika_after_login', '/orden')
        router.replace('/login')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) { setUser(session.user); setLoading(false) }
    })
    return () => subscription.unsubscribe()
  }, [router])

  const isLarge     = ['grande_h', 'cuadrado'].includes(sizeId)
  const pageOptions = isLarge ? PAGE_OPTIONS_LARGE : PAGE_OPTIONS_SMALL
  const pagePrices  = PRICES_BY_PAGES[sizeId] ?? [0, 0, 0]
  const textExtraPrice = TEXT_EXTRA_BY_SIZE[sizeId] ?? 10000
  const totalPrice  = pagePrices[pageIdx] + (textExtra ? textExtraPrice : 0)
  const payNow      = Math.round(totalPrice / 2)
  const selectedSize = SIZES.find(s => s.id === sizeId) ?? SIZES[0]
  const selectedPage = pageOptions[pageIdx] ?? pageOptions[0]

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
      user_id:     user.id,
      book_name:   bookName.trim() || 'Sin título',
      size:        sizeId,
      pages_base:  selectedPage.pages,
      extra_pages: 0,
      extra_text:  textExtra,
      price_total: totalPrice,
      price_paid:  payNow,
      status:      'pendiente_pago',
    }).select().single()

    if (orderError) {
      setError('Error al guardar el pedido: ' + orderError.message)
      setSaving(false)
      return
    }

    await supabase.from('profiles').upsert({ id: user.id, whatsapp })

    const siteUrl     = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const reorderFrom = sessionStorage.getItem('zeika_reorder_from')
    const successUrl  = reorderFrom
      ? `${siteUrl}/orden/confirmado?order_id=${order.id}&reorderFrom=${reorderFrom}`
      : `${siteUrl}/orden/confirmado?order_id=${order.id}`

    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   bookName.trim() || 'Sin título',
        amount:     payNow,
        successUrl,
        failureUrl: `${siteUrl}/orden?error=1`,
      }),
    })
    const json = await res.json()
    if (json.url) {
      sessionStorage.removeItem('zeika_product_selection')
      sessionStorage.removeItem('zeika_reorder_from')
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
          <span className="orden__summary-key">FORMATO</span>
          <span className="orden__summary-val">{selectedSize.name} {selectedSize.dims}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">PÁGINAS</span>
          <span className="orden__summary-val">{selectedPage.pages} páginas</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">TEXTOS</span>
          <span className="orden__summary-val">{textExtra ? 'Textos varios' : '1 texto'}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">NOMBRE DEL PROYECTO</span>
          <span className="orden__summary-val">{bookName || '—'}</span>
        </div>
        <div className="orden__summary-row">
          <span className="orden__summary-key">DISEÑO ESTIMADO</span>
          <span className="orden__summary-val">En 48hs hábiles</span>
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
        <p className="orden__note">Usamos tu WhatsApp para mandar el comprobante del pedido y avisar cuando el diseño esté listo.</p>
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

        {/* Left column: back (left of photo) + product image */}
        <div className="orden__left-col">
          <a className="orden__back-link orden__back-link--side" href="/">←</a>
          <div className="orden__product-frame">
            {PRODUCT_IMAGES[sizeId] && (
              <img src={PRODUCT_IMAGES[sizeId]} alt={selectedSize.name} className={`orden__product-img orden__product-img--${sizeId}`} />
            )}
          </div>
        </div>

        {/* Right column: scrollable content */}
        <div className="orden__right-col">
          <h1 className="orden__title">Contar mi historia</h1>
          <p className="orden__subtitle-blue">
            Una vez abonado se crea una carpeta dentro de tu perfil donde podés cargar el material
          </p>
          {summaryContent}
          <button
            className="orden__cta-btn orden__cta-btn--desktop"
            disabled={saving}
            onClick={handleConfirm}
          >
            {saving ? 'Guardando...' : `PAGAR ${fmt(payNow)}`}
          </button>
        </div>
      </div>

      {/* ── Mobile: single-column scroll + fixed CTA ── */}
      <div className="orden__scroll">
        <div className="orden__content orden__content--summary">
          <a className="orden__back-link" href="/">←</a>
          <h1 className="orden__title">Contar mi historia</h1>
          <p className="orden__subtitle-blue">
            Una vez abonado se crea una carpeta dentro de tu perfil donde podés cargás el material
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
