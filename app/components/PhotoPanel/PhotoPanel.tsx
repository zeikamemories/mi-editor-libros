'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { CirclePlus, ListFilter, Check, Trash2 } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import './PhotoPanel.css'

export type Photo = {
  id:     string
  src:    string   // Cloudinary URL
  name:   string
  width:  number
  height: number
}

interface PhotoPanelProps {
  photos:        Photo[]
  usedPhotoIds:  Set<string>
  onUpload:      (photos: Photo[]) => void
  onPhotoClick:  (photo: Photo) => void
  onDelete:      (photoId: string) => void
  onAutoCreate?: () => Promise<void>
}

type SortBy = 'fecha' | 'nombre'

// Compress + resize a File before upload.
// Scales down to MAX_PX on the longest side and re-encodes as JPEG.
// Files already small enough are returned unchanged.
const MAX_PX      = 3000
const JPEG_QUALITY = 0.88

async function compressImage(file: File): Promise<File> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const { width: w, height: h } = img
      const scale = Math.min(1, MAX_PX / Math.max(w, h))
      const outW = Math.round(w * scale)
      const outH = Math.round(h * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = outW
      canvas.height = outH
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, outW, outH)

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
    img.src = url
  })
}

export default function PhotoPanel({
  photos,
  usedPhotoIds,
  onUpload,
  onPhotoClick,
  onDelete,
  onAutoCreate,
}: PhotoPanelProps) {
  const { t } = useLang()
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const filterWrapRef = useRef<HTMLDivElement>(null)

  const [filterOpen,    setFilterOpen]    = useState(false)
  const [sortBy,        setSortBy]        = useState<SortBy>('fecha')
  const [showUnused,    setShowUnused]    = useState(false)
  const [uploadingIds,  setUploadingIds]  = useState<Set<string>>(new Set())
  const [autoCreating,  setAutoCreating]  = useState(false)

  // ── Close filter panel on outside click ──────────────────────────────────

  useEffect(() => {
    if (!filterOpen) return
    const handleClick = (e: MouseEvent) => {
      if (filterWrapRef.current && !filterWrapRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterOpen])

  // ── File upload ───────────────────────────────────────────────────────────

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const SUPPORTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'])
      const files = Array.from(e.target.files ?? []).filter(
        (f) => f.type === '' || SUPPORTED.has(f.type),
      )
      if (files.length === 0) return
      e.target.value = ''

      // Create placeholder IDs so we can show spinners immediately
      const placeholders = files.map((file) => ({
        tempId: crypto.randomUUID(),
        file,
      }))

      setUploadingIds((prev) => {
        const next = new Set(prev)
        placeholders.forEach(({ tempId }) => next.add(tempId))
        return next
      })

      const results = await Promise.allSettled(
        placeholders.map(async ({ tempId, file }) => {
          const compressed = await compressImage(file)
          const form = new FormData()
          form.append('file', compressed)

          const res  = await fetch('/api/upload', { method: 'POST', body: form })
          const data = await res.json() as {
            url?:     string
            publicId?: string
            width?:   number
            height?:  number
            error?:   string
          }

          setUploadingIds((prev) => {
            const next = new Set(prev)
            next.delete(tempId)
            return next
          })

          if (!res.ok || !data.url) {
            throw new Error(data.error ?? `Error subiendo ${file.name}`)
          }

          return {
            id:     tempId,
            src:    data.url,
            name:   file.name,
            width:  data.width  ?? 0,
            height: data.height ?? 0,
          } satisfies Photo
        }),
      )

      const uploaded: Photo[] = []
      for (const r of results) {
        if (r.status === 'fulfilled') {
          uploaded.push(r.value)
        } else {
          // skip silently — full error already logged on the server
        }
      }

      if (uploaded.length > 0) onUpload(uploaded)
    },
    [onUpload],
  )

  const openFilePicker = () => fileInputRef.current?.click()

  // ── Drag start ────────────────────────────────────────────────────────────

  const handleDragStart = useCallback(
    (e: React.DragEvent<HTMLDivElement>, photo: Photo) => {
      e.dataTransfer.setData('text/plain', photo.src)
      e.dataTransfer.setData('application/zeika-photo-id', photo.id)
      e.dataTransfer.effectAllowed = 'copy'
    },
    [],
  )

  // ── Filtered + sorted photo list ──────────────────────────────────────────

  const visiblePhotos = photos
    .filter((p) => !showUnused || !usedPhotoIds.has(p.id))
    .sort((a, b) =>
      sortBy === 'nombre' ? a.name.localeCompare(b.name) : 0,
    )

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <aside className="photo-panel">
      {/* ── Acciones superiores ── */}
      <div className="photo-panel-actions">
        <button className="photo-action-btn" onClick={openFilePicker}>
          <CirclePlus size={24} strokeWidth={1.5} />
          <span>{t.uploadPhoto}</span>
        </button>

        {/* No usadas toggle */}
        <button
          className="photo-toggle-wrap"
          onClick={() => setShowUnused((v) => !v)}
          aria-pressed={showUnused}
        >
          <div className={`photo-toggle-pill${showUnused ? ' photo-toggle-pill--on' : ''}`} />
          <span className="photo-toggle-label">{t.noUsadas}</span>
        </button>

        {/* Filter button + dropdown */}
        <div className="photo-filter-wrap" ref={filterWrapRef}>
          <button
            className={`photo-action-btn${filterOpen ? ' photo-action-btn--active' : ''}`}
            onClick={() => setFilterOpen((v) => !v)}
          >
            <ListFilter size={24} strokeWidth={1.5} />
            <span>{t.orderFilter}</span>
          </button>

          {filterOpen && (
            <div className="photo-filter-panel">
              <p className="photo-filter-heading">{t.sortBy}</p>
              <div className="photo-filter-underline" />
              <button
                className={`photo-filter-option${sortBy === 'fecha' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setSortBy('fecha')}
              >
                {t.dateAdded}
              </button>
              <button
                className={`photo-filter-option${sortBy === 'nombre' ? ' photo-filter-option--active' : ''}`}
                onClick={() => setSortBy('nombre')}
              >
                {t.name}
              </button>

            </div>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
        multiple
        className="photo-file-input"
        onChange={handleFileChange}
      />

      {/* ── Contador ── */}
      <div className="photo-panel-counter">
        {photos.length} {t.photos.toLowerCase()}
      </div>

      {/* ── Separator bar ── */}
      <div className="photo-panel-bar" />

      {/* ── Grid de fotos ── */}
      <div className="photo-grid">
        {/* Uploading placeholders */}
        {Array.from(uploadingIds).map((id) => (
          <div key={id} className="photo-thumb photo-thumb--uploading">
            <div className="photo-thumb-spinner" />
          </div>
        ))}

        {visiblePhotos.map((photo) => {
          const isUsed = usedPhotoIds.has(photo.id)
          return (
            <div
              key={photo.id}
              className="photo-thumb"
              draggable
              onDragStart={(e) => handleDragStart(e, photo)}
              onClick={() => onPhotoClick(photo)}
              title={photo.name}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photo.src} alt={photo.name} className="photo-thumb-img" />

              {isUsed && (
                <div className="photo-thumb-used" aria-label={t.usedPhoto}>
                  <Check size={10} strokeWidth={3} color="#fff" />
                </div>
              )}

              <button
                className="photo-thumb-delete"
                aria-label={t.deletePhoto}
                onClick={(e) => { e.stopPropagation(); onDelete(photo.id) }}
              >
                <Trash2 size={11} strokeWidth={1.8} />
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Auto-crear ── */}
      {onAutoCreate && (
        <div className="photo-panel-autocreate-row">
          <button
            className="photo-autocreate-btn"
            disabled={autoCreating || photos.length === 0}
            onClick={async () => {
              setAutoCreating(true)
              try { await onAutoCreate() } finally { setAutoCreating(false) }
            }}
          >
            {autoCreating ? t.generating : t.autoCreate}
          </button>
        </div>
      )}
    </aside>
  )
}
