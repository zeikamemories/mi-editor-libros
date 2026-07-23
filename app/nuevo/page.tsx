'use client'

import { useState, useRef, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Monitor } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { compressImage } from '../lib/imageCompress'
import { mapWithConcurrency } from '../lib/concurrency'
import { PRICES_BY_PAGES } from '../config/pricing'
import Navbar from '../components/Landing/Navbar/Navbar'
import './nuevo.css'

function fmtPrice(n: number) {
  return '$' + n.toLocaleString('es-AR')
}

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
  img:    string
}

interface BookDetails {
  nombre:    string
  disenadora: string
  paginas:    string
  tapa:       string
  acabado:    string
}

// ── Data ─────────────────────────────────────────────────────────────────────

const BOOK_SIZES: BookSize[] = [
  { id: 'chico',    nombre: 'CHICO HORIZONTAL',  dims: '21 x 14,8 CM', img: '/fotos/chico-mobile.jpg'    },
  { id: 'mediano',  nombre: 'MEDIANO HORIZONTAL', dims: '28 x 21,6 CM', img: '/fotos/mediano-mobile.jpg'  },
  { id: 'grande',   nombre: 'GRANDE HORIZONTAL',  dims: '41 x 29 CM',   img: '/fotos/grande-mobile.jpg'   },
  { id: 'vertical', nombre: 'VERTICAL',           dims: '21,6 x 28 CM', img: '/fotos/vertical-mobile.jpg' },
  { id: 'cuadrado', nombre: 'CUADRADO',           dims: '29 x 29 CM',   img: '/fotos/cuadrado-mobile.jpg' },
]

// ── Upload helper (mirrors PhotoPanel logic) ──────────────────────────────────

async function uploadFile(file: File): Promise<Photo> {
  const compressed = await compressImage(file)
  const form = new FormData()
  form.append('file', compressed)
  const res  = await fetch('/api/upload', { method: 'POST', body: form })
  const data = await res.json() as { url?: string; width?: number; height?: number; error?: string }
  if (!res.ok || !data.url) throw new Error(data.error ?? 'Upload failed')
  return { id: crypto.randomUUID(), src: data.url, name: file.name, width: data.width ?? 0, height: data.height ?? 0 }
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
              <img src={book.img} alt={book.nombre} className="nuevo-size-card-img" />
            </div>
            <div className="nuevo-size-card-info">
              <div className="nuevo-size-card-name-row">
                <span className="nuevo-size-card-name">{book.nombre}</span>
                <span className="nuevo-size-card-dims">{book.dims}</span>
              </div>
              <div className="nuevo-size-card-divider" />
              <span className="nuevo-size-card-price">{fmtPrice(PRICES_BY_PAGES[book.id][0])}</span>
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

const PAGE_OPTIONS: Record<string, string[]> = {
  chico: ['20', '32', '40'],
}
const DEFAULT_PAGE_OPTIONS = ['20', '30', '40']

function Step2({ selectedBook, details, onChange }: Step2Props) {
  const pageOptions = (selectedBook && PAGE_OPTIONS[selectedBook.id]) ?? DEFAULT_PAGE_OPTIONS
  const pageIdx      = Math.max(0, pageOptions.indexOf(details.paginas))
  const selectedPrice = selectedBook ? PRICES_BY_PAGES[selectedBook.id][pageIdx] : 0
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
          <div className="nuevo-field">
            <label className="nuevo-label">HOJAS</label>
            <select
              className="nuevo-select"
              value={details.paginas}
              onChange={(e) => onChange('paginas', e.target.value)}
            >
              {pageOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
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
                  className="nuevo-size-card-img"
                />
              </div>
              <div className="nuevo-size-card-info">
                <div className="nuevo-size-card-name-row">
                  <span className="nuevo-size-card-name">{selectedBook.nombre}</span>
                  <span className="nuevo-size-card-dims">{selectedBook.dims}</span>
                </div>
                <div className="nuevo-size-card-divider" />
                <span className="nuevo-size-card-price">{fmtPrice(selectedPrice)}</span>
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

  const [adminUserId,  setAdminUserId]  = useState<string | null>(null)
  const SIZE_MAP: Record<string, string> = {
    chico_h: 'chico', mediano_h: 'mediano', grande_h: 'grande',
    vertical: 'vertical', cuadrado: 'cuadrado',
  }
  const rawSize = searchParams.get('size') ?? null
  const [selectedSize, setSelectedSize] = useState<string | null>(
    rawSize ? (SIZE_MAP[rawSize] ?? rawSize) : null
  )
  const [step, setStep] = useState(rawSize ? 2 : 1)
  const [details,      setDetails]      = useState<BookDetails>({
    nombre:     searchParams.get('name') ?? '',
    disenadora: 'Maika',
    paginas:    '20',
    tapa:       'Tapa Dura',
    acabado:    'Laminado Mate',
  })
  const [photos,         setPhotos]         = useState<Photo[]>([])
  const [uploadingCount, setUploadingCount] = useState(0)
  const [creating,       setCreating]       = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setAdminUserId(session.user.id)
    })
  }, [])

  const selectedBook = BOOK_SIZES.find((b) => b.id === selectedSize) ?? null

  const handleDetailChange = (k: keyof BookDetails, v: string) => setDetails((d) => ({ ...d, [k]: v }))

  useEffect(() => {
    if (!selectedSize) return
    const opts = PAGE_OPTIONS[selectedSize] ?? DEFAULT_PAGE_OPTIONS
    setDetails((d) => ({ ...d, paginas: opts.includes(d.paginas) ? d.paginas : opts[0] }))
  }, [selectedSize])

  const handleUpload = useCallback(async (files: FileList) => {
    const arr = Array.from(files)
    setUploadingCount(arr.length)
    // A few at a time — converting many HEIC photos in parallel (each one a WASM
    // decode) can exhaust the browser's memory and make individual ones fail,
    // especially the heavier files (Live Photos, high-res shots).
    const results = await mapWithConcurrency(arr, 3, async (file) => {
      const photo = await uploadFile(file)
      setUploadingCount((c) => Math.max(0, c - 1))
      return photo
    })
    const uploaded: Photo[] = []
    const failed: string[] = []
    arr.forEach((file, i) => {
      const r = results[i]
      if (r.status === 'fulfilled') uploaded.push(r.value)
      else failed.push(file.name)
    })
    setPhotos((prev) => [...prev, ...uploaded])
    setUploadingCount(0)
    if (failed.length > 0) {
      alert(`No se pudieron subir ${failed.length} foto(s): ${failed.join(', ')}`)
    }
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
      let returnOrderId = linkedOrderId

      // If linked to an existing order, check for existing project
      if (linkedOrderId) {
        const { data: existing } = await supabase
          .from('projects').select('id').eq('order_id', linkedOrderId).maybeSingle()
        if (existing?.id) {
          await supabase.from('projects').update({
            name:          details.nombre || 'Sin título',
            photos,
            book_size:     selectedSize ?? 'vertical',
            total_spreads: (parseInt(details.paginas) || 20) - 1,
          }).eq('id', existing.id)
          projectId = existing.id
        }
      }

      // Admin creation (no client order) — create a stub order first so the
      // project gets a full /dashboard/pedidos page with drive, preview, tracking, etc.
      if (!linkedOrderId && adminUserId) {
        const SIZE_TO_DB: Record<string, string> = {
          chico: 'chico_h', mediano: 'mediano_h', grande: 'grande_h',
          vertical: 'vertical', cuadrado: 'cuadrado',
        }
        const { data: newOrder } = await supabase.from('orders').insert({
          user_id:     adminUserId,
          book_name:   details.nombre || 'Sin título',
          size:        SIZE_TO_DB[selectedSize ?? 'vertical'] ?? selectedSize,
          pages_base:  parseInt(details.paginas) || 20,
          extra_pages: 0,
          extra_text:  false,
          price_total: 0,
          price_paid:  0,
          status:      'en_diseno',
        }).select('id').single()
        if (newOrder?.id) returnOrderId = newOrder.id
      }

      if (!projectId) {
        const { data, error } = await supabase
          .from('projects')
          .insert({
            name:          details.nombre || 'Sin título',
            photos,
            spreads:       {},
            book_size:     selectedSize ?? 'vertical',
            total_spreads: (parseInt(details.paginas) || 20) - 1,
            ...(returnOrderId ? { order_id: returnOrderId } : {}),
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
          returnOrderId ? `/dashboard/pedidos/${returnOrderId}` : '/dashboard'
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
      <Navbar hideLinks hideMisProyectos />

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
