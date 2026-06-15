'use client'
import { useEffect, useState } from 'react'
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

const PRICES_BY_PAGES: Record<string, [number, number, number]> = {
  chico_h:   [82700,  104300, 118700],
  mediano_h: [94700,  116700, 138700],
  grande_h:  [128800, 164800, 200800],
  vertical:  [94700,  116700, 138700],
  cuadrado:  [125800, 161800, 197800],
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

const TEXT_OPTIONS = [
  { label: '1 texto · Incluído',        value: false },
  { label: 'Textos varios · +$10.000',  value: true  },
]

function fmt(n: number) {
  return '$' + Math.round(n).toLocaleString('es-AR')
}

type DropOpen = 'formato' | 'paginas' | 'textos' | null

export default function OrdenPage() {
  const router = useRouter()

  const [loading,      setLoading]      = useState(true)
  const [user,         setUser]         = useState<User | null>(null)
  const [sizeId,       setSizeId]       = useState('chico_h')
  const [pageIdx,      setPageIdx]      = useState(0)
  const [textExtra,    setTextExtra]    = useState(false)
  const [bookName,     setBookName]     = useState('')
  const [nameEditing,  setNameEditing]  = useState(false)
  const [whatsapp,     setWhatsapp]     = useState('')
  const [openDrop,     setOpenDrop]     = useState<DropOpen>(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

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
  const totalPrice  = pagePrices[pageIdx] + (textExtra ? 10000 : 0)
  const payNow      = Math.round(totalPrice / 2)
  const selectedSize = SIZES.find(s => s.id === sizeId) ?? SIZES[0]
  const selectedPage = pageOptions[pageIdx] ?? pageOptions[0]

  function toggleDrop(name: DropOpen) {
    setOpenDrop(o => o === name ? null : name)
  }

  async function handleConfirm() {
    if (!user) return
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

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? window.location.origin
    const res = await fetch('/api/payment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId:    order.id,
        bookName:   bookName.trim() || 'Sin título',
        amount:     payNow,
        successUrl: `${siteUrl}/orden/confirmado?orderId=${order.id}`,
        failureUrl: `${siteUrl}/orden?error=1`,
      }),
    })
    const json = await res.json()
    if (json.url) {
      sessionStorage.removeItem('zeika_product_selection')
      window.location.href = json.url
      return
    }
    setError('Error al conectar con MercadoPago.')
    setSaving(false)
  }

  if (loading) return (
    <div className="orden-loading"><div className="orden-spinner" /></div>
  )

  return (
    <div className="orden">
      <header className="orden__header">
        <a href="/"><Image src="/LogoZeika.png" alt="Zeika" width={50} height={50} /></a>
      </header>

      <div className="orden__scroll">
        <div className="orden__content orden__content--summary">

          <a className="orden__back-link" href="/">‹ Atrás</a>

          <h1 className="orden__title">Resumen del pedido</h1>
          <p className="orden__subtitle-blue">
            Una vez abonado se crea una carpeta dentro de tu perfil donde podés cargás el material
          </p>

          <div className="orden__summary">

            {/* FORMATO */}
            <div
              className="orden__summary-row orden__summary-row--drop"
              onClick={() => toggleDrop('formato')}
            >
              <span className="orden__summary-key">FORMATO</span>
              <div className="orden__drop-trigger">
                <span className="orden__summary-val">{selectedSize.name} {selectedSize.dims}</span>
                <span className={`orden__drop-arrow${openDrop === 'formato' ? ' orden__drop-arrow--open' : ''}`}>∨</span>
              </div>
            </div>
            {openDrop === 'formato' && (
              <div className="orden__drop-list">
                {SIZES.map(s => (
                  <button
                    key={s.id}
                    className={`orden__drop-item${sizeId === s.id ? ' orden__drop-item--active' : ''}`}
                    onClick={e => { e.stopPropagation(); setSizeId(s.id); setPageIdx(0); setOpenDrop(null) }}
                  >
                    {s.name} · {s.dims}
                  </button>
                ))}
              </div>
            )}

            {/* PÁGINAS */}
            <div
              className="orden__summary-row orden__summary-row--drop"
              onClick={() => toggleDrop('paginas')}
            >
              <span className="orden__summary-key">PÁGINAS</span>
              <div className="orden__drop-trigger">
                <span className="orden__summary-val">{selectedPage.pages} páginas</span>
                <span className={`orden__drop-arrow${openDrop === 'paginas' ? ' orden__drop-arrow--open' : ''}`}>∨</span>
              </div>
            </div>
            {openDrop === 'paginas' && (
              <div className="orden__drop-list">
                {pageOptions.map((opt, i) => (
                  <button
                    key={i}
                    className={`orden__drop-item${pageIdx === i ? ' orden__drop-item--active' : ''}`}
                    onClick={e => { e.stopPropagation(); setPageIdx(i); setOpenDrop(null) }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* TEXTOS */}
            <div
              className="orden__summary-row orden__summary-row--drop"
              onClick={() => toggleDrop('textos')}
            >
              <span className="orden__summary-key">TEXTOS</span>
              <div className="orden__drop-trigger">
                <span className="orden__summary-val">{textExtra ? 'Textos varios' : '1 texto'}</span>
                <span className={`orden__drop-arrow${openDrop === 'textos' ? ' orden__drop-arrow--open' : ''}`}>∨</span>
              </div>
            </div>
            {openDrop === 'textos' && (
              <div className="orden__drop-list">
                {TEXT_OPTIONS.map(opt => (
                  <button
                    key={String(opt.value)}
                    className={`orden__drop-item${textExtra === opt.value ? ' orden__drop-item--active' : ''}`}
                    onClick={e => { e.stopPropagation(); setTextExtra(opt.value); setOpenDrop(null) }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* NOMBRE */}
            <div className="orden__summary-row">
              <span className="orden__summary-key">NOMBRE</span>
              {nameEditing ? (
                <input
                  className="orden__name-input"
                  autoFocus
                  value={bookName}
                  placeholder="Ej: Verano Grecia 2024"
                  onChange={e => setBookName(e.target.value)}
                  onBlur={() => setNameEditing(false)}
                  onKeyDown={e => e.key === 'Enter' && setNameEditing(false)}
                />
              ) : (
                <button className="orden__name-btn" onClick={() => setNameEditing(true)}>
                  {bookName || <span className="orden__name-placeholder">Agregar</span>}
                </button>
              )}
            </div>

            {/* DISEÑO ESTIMADO */}
            <div className="orden__summary-row">
              <span className="orden__summary-key">DISEÑO ESTIMADO</span>
              <span className="orden__summary-val">En 48hs hábiles</span>
            </div>

          </div>

          <div className="orden__totals">
            <div className="orden__total-col">
              <span className="orden__total-label">TOTAL:</span>
              <span className="orden__total-price">{fmt(totalPrice)}</span>
            </div>
            <div className="orden__total-col">
              <span className="orden__total-label">A PAGAR AHORA (50%)</span>
              <span className="orden__total-now">{fmt(payNow)}</span>
            </div>
          </div>

          <div className="orden__field">
            <label className="orden__label">WHATSAPP</label>
            <div className="orden__phone-row">
              <span className="orden__phone-prefix">+54</span>
              <input
                className="orden__input orden__input--phone"
                placeholder="11 1234 5678"
                value={whatsapp}
                onChange={e => setWhatsapp(e.target.value)}
              />
            </div>
            <p className="orden__note">Usamos tu WhatsApp para mandar el comprobante del pedido y avisar cuando el diseño esté listo.</p>
          </div>

          {error && <p className="orden__error">{error}</p>}

        </div>
      </div>

      <div className="orden__cta-bar">
        <button
          className="orden__cta-btn"
          disabled={saving || !bookName.trim() || !whatsapp.trim()}
          onClick={handleConfirm}
        >
          {saving ? 'Guardando...' : `PAGAR ${fmt(payNow)}`}
        </button>
        <p className="orden__legal">El 50% restante se paga cuando se aprueba el diseño final.</p>
      </div>
    </div>
  )
}
