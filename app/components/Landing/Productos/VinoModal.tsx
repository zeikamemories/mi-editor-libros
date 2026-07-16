'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { VINO_PRICE_BASE, VINO_DESIGN_EXTRA, VINO_CANTIDADES, vinoDiscount } from '../../../config/pricing'
import './VinoModal.css'

const IMAGE = '/fotos/vinos.jpg'

// Placeholders — reemplazar por fotos reales de cada combinación cuando estén listas.
const VINO_IMAGES: Record<string, string[]> = {
  'tinto_foto_y_texto':          ['/fotos/vinos.jpg'],
  'tinto_diseno_personalizado':  ['/fotos/vinos.jpg', '/fotos/grande.jpg', '/fotos/grande2.jpg'],
  'blanco_foto_y_texto':         ['/fotos/mediano.jpg'],
  'blanco_diseno_personalizado': ['/fotos/cuadrado.jpg', '/fotos/cuadrado2.jpg'],
}

const WHATSAPP_NUMBER = '5491133521921'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { onClose: () => void }

export default function VinoModal({ onClose }: Props) {
  const [variedad,       setVariedad]       = useState<'tinto' | 'blanco'>('tinto')
  const [disenoTipo,     setDisenoTipo]     = useState<'foto_y_texto' | 'diseno_personalizado'>('foto_y_texto')
  const [cantidad,       setCantidad]       = useState<typeof VINO_CANTIDADES[number]>(1)
  const [disenoMultiple, setDisenoMultiple] = useState<'mismo' | 'diferente'>('mismo')
  const [labelName,      setLabelName]      = useState('')
  const [nameError,      setNameError]      = useState(false)
  const [cp,             setCp]             = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError,   setShippingError]   = useState<string | null>(null)
  const [slide,           setSlide]           = useState(0)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unitPrice  = VINO_PRICE_BASE[variedad] + VINO_DESIGN_EXTRA[disenoTipo]
  const discount   = vinoDiscount(cantidad)
  const totalPrice = unitPrice * cantidad * discount
  const images     = VINO_IMAGES[`${variedad}_${disenoTipo}`] ?? [IMAGE]

  // La foto se actualiza según variedad + tipo de diseño elegidos; si cambia la combinación,
  // arrancamos de vuelta en la primera foto de ese set.
  useEffect(() => {
    setSlide(0)
  }, [variedad, disenoTipo])

  function prevSlide() { setSlide(s => (s - 1 + images.length) % images.length) }
  function nextSlide() { setSlide(s => (s + 1) % images.length) }

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

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm" onClick={e => e.stopPropagation()}>

        {/* ── Left panel ── */}
        <div className="pm__left">
          <div className="pm__carousel">
            <div className="pm__slide">
              <img src={images[slide]} alt="Vino personalizado" className="pm__img" />
            </div>
            {images.length > 1 && (
              <>
                <button className="pm__arrow pm__arrow--prev" onClick={prevSlide} aria-label="Anterior">&#8249;</button>
                <button className="pm__arrow pm__arrow--next" onClick={nextSlide} aria-label="Siguiente">&#8250;</button>
                <div className="pm__dots">
                  {images.map((_, i) => (
                    <button
                      key={i}
                      className={`pm__dot${i === slide ? ' pm__dot--active' : ''}`}
                      onClick={() => setSlide(i)}
                      aria-label={`Imagen ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Close ── */}
        <button className="pm__close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* ── Right panel ── */}
        <div className="pm__right">
          <div className="pm__content">

            {/* Title + price */}
            <div className="pm__header-row">
              <h2 className="pm__name">Vino Personalizado</h2>
              <span className="pm__price-header">{fmt(totalPrice)}</span>
            </div>

            <div className="pm__dims-row">
              <span className="pm__dims">750 ml</span>
            </div>

            {/* Variedad */}
            <div className="pm__section">
              <p className="pm__section-label">VARIEDAD</p>
              <div className="pm__cards pm__cards--2">
                <button
                  className={`pm__card${variedad === 'tinto' ? ' pm__card--selected' : ''}`}
                  onClick={() => setVariedad('tinto')}
                >
                  <span className="pm__card-top">Tinto</span>
                </button>
                <button
                  className={`pm__card${variedad === 'blanco' ? ' pm__card--selected' : ''}`}
                  onClick={() => setVariedad('blanco')}
                >
                  <span className="pm__card-top">Blanco</span>
                </button>
              </div>
            </div>

            {/* Tipo de diseño */}
            <div className="pm__section">
              <p className="pm__section-label">TIPO DE DISEÑO</p>
              <div className="pm__cards pm__cards--2">
                <button
                  className={`pm__card${disenoTipo === 'foto_y_texto' ? ' pm__card--selected' : ''}`}
                  onClick={() => setDisenoTipo('foto_y_texto')}
                >
                  <span className="pm__card-top">Con foto y texto</span>
                </button>
                <button
                  className={`pm__card${disenoTipo === 'diseno_personalizado' ? ' pm__card--selected' : ''}`}
                  onClick={() => setDisenoTipo('diseno_personalizado')}
                >
                  <span className="pm__card-top">Con diseño personalizado</span>
                </button>
              </div>
              <p className="pm__section-note">
                {disenoTipo === 'foto_y_texto'
                  ? 'Nos vas a poder mandar la foto y el texto de la etiqueta después de la compra.'
                  : 'Después de la compra vemos juntas el diseño personalizado — por WhatsApp o mandándonos referencias.'}
                {' '}
                <a
                  className="pm__whatsapp-link"
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero consultar sobre el vino personalizado')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ¿Dudas? Escribinos por WhatsApp
                </a>
              </p>
            </div>

            {/* Cantidad */}
            <div className="pm__section">
              <p className="pm__section-label">CANTIDAD</p>
              <select
                className="pm__select"
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value) as typeof VINO_CANTIDADES[number])}
              >
                {VINO_CANTIDADES.map(n => (
                  <option key={n} value={n}>{n} botella{n > 1 ? 's' : ''}{n === 6 ? ' — 20% off' : ''}</option>
                ))}
              </select>
              {discount < 1 && (
                <p className="pm__section-note">Descuento del 20% aplicado por llevar 6 botellas.</p>
              )}
            </div>

            {/* Mismo / distinto diseño — solo si pide más de una botella */}
            {cantidad > 1 && (
              <div className="pm__section">
                <p className="pm__section-label">DISEÑO PARA LAS {cantidad} BOTELLAS</p>
                <div className="pm__cards pm__cards--2">
                  <button
                    className={`pm__card${disenoMultiple === 'mismo' ? ' pm__card--selected' : ''}`}
                    onClick={() => setDisenoMultiple('mismo')}
                  >
                    <span className="pm__card-top">Mismo diseño</span>
                  </button>
                  <button
                    className={`pm__card${disenoMultiple === 'diferente' ? ' pm__card--selected' : ''}`}
                    onClick={() => setDisenoMultiple('diferente')}
                  >
                    <span className="pm__card-top">Diseño diferente</span>
                  </button>
                </div>
              </div>
            )}

            {/* Nombre */}
            <div className="pm__section">
              <p className="pm__section-label">NOMBRE</p>
              <input
                ref={nameInputRef}
                className={`pm__name-input${nameError ? ' pm__name-input--error' : ''}`}
                placeholder="Ej: Casamiento Fer & Gaby"
                value={labelName}
                onChange={e => { setLabelName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
              />
            </div>

            {/* Details */}
            <div className="pm__details">
              <p className="pm__details-label">Detalles del producto:</p>
              <ul className="pm__details-list">
                <li>Botella de vino {variedad} de 750ml con etiqueta personalizada.</li>
                <li className="pm__cp-row">
                  <span>El envío no está incluído en el precio. Calculá tu envío aprox:</span>
                  <input
                    className="pm__cp-input"
                    placeholder="CP"
                    value={cp}
                    maxLength={4}
                    inputMode="numeric"
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
          <button
            className="pm__cta"
            onClick={async () => {
              if (!labelName.trim()) {
                setNameError(true)
                nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                nameInputRef.current?.focus()
                return
              }
              sessionStorage.setItem('zeika_product_selection', JSON.stringify({
                productType:  'vino',
                variedad,
                disenoTipo,
                cantidad,
                disenoMultiple: cantidad > 1 ? disenoMultiple : null,
                labelName,
              }))
              sessionStorage.setItem('zeika_back_product', 'vinos')
              const { data: { session } } = await supabase.auth.getSession()
              if (session?.user) {
                window.location.href = '/orden-vino'
              } else {
                sessionStorage.setItem('zeika_after_login', '/orden-vino')
                window.location.href = '/login'
              }
            }}
          >
            QUIERO MI VINO
          </button>
        </div>
      </div>
    </div>
  )
}
