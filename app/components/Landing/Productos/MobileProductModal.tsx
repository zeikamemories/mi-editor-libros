'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import type { ProductData } from './ProductCard'
import { HandToggleButton, HandOverlay } from './HandCompare'
import { PRICES_BY_PAGES, TEXT_EXTRA_BY_SIZE, PAGE_OPTIONS_SMALL, PAGE_OPTIONS_LARGE } from '../../../config/pricing'
import './MobileProductModal.css'

const SHARED_MOBILE = ['/fotos/foto2-mobile.jpg', '/fotos/foto3-mobile.jpg', '/fotos/foto4-mobile.jpg', '/fotos/foto5-mobile.jpg']

const IMAGES: Record<string, string[]> = {
  chico:    ['/fotos/chico-mobile.jpg',    ...SHARED_MOBILE],
  mediano:  ['/fotos/mediano-mobile.jpg',  ...SHARED_MOBILE],
  grande:   ['/fotos/grande-mobile.jpg',   ...SHARED_MOBILE],
  vertical: ['/fotos/vertical-mobile.jpg', ...SHARED_MOBILE],
  cuadrado: ['/fotos/cuadrado-mobile.jpg', ...SHARED_MOBILE],
}

const BOOK_DIMS: Record<string, [number, number]> = {
  chico:    [21,   14.8],
  mediano:  [28,   21.6],
  grande:   [41,   29  ],
  vertical: [21.6, 28  ],
  cuadrado: [29,   29  ],
}
const BOOK_LABELS: Record<string, string> = {
  chico:    'Chico H',
  mediano:  'Mediano H',
  grande:   'Grande H',
  vertical: 'Vertical',
  cuadrado: 'Cuadrado',
}
const ORDER = ['chico', 'mediano', 'grande', 'vertical', 'cuadrado']
const SCALE_X = 314 / 41
const SCALE_Y = 228 / 29

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { product: ProductData; onClose: () => void }

export default function MobileProductModal({ product, onClose }: Props) {
  const [showComp,        setShowComp]        = useState(false)
  const [showHand,        setShowHand]        = useState(false)
  const [compSize,        setCompSize]        = useState(product.sizeId)
  const [activeSlide,     setActiveSlide]     = useState(0)
  const [pageIdx,         setPageIdx]         = useState(0)
  const [textExtra,       setTextExtra]       = useState(false)
  const [bookName,        setBookName]        = useState('')
  const [nameError,       setNameError]       = useState(false)
  const [cp,              setCp]              = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError,   setShippingError]   = useState<string | null>(null)

  const scrollRef   = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLarge     = ['grande', 'cuadrado'].includes(product.sizeId)
  const pageOptions = isLarge ? PAGE_OPTIONS_LARGE : PAGE_OPTIONS_SMALL
  const prices      = PRICES_BY_PAGES[product.sizeId] ?? [0, 0, 0]
  const textExtraPrice = TEXT_EXTRA_BY_SIZE[product.sizeId] ?? 10000
  const basePrice   = prices[pageIdx] + (textExtra ? textExtraPrice : 0)
  const images      = IMAGES[product.sizeId] ?? ['', '', '', '']

  const [aw, ah]  = BOOK_DIMS[compSize]
  const activePxW = Math.round(aw * SCALE_X)
  const activePxH = Math.round(ah * SCALE_Y)

  useEffect(() => {
    const MAP: Record<string, string> = {
      chico: 'chico_h', mediano: 'mediano_h', grande: 'grande_h',
      vertical: 'vertical', cuadrado: 'cuadrado',
    }
    try {
      const raw = sessionStorage.getItem('zeika_product_selection')
      if (raw) {
        const sel = JSON.parse(raw)
        if (sel.sizeId === (MAP[product.sizeId] ?? product.sizeId)) {
          if (typeof sel.pageIdx   === 'number')  setPageIdx(sel.pageIdx)
          if (typeof sel.textExtra === 'boolean') setTextExtra(sel.textExtra)
          if (typeof sel.bookName  === 'string')  setBookName(sel.bookName)
          setCp('')
          setShippingPrice(null)
          setShippingError(null)
          return
        }
      }
    } catch {}
    setPageIdx(0)
    setTextExtra(false)
    setCp('')
    setShippingPrice(null)
    setShippingError(null)
  }, [product.sizeId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => setActiveSlide(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = cp.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      setShippingPrice(null)
      setShippingError(trimmed.length > 0 ? 'CP inválido' : null)
      return
    }
    setShippingLoading(true)
    setShippingError(null)
    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`/api/shipping-quote?cp=${trimmed}`)
        const data = await res.json()
        if (!res.ok) {
          setShippingError(data.error ?? 'No se pudo calcular')
          setShippingPrice(null)
        } else {
          setShippingPrice(data.price as number)
          setShippingError(null)
        }
      } catch {
        setShippingError('No se pudo calcular')
        setShippingPrice(null)
      } finally {
        setShippingLoading(false)
      }
    }, 600)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [cp])

  return (
    <div className="mpm">

      {/* Scrollable area */}
      <div className="mpm__scroll">

        {/* Image carousel */}
        <div className="mpm__carousel">
          <div className="mpm__images" ref={scrollRef}>
            {images.map((src, i) =>
              src
                ? <img key={i} src={src} alt={product.name} className="mpm__image" />
                : <div key={i} className="mpm__image mpm__image--placeholder" />
            )}
          </div>
          <div className="mpm__dots">
            {images.map((_, i) => (
              <span key={i} className={`mpm__dot${i === activeSlide ? ' mpm__dot--active' : ''}`} />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="mpm__content">

          {/* Name + price */}
          <div className="mpm__header-row">
            <h2 className="mpm__name">{product.name}</h2>
            <span className="mpm__price">{fmt(basePrice)}</span>
          </div>

          {/* Dimensions */}
          <span className="mpm__dims">{product.dimensions}</span>

          {/* Comparar */}
          <button
            className="mpm__comparar"
            onClick={() => { setShowComp(true); setCompSize(product.sizeId) }}
          >
            Comparar con otros tamaños
          </button>

          {/* Page options */}
          <div className="mpm__section">
            <p className="mpm__section-label">CANTIDAD DE PÁGINAS</p>
            <div className="mpm__cards">
              {pageOptions.map((opt, i) => (
                <button
                  key={i}
                  className={`mpm__card${pageIdx === i ? ' mpm__card--selected' : ''}`}
                  onClick={() => setPageIdx(i)}
                >
                  <span className="mpm__card-top">{opt.pages} páginas</span>
                  <span className="mpm__card-bot">{opt.photos}</span>
                </button>
              ))}
            </div>
            <p className="mpm__section-note">
              Podés subir la cantidad de fotos que quieras — estas son solo orientativas basadas en 3 fotos por carilla.
            </p>
          </div>

          {/* Text options */}
          <div className="mpm__section">
            <p className="mpm__section-label">TEXTOS</p>
            <div className="mpm__cards">
              <button
                className={`mpm__card${!textExtra ? ' mpm__card--selected' : ''}`}
                onClick={() => setTextExtra(false)}
              >
                <span className="mpm__card-top">1 texto</span>
                <span className="mpm__card-bot">Incluído</span>
              </button>
              <button
                className={`mpm__card${textExtra ? ' mpm__card--selected' : ''}`}
                onClick={() => setTextExtra(true)}
              >
                <span className="mpm__card-top">Textos varios</span>
                <span className="mpm__card-bot">+{fmt(textExtraPrice)}</span>
              </button>
              {/* empty third slot to match card width */}
              <div />
            </div>
            <p className="mpm__section-note">
              <strong>1 texto:</strong> una dedicatoria o carta, sin límite de palabras. <strong>Textos varios:</strong> hasta 30-40 cartas — pensado para libros con mensajes de cumpleaños de varias personas.
            </p>
          </div>

          {/* Book name */}
          <div className="mpm__section">
            <p className="mpm__section-label">NOMBRE</p>
            <input
              ref={nameInputRef}
              className={`mpm__name-input${nameError ? ' mpm__name-input--error' : ''}`}
              placeholder="Ej: Verano Grecia 2024"
              value={bookName}
              onChange={e => { setBookName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
            />
          </div>

          {/* Details */}
          <div className="mpm__details">
            <p className="mpm__details-label">DETALLES DEL PRODUCTO</p>
            <ul className="mpm__details-list">
              <li>Tapa dura laminada con polipropileno mate de alta resistencia. Interior impreso en papel de 170 gramos de la más alta calidad.</li>
              <li>
                El envío no está incluído en el precio. Calculá tu envío aprox:
                <div className="mpm__cp-row">
                  <input
                    className="mpm__cp-input"
                    placeholder="Código postal"
                    value={cp}
                    maxLength={4}
                    inputMode="numeric"
                    onChange={e => setCp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  {shippingLoading && <span className="mpm__cp-status mpm__cp-status--loading">Calculando...</span>}
                  {!shippingLoading && shippingPrice !== null && (
                    <span className="mpm__cp-status mpm__cp-status--ok">{fmt(shippingPrice)}</span>
                  )}
                  {!shippingLoading && shippingError && (
                    <span className="mpm__cp-status mpm__cp-status--error">{shippingError}</span>
                  )}
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* CTA — fixed at bottom */}
      <div className="mpm__cta-bar">
        <button
          className="mpm__cta"
          onClick={async () => {
            if (!bookName.trim()) {
              setNameError(true)
              nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              nameInputRef.current?.focus()
              return
            }
            const MAP: Record<string, string> = {
              chico: 'chico_h', mediano: 'mediano_h', grande: 'grande_h',
              vertical: 'vertical', cuadrado: 'cuadrado',
            }
            sessionStorage.setItem('zeika_product_selection', JSON.stringify({
              sizeId: MAP[product.sizeId] ?? product.sizeId,
              pageIdx,
              textExtra,
              bookName,
            }))
            sessionStorage.setItem('zeika_back_product', product.sizeId)
            const { data: { session } } = await supabase.auth.getSession()
            if (session?.user) {
              window.location.href = '/orden'
            } else {
              sessionStorage.setItem('zeika_after_login', '/orden')
              window.location.href = '/login'
            }
          }}
        >
          CONTAR MI HISTORIA
        </button>
      </div>

      {/* Back arrow (top-left) */}
      <button className="mpm__back" onClick={onClose} aria-label="Volver">←</button>

      {/* Close button (top-right) */}
      <button className="mpm__close" onClick={onClose} aria-label="Cerrar">×</button>

      {/* Comparar overlay */}
      {showComp && (
        <div className="mpm__comp-backdrop" onClick={() => setShowComp(false)}>
          <div className="mpm__comp-panel" onClick={e => e.stopPropagation()}>
            <div className="mpm__comp-header">
              <HandToggleButton active={showHand} onClick={() => setShowHand(v => !v)} />
              <button className="mpm__comp-close" onClick={() => setShowComp(false)}>×</button>
            </div>
            <div className="mpm__comp-canvas-wrap">
              <div className="mpm__comp-canvas">
                <HandOverlay show={showHand} scaleX={SCALE_X} scaleY={SCALE_Y} />
                {ORDER.map(id => {
                  const [w, h] = BOOK_DIMS[id]
                  return (
                    <div
                      key={id}
                      className={`mpm__comp-rect${id === compSize ? ' mpm__comp-rect--active' : ''}`}
                      style={{ width: Math.round(w * SCALE_X), height: Math.round(h * SCALE_Y) }}
                    />
                  )
                })}
                <span className="mpm__comp-dim mpm__comp-dim--w" style={{ top: activePxH + 6, left: activePxW / 2 }}>
                  {aw} cm
                </span>
                <span className="mpm__comp-dim mpm__comp-dim--h" style={{ left: activePxW + 8, top: activePxH / 2 }}>
                  {ah} cm
                </span>
              </div>
            </div>
            <div className="mpm__comp-tabs">
              {ORDER.map(id => (
                <button
                  key={id}
                  className={`mpm__comp-tab${id === compSize ? ' mpm__comp-tab--active' : ''}`}
                  onClick={() => setCompSize(id)}
                >
                  {BOOK_LABELS[id]}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
