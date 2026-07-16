'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../../lib/supabase'
import { CARTA_PRICE } from '../../../config/pricing'
import './MobileCartaModal.css'

const PLACEHOLDER_IMAGE = '/fotos/cartas.jpg'

const WHATSAPP_NUMBER = '5491133521921'

function fmt(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

type Props = { onClose: () => void }

export default function MobileCartaModal({ onClose }: Props) {
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
    <div className="mpm">

      {/* Scrollable area */}
      <div className="mpm__scroll">

        {/* Image */}
        <div className="mvm__carousel">
          <div className="mvm__images">
            <img src={photoUrl ?? PLACEHOLDER_IMAGE} alt="Cartas personalizadas" className="mvm__image" />
          </div>
        </div>

        {/* Content */}
        <div className="mpm__content">

          {/* Name + price */}
          <div className="mpm__header-row">
            <h2 className="mpm__name">Cartas Personalizadas</h2>
            <span className="mpm__price">{fmt(CARTA_PRICE)}</span>
          </div>

          <span className="mpm__dims">Mazo de truco o poker</span>

          {/* Tipo de mazo */}
          <div className="mpm__section" ref={typeSectionRef}>
            <p className="mpm__section-label">TIPO DE MAZO</p>
            <div className="mpm__cards mpm__cards--2">
              <button
                className={`mpm__card${cardType === 'truco' ? ' mpm__card--selected' : ''}`}
                onClick={() => { setCardType('truco'); setTypeError(false) }}
              >
                <span className="mpm__card-top">Truco</span>
              </button>
              <button
                className={`mpm__card${cardType === 'poker' ? ' mpm__card--selected' : ''}`}
                onClick={() => { setCardType('poker'); setTypeError(false) }}
              >
                <span className="mpm__card-top">Poker</span>
              </button>
            </div>
            {typeError && <p className="carta-modal__error">Elegí truco o poker para poder subir la foto.</p>}
          </div>

          {/* Foto */}
          <div className="mpm__section">
            <p className="mpm__section-label">TU FOTO</p>
            <p className="mpm__section-note">
              Subí una foto y armamos un mazo entero con esa misma foto en todas las cartas.
            </p>
            <input
              ref={fileInputRef}
              id="mobile-carta-photo-input"
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
            <p className="mpm__section-note">
              <a
                className="mpm__whatsapp-link"
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Hola! Quiero consultar sobre las cartas personalizadas')}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                ¿Dudas? Escribinos por WhatsApp
              </a>
            </p>
          </div>

          {/* Nombre de referencia */}
          <div className="mpm__section">
            <p className="mpm__section-label">NOMBRE DE REFERENCIA</p>
            <input
              ref={nameInputRef}
              className={`mpm__name-input${nameError ? ' mpm__name-input--error' : ''}`}
              placeholder="Ej: Mazo Cumple Fer"
              value={labelName}
              onChange={e => { setLabelName(e.target.value); if (e.target.value.trim()) setNameError(false) }}
            />
          </div>

          {/* Details */}
          <div className="mpm__details">
            <p className="mpm__details-label">DETALLES DEL PRODUCTO</p>
            <ul className="mpm__details-list">
              <li>Mazo completo con tu foto impresa en cada carta.</li>
              <li>Se paga al comprar, desde &quot;Mis pedidos&quot;.</li>
            </ul>
          </div>

        </div>
      </div>

      {/* CTA — fixed at bottom */}
      <div className="mpm__cta-bar">
        <button className="mpm__cta" onClick={handleSubmit} disabled={submitting || uploading}>
          ENVIAR MI FOTO
        </button>
      </div>

      {/* Back arrow (top-left) */}
      <button className="mpm__back" onClick={onClose} aria-label="Volver">←</button>

      {/* Close button (top-right) */}
      <button className="mpm__close" onClick={onClose} aria-label="Cerrar">×</button>
    </div>
  )
}
