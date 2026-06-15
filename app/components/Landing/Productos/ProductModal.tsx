'use client'

import { useState, useEffect, useRef } from 'react'
import SizeComparison from './SizeComparison'
import type { ProductData } from './ProductCard'
import './ProductModal.css'

const IMAGES: Record<string, string[]> = {
  chico:    ['/fotos/chico2.jpg',    '', '', ''],
  mediano:  ['/fotos/mediano2.jpg',  '', '', ''],
  grande:   ['/fotos/grande2.jpg',   '', '', ''],
  vertical: ['/fotos/vertical2.jpg', '', '', ''],
  cuadrado: ['/fotos/cuadrado2.jpg', '', '', ''],
}

// [20 pag, 30 pag, 40 pag]
const PRICES_BY_PAGES: Record<string, [number, number, number]> = {
  chico:    [82700,  104300, 118700],
  mediano:  [94700,  116700, 138700],
  grande:   [128800, 164800, 200800],
  vertical: [94700,  116700, 138700],
  cuadrado: [125800, 161800, 197800],
}

const PAGE_OPTIONS_SMALL = [
  { photos: '20-100 fotos',  pages: 20 },
  { photos: '101-180 fotos', pages: 30 },
  { photos: '180-240 fotos', pages: 40 },
]
const PAGE_OPTIONS_LARGE = [
  { photos: '20-160 fotos',  pages: 20 },
  { photos: '161-240 fotos', pages: 30 },
  { photos: '241-350 fotos', pages: 40 },
]

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { product: ProductData; onClose: () => void }

export default function ProductModal({ product, onClose }: Props) {
  const [slide,           setSlide]           = useState(0)
  const [showComp,        setShowComp]        = useState(false)
  const [compSize,        setCompSize]        = useState(product.sizeId)
  const [pageIdx,         setPageIdx]         = useState(0)
  const [textExtra,       setTextExtra]       = useState(false)
  const [bookName,        setBookName]        = useState('')
  const [cp,              setCp]              = useState('')
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError,   setShippingError]   = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLarge     = ['grande', 'cuadrado'].includes(product.sizeId)
  const pageOptions = isLarge ? PAGE_OPTIONS_LARGE : PAGE_OPTIONS_SMALL
  const prices      = PRICES_BY_PAGES[product.sizeId] ?? [0, 0, 0]
  const basePrice   = prices[pageIdx] + (textExtra ? 10000 : 0)
  const images      = IMAGES[product.sizeId] ?? ['', '', '', '']

  useEffect(() => {
    setPageIdx(0)
    setTextExtra(false)
    setBookName('')
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
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const trimmed = cp.trim()
    if (!/^\d{4}$/.test(trimmed)) {
      setShippingPrice(null)
      setShippingError(trimmed.length > 0 ? 'CP inválido (4 dígitos)' : null)
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

  function prev() { setSlide(s => (s + 3) % 4) }
  function next() { setSlide(s => (s + 1) % 4) }

  function toggleComp() {
    setShowComp(v => !v)
    setCompSize(product.sizeId)
    setSlide(0)
  }

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm" onClick={e => e.stopPropagation()}>

        {/* ── Left panel ── */}
        <div className="pm__left">
          {showComp ? (
            <SizeComparison activeSize={compSize} onChangeSize={setCompSize} />
          ) : (
            <div className="pm__carousel">
              <div className="pm__slide">
                {images[slide]
                  ? <img src={images[slide]} alt={product.name} className="pm__img" />
                  : <div className="pm__placeholder" />}
              </div>
              <button className="pm__arrow pm__arrow--prev" onClick={prev} aria-label="Anterior">&#8249;</button>
              <button className="pm__arrow pm__arrow--next" onClick={next} aria-label="Siguiente">&#8250;</button>
              <div className="pm__dots">
                {[0, 1, 2, 3].map(i => (
                  <button
                    key={i}
                    className={`pm__dot${i === slide ? ' pm__dot--active' : ''}`}
                    onClick={() => setSlide(i)}
                    aria-label={`Imagen ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Close ── */}
        <button className="pm__close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* ── Right panel ── */}
        <div className="pm__right">

          {/* Scrollable content area */}
          <div className="pm__content">

            {/* Title + price */}
            <div className="pm__header-row">
              <h2 className="pm__name">{product.name}</h2>
              <span className="pm__price-header">{fmt(basePrice)}</span>
            </div>

            {/* Dims + Comparar */}
            <div className="pm__dims-row">
              <span className="pm__dims">{product.dimensions}</span>
              <button
                className={`pm__comparar${showComp ? ' pm__comparar--active' : ''}`}
                onClick={toggleComp}
              >
                Comparar con otros tamaños
              </button>
            </div>

            {/* Page options */}
            <div className="pm__section">
              <p className="pm__section-label">CANTIDAD DE FOTOS A SUBIR</p>
              <div className="pm__cards">
                {pageOptions.map((opt, i) => (
                  <button
                    key={i}
                    className={`pm__card${pageIdx === i ? ' pm__card--selected' : ''}`}
                    onClick={() => setPageIdx(i)}
                  >
                    <span className="pm__card-top">{opt.photos}</span>
                    <span className="pm__card-bot">{opt.pages} páginas</span>
                  </button>
                ))}
              </div>
              <p className="pm__section-note">
                La cantidad de fotos es una recomendación ya que calculamos 3 fotos por carilla pero se puede adaptar a lo que buscás.
              </p>
            </div>

            {/* Text options */}
            <div className="pm__section">
              <p className="pm__section-label">TEXTOS</p>
              <div className="pm__cards pm__cards--2">
                <button
                  className={`pm__card${!textExtra ? ' pm__card--selected' : ''}`}
                  onClick={() => setTextExtra(false)}
                >
                  <span className="pm__card-top">1 texto</span>
                  <span className="pm__card-bot">Incluído</span>
                </button>
                <button
                  className={`pm__card${textExtra ? ' pm__card--selected' : ''}`}
                  onClick={() => setTextExtra(true)}
                >
                  <span className="pm__card-top">Textos varios</span>
                  <span className="pm__card-bot">+$10.000</span>
                </button>
              </div>
            </div>

            {/* Book name */}
            <div className="pm__section">
              <p className="pm__section-label">NOMBRE</p>
              <input
                className="pm__name-input"
                placeholder="Ej: Verano Grecia 2024"
                value={bookName}
                onChange={e => setBookName(e.target.value)}
              />
            </div>

            {/* Details */}
            <div className="pm__details">
              <p className="pm__details-label">Detalles del producto:</p>
              <ul className="pm__details-list">
                <li>Tapa dura laminada con polipropileno mate de alta resistencia. Interior impreso en papel de 170 gramos de la más alta calidad.</li>
                <li className="pm__cp-row">
                  <span>El envío no está incluído en el precio. Calculá tu envío aprox:</span>
                  <input
                    className="pm__cp-input"
                    placeholder="CP"
                    value={cp}
                    maxLength={4}
                    onChange={e => setCp(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  />
                  {shippingLoading && (
                    <span className="pm__cp-status pm__cp-status--loading">Calculando...</span>
                  )}
                  {!shippingLoading && shippingPrice !== null && (
                    <span className="pm__cp-status pm__cp-status--ok">{fmt(shippingPrice)}</span>
                  )}
                  {!shippingLoading && shippingError && (
                    <span className="pm__cp-status pm__cp-status--error">{shippingError}</span>
                  )}
                </li>
              </ul>
            </div>
          </div>

          {/* CTA pinned at bottom */}
          <a
            href="/orden"
            className="pm__cta"
            onClick={() => {
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
            }}
          >
            CONTAR MI HISTORIA
          </a>
        </div>
      </div>
    </div>
  )
}
