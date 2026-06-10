'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import './nuevo.css'

// ── Types ────────────────────────────────────────────────────────────────────

type Photo = {
  id:     string
  src:    string
  name:   string
  width:  number
  height: number
}

interface BookSize {
  id:    string
  nombre: string
  dims:   string
  price:  string
  img:    string
}

interface BookDetails {
  nombre:    string
  disenadora: string
  tapa:       string
  acabado:    string
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BOOK_SIZES: BookSize[] = [
  { id: 'chico',    nombre: 'CHICO HORIZONTAL',  dims: '21 x 14,8 CM', price: '$75.500',  img: '/chico.png'    },
  { id: 'mediano',  nombre: 'MEDIANO HORIZONTAL', dims: '28 x 21,6 CM', price: '$81.500',  img: '/mediano.png'  },
  { id: 'grande',   nombre: 'GRANDE HORIZONTAL',  dims: '41 x 29 CM',   price: '$100.000', img: '/grande.png'   },
  { id: 'vertical', nombre: 'VERTICAL',           dims: '21,6 x 28 CM', price: '$81.500',  img: '/vertical.png' },
  { id: 'cuadrado', nombre: 'CUADRADO',           dims: '29 x 29 CM',   price: '$97.000',  img: '/cuadrado.png' },
]

// ── Upload helper (mirrors PhotoPanel logic) ──────────────────────────────────

async function uploadFile(file: File): Promise<Photo> {
  const form = new FormData()
  form.append('file', file)
  const res  = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json() as { url?: string; width?: number; height?: number; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
  return { id: crypto.randomUUID(), src: data.url, name: file.name, width: data.width ?? 0, height: data.height ?? 0 }
}

// ── Shared Topbar ─────────────────────────────────────────────────────────────

function NuevoTopbar() {
  return (
    <header className="nuevo-topbar">
      <Image src="/LogoZeika.png" alt="Zeika" width={36} height={36} />
      <span className="nuevo-topbar-spacer" />
      <span className="nuevo-topbar-username">MAIKA</span>
      <div className="nuevo-avatar">M</div>
    </header>
  )
}

// ── Shared Footer ─────────────────────────────────────────────────────────────

interface FooterProps {
  onCancel:     () => void
  onNext:       () => void
  nextDisabled: boolean
  nextLabel?:   string
}

function NuevoFooter({ onCancel, onNext, nextDisabled, nextLabel = 'SIGUIENTE' }: FooterProps) {
  return (
    <footer className="nuevo-footer">
      <button className="nuevo-btn nuevo-btn--secondary" onClick={onCancel}>ATRÁS</button>
      <button className="nuevo-btn nuevo-btn--primary" onClick={onNext} disabled={nextDisabled}>
        {nextLabel}
      </button>
    </footer>
  )
}

// ── Step 1 ────────────────────────────────────────────────────────────────────

function Step1({ selected, onSelect }: { selected: string | null; onSelect: (id: string) => void }) {
  return (
    <div className="nuevo-body">
      <h1 className="nuevo-step-title">1. ELEGÍ TU TAMAÑO</h1>
      <div className="nuevo-size-cards">
        {BOOK_SIZES.map((book) => (
          <button
            key={book.id}
            className={`nuevo-size-card${selected === book.id ? ' nuevo-size-card--selected' : ''}`}
            onClick={() => onSelect(book.id)}
          >
            <div className="nuevo-size-card-img-wrap">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={book.img} alt={book.nombre} className={`nuevo-size-card-img${book.id === 'vertical' ? ' nuevo-size-card-img--vertical' : ''}`} />
            </div>
            <div className="nuevo-size-card-info">
              <div className="nuevo-size-card-name-row">
                <span className="nuevo-size-card-name">{book.nombre}</span>
                <span className="nuevo-size-card-dims">{book.dims}</span>
              </div>
              <div className="nuevo-size-card-divider" />
              <span className="nuevo-size-card-price">{book.price}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Designer dropdown ────────────────────────────────────────────────────────

const DESIGNER_COLORS: Record<string, { bg: string; border: string; color: string; dot: string }> = {
  Maika: { bg: '#d4f0ed', border: '#109e90', color: '#006057', dot: '#109e90' },
  Vicky: { bg: '#f0d6fa', border: '#a719d3', color: '#6b0099', dot: '#a719d3' },
  Jose:  { bg: '#fde8db', border: '#f97944', color: '#7a2d0e', dot: '#f97944' },
}

function DesignerSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const c = DESIGNER_COLORS[value]

  return (
    <div className="nuevo-designer-wrap" ref={ref}>
      <button
        type="button"
        className="nuevo-designer-trigger"
        style={{ background: c.bg, border: `1px solid ${c.border}`, color: c.color }}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="nuevo-designer-dot" style={{ background: c.dot }} />
        {value}
        <span className="nuevo-designer-arrow">▾</span>
      </button>
      {open && (
        <div className="nuevo-designer-menu">
          {Object.entries(DESIGNER_COLORS).map(([name, s]) => (
            <button
              key={name}
              type="button"
              className={`nuevo-designer-option${value === name ? ' nuevo-designer-option--active' : ''}`}
              style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.color }}
              onClick={() => { onChange(name); setOpen(false) }}
            >
              <span className="nuevo-designer-dot" style={{ background: s.dot }} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Step 2 ────────────────────────────────────────────────────────────────────

interface Step2Props {
  selectedBook: BookSize | null
  details:      BookDetails
  onChange:     (k: keyof BookDetails, v: string) => void
}

function Step2({ selectedBook, details, onChange }: Step2Props) {
  return (
    <div className="nuevo-body">
      <h1 className="nuevo-step-title">2. DETALLES DEL PEDIDO</h1>
      <div className="nuevo-details-layout">
        {/* Form */}
        <div className="nuevo-form">
          <div className="nuevo-field">
            <label className="nuevo-label">NOMBRE</label>
            <input
              className="nuevo-input"
              type="text"
              value={details.nombre}
              onChange={(e) => onChange('nombre', e.target.value)}
              placeholder=""
            />
          </div>
          <div className="nuevo-field">
            <label className="nuevo-label">DISEÑADORA</label>
            <DesignerSelect value={details.disenadora} onChange={(v) => onChange('disenadora', v)} />
          </div>
        </div>

        {/* Preview — same structure as Step 1 cards */}
        <div className="nuevo-preview-wrap">
          {selectedBook && (
            <div className="nuevo-preview-card">
              <div className="nuevo-size-card-img-wrap">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedBook.img}
                  alt={selectedBook.nombre}
                  className={`nuevo-size-card-img${selectedBook.id === 'vertical' ? ' nuevo-size-card-img--vertical' : ''}`}
                />
              </div>
              <div className="nuevo-size-card-info">
                <div className="nuevo-size-card-name-row">
                  <span className="nuevo-size-card-name">{selectedBook.nombre}</span>
                  <span className="nuevo-size-card-dims">{selectedBook.dims}</span>
                </div>
                <div className="nuevo-size-card-divider" />
                <span className="nuevo-size-card-price">{selectedBook.price}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Step 3 ────────────────────────────────────────────────────────────────────

interface Step3Props {
  photos:         Photo[]
  uploadingCount: number
  onUpload:       (files: FileList) => void
  onDelete:       (id: string) => void
}

function Step3({ photos, uploadingCount, onUpload, onDelete }: Step3Props) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const moreRef     = useRef<HTMLInputElement>(null)
  const ACCEPTED    = 'image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif'

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) onUpload(e.target.files)
    e.target.value = ''
  }

  return (
    <div className="nuevo-body nuevo-body--photos">
      <div className="nuevo-step-title-row">
        <h1 className="nuevo-step-title">3. CARGÁ TUS FOTOS</h1>
        {photos.length > 0 && (
          <button className="nuevo-cargar-mas" onClick={() => moreRef.current?.click()}>
            <Monitor size={18} strokeWidth={1.5} />
            Cargar más
          </button>
        )}
      </div>

      {photos.length === 0 && uploadingCount === 0 ? (
        <div className="nuevo-upload-empty">
          <Monitor size={52} strokeWidth={1} color="#aaa" />
          <p className="nuevo-upload-empty-text">Subir fotos desde la computadora</p>
          <button className="nuevo-upload-btn" onClick={() => inputRef.current?.click()}>
            SUBIR FOTOS
          </button>
        </div>
      ) : (
        <>
          <div className="nuevo-photo-area">
            <div className="nuevo-photo-grid">
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div key={`skeleton-${i}`} className="nuevo-photo-skeleton" />
              ))}
              {photos.map((p) => (
                <div key={p.id} className="nuevo-photo-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.src} alt={p.name} className="nuevo-photo-thumb-img" />
                  <button className="nuevo-photo-delete" onClick={() => onDelete(p.id)} aria-label="Eliminar">✕</button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <input ref={inputRef} type="file" accept={ACCEPTED} multiple className="nuevo-file-input" onChange={handleChange} />
      <input ref={moreRef}  type="file" accept={ACCEPTED} multiple className="nuevo-file-input" onChange={handleChange} />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

function NuevoContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()

  const [step,         setStep]         = useState(1)
  const [selectedSize, setSelectedSize] = useState<string | null>(
    searchParams.get('size') ?? null
  )
  const [details,      setDetails]      = useState<BookDetails>({
    nombre:     searchParams.get('name') ?? '',
    disenadora: 'Maika',
    tapa:       'Tapa Dura',
    acabado:    'Laminado Mate',
  })
  const [photos,         setPhotos]         = useState<Photo[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [creating,       setCreating]       = useState(false)

  const selectedBook = BOOK_SIZES.find((b) => b.id === selectedSize) ?? null

  const handleDetailChange = (k: keyof BookDetails, v: string) => setDetails((d) => ({ ...d, [k]: v }))

  const handleUpload = useCallback(async (files: FileList) => {
    const arr = Array.from(files)
    setUploadingCount(arr.length)
    const results = await Promise.allSettled(arr.map(async (file, i) => {
      const photo = await uploadFile(file)
      setUploadingCount((c) => Math.max(0, c - 1))
      return photo
    }))
    const uploaded: Photo[] = []
    for (const r of results) {
      if (r.status === 'fulfilled') uploaded.push(r.value)
    }
    setPhotos((prev) => [...prev, ...uploaded])
    setUploadingCount(0)
  }, [])

  const handleDeletePhoto = (id: string) => setPhotos((prev) => prev.filter((p) => p.id !== id))

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1)
      return
    }
    setCreating(true)
    sessionStorage.setItem('zeika_book_size', selectedSize ?? 'vertical')
    sessionStorage.setItem('zeika_photos', JSON.stringify(photos))
    sessionStorage.removeItem('zeika_project_id')
    const linkedOrderId = searchParams.get('orderId') ?? null
    try {
      let projectId: string | null = null

      // If linked to an order, check if a project already exists for it
      if (linkedOrderId) {
        const { data: existing } = await supabase
          .from('projects').select('id').eq('order_id', linkedOrderId).maybeSingle()
        if (existing?.id) {
          // Update the existing project with new photos/details instead of creating a duplicate
          await supabase.from('projects').update({
            name:      details.nombre || 'Sin título',
            photos,
            book_size: selectedSize ?? 'vertical',
          }).eq('id', existing.id)
          projectId = existing.id
        }
      }

      if (!projectId) {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            name:          details.nombre || 'Sin título',
            photos,
            spreads:       {},
            book_size:     selectedSize ?? 'vertical',
            total_spreads: 13,
            ...(linkedOrderId ? { order_id: linkedOrderId } : {}),
          })
          .select('id')
          .single()
        if (error) {
          console.error('Supabase project insert error:', error.message, error.code)
        } else if (data) {
          projectId = data.id
        }
      }

      if (projectId) {
        sessionStorage.setItem('zeika_project_id', projectId)
        sessionStorage.setItem(
          'zeika_return_path',
          linkedOrderId ? `/dashboard/pedidos/${linkedOrderId}` : '/dashboard'
        )
      }
    } catch (err) {
      console.error('Error guardando proyecto:', err)
    }
    const newProjectId = sessionStorage.getItem('zeika_project_id')
    router.push(newProjectId ? `/editor?pid=${newProjectId}` : '/editor')
  }

  const handleCancel = () => {
    if (step > 1) setStep(step - 1)
    else router.push('/dashboard')
  }

  const nextDisabled =
    creating ||
    (step === 1 && !selectedSize)

  const nextLabel = creating ? 'ABRIENDO...' : step === 3 ? 'ABRIR EDITOR' : 'SIGUIENTE'

  return (
    <div className="nuevo-root">
      <NuevoTopbar />

      {step === 1 && (
        <Step1 selected={selectedSize} onSelect={setSelectedSize} />
      )}
      {step === 2 && (
        <Step2 selectedBook={selectedBook} details={details} onChange={handleDetailChange} />
      )}
      {step === 3 && (
        <Step3 photos={photos} uploadingCount={uploadingCount} onUpload={handleUpload} onDelete={handleDeletePhoto} />
      )}

      <NuevoFooter
        onCancel={handleCancel}
        onNext={handleNext}
        nextDisabled={nextDisabled}
        nextLabel={nextLabel}
      />
    </div>
  )
}

export default function NuevoPage() {
  return <Suspense><NuevoContent /></Suspense>
}
