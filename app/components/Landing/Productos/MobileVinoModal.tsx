'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { VINO_PRICE_BASE, VINO_DESIGN_EXTRA, VINO_CANTIDADES, VINO_INFO, vinoDiscount } from '../../../config/pricing'
import './MobileVinoModal.css'

const IMAGE = '/fotos/VinosLanding.jpg'

// Placeholders — reemplazar por fotos reales del vino Las Perdices cuando estén listas.
const VINO_IMAGES: Record<string, string[]> = {
  'foto_y_texto':          ['/fotos/VinoTexto4.jpg', '/fotos/VinoTexto.jpg', '/fotos/VinoTexto2.jpg', '/fotos/VinoTexto3.jpg'],
  'diseno_personalizado':  ['/fotos/VinoDiseno3.jpg', '/fotos/VinoDiseno.jpg', '/fotos/VinoDiseno2.jpg', '/fotos/VinoDiseno4.jpg', '/fotos/VinoDiseno5.jpg'],
}

const WHATSAPP_NUMBER = '5491133521921'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { onClose: () => void }

export default function MobileVinoModal({ onClose }: Props) {
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
  const [activeSlide,     setActiveSlide]     = useState(0)
  const imagesScrollRef = useRef<HTMLDivElement>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unitPrice  = VINO_PRICE_BASE + VINO_DESIGN_EXTRA[disenoTipo]
  const discount   = vinoDiscount(cantidad)
  const totalPrice = unitPrice * cantidad * discount
  const images     = VINO_IMAGES[disenoTipo] ?? [IMAGE]

  useEffect(() => {
    const el = imagesScrollRef.current
    if (!el) return
    const onScroll = () => setActiveSlide(Math.round(el.scrollLeft / el.clientWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  function goToSlide(i: number) {
    const el = imagesScrollRef.current
    if (!el) return
    const index = (i + images.length) % images.length
    el.scrollTo({ left: index * el.clientWidth, behavior: 'smooth' })
  }

  // La foto se actualiza según el tipo de diseño elegido; si cambia, volvemos a la
  // primera foto de ese set.
  useEffect(() => {
    setActiveSlide(0)
    imagesScrollRef.current?.scrollTo({ left: 0 })
  }, [disenoTipo])

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

        {/* Image */}
        <div className="mvm__carousel">
          <div className="mvm__images" ref={imagesScrollRef}>
            {images.map((src, i) => (
              <img key={i} src={src} alt="Vino personalizado" className="mvm__image" />
            ))}
          </div>
          {images.length > 1 && (
            <>
              <button className="mvm__arrow mvm__arrow--prev" onClick={() => goToSlide(activeSlide - 1)} aria-label="Anterior">&#8249;</button>
              <button className="mvm__arrow mvm__arrow--next" onClick={() => goToSlide(activeSlide + 1)} aria-label="Siguiente">&#8250;</button>
              <div className="mvm__dots">
                {images.map((_, i) => (
                  <button
                    key={i}
                    className={`mvm__dot${i === activeSlide ? ' mvm__dot--active' : ''}`}
                    onClick={() => goToSlide(i)}
                    aria-label={`Imagen ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Content */}
        <div className="mpm__content">

          {/* Name + price */}
          <div className="mpm__header-row">
            <h2 className="mpm__name">Vino Personalizado</h2>
            <span className="mpm__price">{fmt(totalPrice)}</span>
          </div>

          <span className="mpm__dims">{VINO_INFO.nombre} {VINO_INFO.linea} {VINO_INFO.varietal} 750ml</span>

          {/* Tipo de diseño */}
          <div className="mpm__section">
            <p className="mpm__section-label">TIPO DE DISEÑO</p>
            <div className="mpm__cards mpm__cards--2">
              <button
                className={`mpm__card${disenoTipo === 'foto_y_texto' ? ' mpm__card--selected' : ''}`}
                onClick={() => setDisenoTipo('foto_y_texto')}
              >
                <span className="mpm__card-top">Con foto y texto</span>
              </button>
              <button
                className={`mpm__card${disenoTipo === 'diseno_personalizado' ? ' mpm__card--selected' : ''}`}
                onClick={() => setDisenoTipo('diseno_personalizado')}
              >
                <span className="mpm__card-top">Con diseño personalizado</span>
              </button>
            </div>
            <p className="mpm__section-note">
              {disenoTipo === 'foto_y_texto'
                ? 'Nos vas a poder mandar la foto y el texto de la etiqueta después de la compra.'
                : 'Después de la compra vemos juntas el diseño personalizado — por WhatsApp o mandándonos referencias.'}
              {' '}
              <a
                className="mpm__whatsapp-link"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero consultar sobre el vino personalizado')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ¿Dudas? Escribinos por WhatsApp
              </a>
            </p>
          </div>

          {/* Cantidad */}
          <div className="mpm__section">
            <p className="mpm__section-label">CANTIDAD</p>
            <select
              className="mpm__select"
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value) as typeof VINO_CANTIDADES[number])}
            >
              {VINO_CANTIDADES.map(n => (
                <option key={n} value={n}>{n} botella{n > 1 ? 's' : ''}{n === 6 ? ' — 20% off' : ''}</option>
              ))}
            </select>
            {discount < 1 && (
              <p className="mpm__section-note">Descuento del 20% aplicado por llevar 6 botellas.</p>
            )}
          </div>

          {/* Mismo / distinto diseño — solo si pide más de una botella */}
          {cantidad > 1 && (
            <div className="mpm__section">
              <p className="mpm__section-label">DISEÑO PARA LAS {cantidad} BOTELLAS</p>
              <div className="mpm__cards mpm__cards--2">
                <button
                  className={`mpm__card${disenoMultiple === 'mismo' ? ' mpm__card--selected' : ''}`}
                  onClick={() => setDisenoMultiple('mismo')}
                >
                  <span className="mpm__card-top">Mismo diseño</span>
                </button>
                <button
                  className={`mpm__card${disenoMultiple === 'diferente' ? ' mpm__card--selected' : ''}`}
                  onClick={() => setDisenoMultiple('diferente')}
                >
                  <span className="mpm__card-top">Diseño diferente</span>
                </button>
              </div>
            </div>
          )}

          {/* Nombre */}
          <div className="mpm__section">
            <p className="mpm__section-label">NOMBRE</p>
            <input
              ref={nameInputRef}
              className={`mpm__name-input${nameError ? ' mpm__name-input--error' : ''}`}
              placeholder="Ej: Casamiento Fer & Gaby"
              value={labelName}
              onChange={e => { setLabelName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
            />
          </div>

          {/* Details */}
          <div className="mpm__details">
            <p className="mpm__details-label">DETALLES DEL PRODUCTO</p>
            <ul className="mpm__details-list">
              <li>Bodega: {VINO_INFO.bodega} — {VINO_INFO.linea} {VINO_INFO.varietal}, {VINO_INFO.origen}.</li>
              <li>Botella de {VINO_INFO.volumen} con etiqueta personalizada.</li>
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
            if (!labelName.trim()) {
              setNameError(true)
              nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
              nameInputRef.current?.focus()
              return
            }
            sessionStorage.setItem('zeika_product_selection', JSON.stringify({
              productType:  'vino',
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

      {/* Back arrow (top-left) */}
      <button className="mpm__back" onClick={onClose} aria-label="Volver">←</button>

      {/* Close button (top-right) */}
      <button className="mpm__close" onClick={onClose} aria-label="Cerrar">×</button>
    </div>
  )
}
