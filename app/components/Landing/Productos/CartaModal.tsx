'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARTA_PRICE } from '../../../config/pricing'
import './CartaModal.css'

const PLACEHOLDER_IMAGE = '/fotos/cartas.jpg'

const WHATSAPP_NUMBER = '5491133521921'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { onClose: () => void }

export default function CartaModal({ onClose }: Props) {
  const [cardType,    setCardType]    = useState<'truco' | 'poker' | null>(null)
  const [typeError,   setTypeError]   = useState(false)
  const [photoUrl,    setPhotoUrl]    = useState<string | null>(null)
  const [uploading,   setUploading]   = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [photoError,  setPhotoError]  = useState(false)
  const [labelName,   setLabelName]   = useState('')
  const [nameError,   setNameError]   = useState(false)
  const [submitting,  setSubmitting]  = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const typeSectionRef = useRef<HTMLDivElement>(null)
  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  function handleChooseFileClick() {
    if (!cardType) {
      setTypeError(true)
      typeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    fileInputRef.current?.click()
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setPhotoError(false)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'zeika/cartas')
      const res  = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'No se pudo subir la foto')
      setPhotoUrl(data.url)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la foto')
    } finally {
      setUploading(false)
    }
  }

  async function handleSubmit() {
    if (!cardType) {
      setTypeError(true)
      typeSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!photoUrl) {
      setPhotoError(true)
      fileInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }
    if (!labelName.trim()) {
      setNameError(true)
      nameInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      nameInputRef.current?.focus()
      return
    }

    setSubmitting(true)
    sessionStorage.setItem('zeika_product_selection', JSON.stringify({
      productType: 'cartas',
      cardType,
      photoUrl,
      labelName,
    }))
    sessionStorage.setItem('zeika_back_product', 'cartas')
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      window.location.href = '/orden-cartas'
    } else {
      sessionStorage.setItem('zeika_after_login', '/orden-cartas')
      window.location.href = '/login'
    }
  }

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm" onClick={e => e.stopPropagation()}>

        {/* ── Left panel ── */}
        <div className="pm__left">
          <div className="pm__carousel">
            <div className="pm__slide">
              <img src={photoUrl ?? PLACEHOLDER_IMAGE} alt="Cartas personalizadas" className="pm__img" />
            </div>
          </div>
        </div>

        {/* ── Close ── */}
        <button className="pm__close" onClick={onClose} aria-label="Cerrar">×</button>

        {/* ── Right panel ── */}
        <div className="pm__right">
          <div className="pm__content">

            {/* Title + price */}
            <div className="pm__header-row">
              <h2 className="pm__name">Cartas Personalizadas</h2>
              <span className="pm__price-header">{fmt(CARTA_PRICE)}</span>
            </div>

            <div className="pm__dims-row">
              <span className="pm__dims">Mazo de truco o poker</span>
            </div>

            {/* Tipo de mazo */}
            <div className="pm__section" ref={typeSectionRef}>
              <p className="pm__section-label">TIPO DE MAZO</p>
              <div className="pm__cards pm__cards--2">
                <button
                  className={`pm__card${cardType === 'truco' ? ' pm__card--selected' : ''}`}
                  onClick={() => { setCardType('truco'); setTypeError(false) }}
                >
                  <span className="pm__card-top">Truco</span>
                </button>
                <button
                  className={`pm__card${cardType === 'poker' ? ' pm__card--selected' : ''}`}
                  onClick={() => { setCardType('poker'); setTypeError(false) }}
                >
                  <span className="pm__card-top">Poker</span>
                </button>
              </div>
              {typeError && <p className="carta-modal__error">Elegí truco o poker para poder subir la foto.</p>}
            </div>

            {/* Foto */}
            <div className="pm__section">
              <p className="pm__section-label">TU FOTO</p>
              <p className="pm__section-note">
                Subí una foto y armamos un mazo entero con esa misma foto en todas las cartas.
              </p>
              <input
                ref={fileInputRef}
                id="carta-photo-input"
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={handleFileChange}
                className="carta-modal__file-input"
              />
              <button
                type="button"
                onClick={handleChooseFileClick}
                className={`carta-modal__upload-btn${photoError ? ' carta-modal__upload-btn--error' : ''}${!cardType ? ' carta-modal__upload-btn--disabled' : ''}`}
              >
                {uploading ? 'Subiendo...' : photoUrl ? '✓ Cambiar foto' : 'Elegir foto'}
              </button>
              {uploadError && <p className="carta-modal__error">{uploadError}</p>}
              <p className="pm__section-note">
                {' '}
                <a
                  className="pm__whatsapp-link"
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero consultar sobre las cartas personalizadas')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ¿Dudas? Escribinos por WhatsApp
                </a>
              </p>
            </div>

            {/* Nombre de referencia */}
            <div className="pm__section">
              <p className="pm__section-label">NOMBRE DE REFERENCIA</p>
              <input
                ref={nameInputRef}
                className={`pm__name-input${nameError ? ' pm__name-input--error' : ''}`}
                placeholder="Ej: Mazo Cumple Fer"
                value={labelName}
                onChange={e => { setLabelName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
              />
            </div>

            {/* Details */}
            <div className="pm__details">
              <p className="pm__details-label">Detalles del producto:</p>
              <ul className="pm__details-list">
                <li>Mazo completo con tu foto impresa en cada carta.</li>
                <li>Se paga al comprar, desde &quot;Mis pedidos&quot;.</li>
              </ul>
            </div>
          </div>

          {/* CTA pinned at bottom */}
          <button className="pm__cta" onClick={handleSubmit} disabled={submitting || uploading}>
            ENVIAR MI FOTO
          </button>
        </div>
      </div>
    </div>
  )
}
