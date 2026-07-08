'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import './MobileVinoModal.css'

const IMAGE = '/fotos/vinos.jpg'

// Precios placeholder — a definir
const PRICE_BASE: Record<'tinto' | 'blanco', number> = {
  tinto:  45000,
  blanco: 45000,
}
const DESIGN_EXTRA: Record<'foto_y_texto' | 'diseno_personalizado', number> = {
  foto_y_texto:        0,
  diseno_personalizado: 15000,
}

const WHATSAPP_NUMBER = '5491133521921'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { onClose: () => void }

export default function MobileVinoModal({ onClose }: Props) {
  const [variedad,       setVariedad]       = useState<'tinto' | 'blanco'>('tinto')
  const [disenoTipo,     setDisenoTipo]     = useState<'foto_y_texto' | 'diseno_personalizado'>('foto_y_texto')
  const [cantidad,       setCantidad]       = useState<1 | 6>(1)
  const [disenoMultiple, setDisenoMultiple] = useState<'mismo' | 'diferente'>('mismo')
  const [labelName,      setLabelName]      = useState('')
  const [nameError,      setNameError]      = useState(false)
  const [cp,             setCp]             = useState('')
  const nameInputRef = useRef<HTMLInputElement>(null)
  const [shippingPrice,   setShippingPrice]   = useState<number | null>(null)
  const [shippingLoading, setShippingLoading] = useState(false)
  const [shippingError,   setShippingError]   = useState<string | null>(null)

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const unitPrice  = PRICE_BASE[variedad] + DESIGN_EXTRA[disenoTipo]
  const totalPrice = unitPrice * cantidad

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
        <div className="mpm__carousel">
          <div className="mpm__images">
            <img src={IMAGE} alt="Vino personalizado" className="mpm__image" />
          </div>
        </div>

        {/* Content */}
        <div className="mpm__content">

          {/* Name + price */}
          <div className="mpm__header-row">
            <h2 className="mpm__name">Vino Personalizado</h2>
            <span className="mpm__price">{fmt(totalPrice)}</span>
          </div>

          <span className="mpm__dims">750 ml</span>

          {/* Variedad */}
          <div className="mpm__section">
            <p className="mpm__section-label">VARIEDAD</p>
            <div className="mpm__cards mpm__cards--2">
              <button
                className={`mpm__card${variedad === 'tinto' ? ' mpm__card--selected' : ''}`}
                onClick={() => setVariedad('tinto')}
              >
                <span className="mpm__card-top">Tinto</span>
              </button>
              <button
                className={`mpm__card${variedad === 'blanco' ? ' mpm__card--selected' : ''}`}
                onClick={() => setVariedad('blanco')}
              >
                <span className="mpm__card-top">Blanco</span>
              </button>
            </div>
          </div>

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
              onChange={e => setCantidad(Number(e.target.value) as 1 | 6)}
            >
              <option value={1}>1 botella</option>
              <option value={6}>6 botellas</option>
            </select>
          </div>

          {/* Mismo / distinto diseño — solo si cantidad = 6 */}
          {cantidad === 6 && (
            <div className="mpm__section">
              <p className="mpm__section-label">DISEÑO PARA LAS 6 BOTELLAS</p>
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
              <li>Botella de vino {variedad} de 750ml con etiqueta personalizada.</li>
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
              variedad,
              disenoTipo,
              cantidad,
              disenoMultiple: cantidad === 6 ? disenoMultiple : null,
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
