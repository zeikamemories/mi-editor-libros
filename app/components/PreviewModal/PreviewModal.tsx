'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MessageSquare, Pencil,
  ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { exportPageAsJpg } from '../Canvas/fabricHelpers'
import type { PageData } from '../Canvas/fabricHelpers'
import { useLang } from '../../context/LanguageContext'
import './PreviewModal.css'

type SpreadData = { left: PageData; right: PageData }

export interface Annotation {
  id: string
  type: 'comment' | 'drawing'
  page_number: number
  content: string
  created_at: string
}

interface Props {
  spreadsData:    Record<number, SpreadData>
  totalSpreads:   number
  initialSpread:  number
  pageW:          number
  pageH:          number
  onClose:        () => void
  onPageChange?:  (page: number) => void
  // Annotation props — optional, only used on preview/[projectId] page
  annotations?:    Annotation[]
  onCommentSave?:  (text: string, page: number) => Promise<Annotation | null>
  onDrawingSave?:  (dataUrl: string, page: number) => Promise<Annotation | null>
  // Change request — optional, shown when client views preview via orderId link
  onSaveChanges?:  () => Promise<void>
}

const TITLEBAR_H  = 50
const CONTROLS_H  = 64
const DRAW_COLORS = ['#e74c3c', '#2980b9', '#27ae60', '#f39c12', '#191919']

function renderNoEditPage(label: string, pageW: number, pageH: number): string {
  const canvas = document.createElement('canvas')
  canvas.width  = pageW
  canvas.height = pageH
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#e8e8e8'
  ctx.fillRect(0, 0, pageW, pageH)
  ctx.fillStyle = '#666666'
  ctx.font = `600 ${Math.round(pageH * 0.055)}px Arial, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(label, pageW / 2, pageH / 2)
  return canvas.toDataURL('image/jpeg', 1)
}

let _turnLoaded = false
const _turnQueue: Array<() => void> = []

function ensureTurnJs(cb: () => void) {
  if ((window as any).jQuery?.fn?.turn) { cb(); return }
  _turnQueue.push(cb)
  if (_turnLoaded) return
  _turnLoaded = true
  import('jquery').then(jq => {
    const $ = jq.default as any
    ;(window as any).jQuery = $
    ;(window as any).$ = $
    const script = document.createElement('script')
    script.src = '/js/turn.min.js'
    script.onload = () => {
      const pending = _turnQueue.splice(0)
      pending.forEach(fn => fn())
    }
    document.head.appendChild(script)
  })
}

export default function PreviewModal({
  spreadsData, totalSpreads, initialSpread, pageW, pageH, onClose, onPageChange,
  annotations: initialAnnotations, onCommentSave, onDrawingSave, onSaveChanges,
}: Props) {
  const EMPTY_PAGE: PageData = { background: '#ffffff', pageW, pageH, objects: [] }
  const { t } = useLang()
  const [scale,      setScale]      = useState(0.5)
  const [loading,    setLoading]    = useState(true)
  const [pageImages, setPageImages] = useState<string[]>([])
  const initialPage = initialSpread === 0 ? 1 : initialSpread * 2
  const [currentPage, setCurrentPage] = useState(initialPage)

  const flipbookEl = useRef<HTMLDivElement>(null)
  const $bookRef   = useRef<any>(null)
  const scaleRef   = useRef(scale)

  // ── Annotation state ───────────────────────────────────────────────────────
  const hasAnnotations                    = Boolean(onCommentSave)
  const [annotMode,     setAnnotMode]     = useState<'view' | 'comment' | 'draw'>('view')
  const [annotations,   setAnnotations]   = useState<Annotation[]>(initialAnnotations ?? [])
  const [commentText,   setCommentText]   = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [drawColor,     setDrawColor]     = useState(DRAW_COLORS[0])
  const [drawSize,      setDrawSize]      = useState(3)
  const isDrawingRef    = useRef(false)
  const [savingDrawing,  setSavingDrawing]  = useState(false)
  const [drawSaveError,  setDrawSaveError]  = useState<string | null>(null)
  const [strokeCount,    setStrokeCount]    = useState(0)
  const drawCanvasRef   = useRef<HTMLCanvasElement>(null)
  const lastDrawPos     = useRef<{ x: number; y: number } | null>(null)
  // Track strokes as vector data for SVG export (no image conversion needed)
  const strokesRef = useRef<Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }>>([])
  const currentStrokeRef = useRef<{ color: string; size: number; points: Array<{ x: number; y: number }> } | null>(null)

  useEffect(() => {
    if (initialAnnotations) setAnnotations(initialAnnotations)
  }, [initialAnnotations])

  // Reset stroke counter and errors when entering/leaving draw mode
  useEffect(() => {
    setStrokeCount(0)
    setDrawSaveError(null)
  }, [annotMode])

  // Clear drawing canvas + strokes when page changes
  useEffect(() => {
    const c = drawCanvasRef.current
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    strokesRef.current = []
    currentStrokeRef.current = null
  }, [currentPage])

  // ── Scale ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const compute = () => {
      const maxH = Math.min(
        window.innerHeight * 0.72,
        window.innerHeight - TITLEBAR_H - CONTROLS_H - 32,
      )
      const maxW = window.innerWidth * 0.78
      const s = Math.min(maxH / pageH, maxW / (pageW * 2))
      setScale(Math.max(s, 0.15))
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  useEffect(() => { scaleRef.current = scale }, [scale])

  useEffect(() => {
    if (!$bookRef.current) return
    try {
      $bookRef.current.turn('size',
        Math.round(pageW * scale) * 2,
        Math.round(pageH * scale),
      )
    } catch {}
  }, [scale])

  // ── Pre-render pages ───────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const tasks: Promise<string>[] = []
    const s0 = spreadsData[0]
    tasks.push(exportPageAsJpg(s0?.right ?? EMPTY_PAGE, pageW, pageH, 1,
      s0?.left  ? { data: s0.left,  fromSide: 'left'  } : undefined))
    for (let s = 1; s < totalSpreads; s++) {
      const data      = spreadsData[s]
      const left      = data?.left  ?? EMPTY_PAGE
      const right     = data?.right ?? EMPTY_PAGE
      const isInside  = s === 1
      const isOutside = s === totalSpreads - 1
      tasks.push(isInside
        ? Promise.resolve(renderNoEditPage(t.noEditable, pageW, pageH))
        : exportPageAsJpg(left,  pageW, pageH, 1, { data: right, fromSide: 'right' }))
      tasks.push(isOutside
        ? Promise.resolve(renderNoEditPage(t.noEditable, pageW, pageH))
        : exportPageAsJpg(right, pageW, pageH, 1, { data: left,  fromSide: 'left'  }))
    }
    tasks.push(exportPageAsJpg(s0?.left ?? EMPTY_PAGE, pageW, pageH, 1,
      s0?.right ? { data: s0.right, fromSide: 'right' } : undefined))

    Promise.all(tasks).then(images => {
      if (!cancelled) { setPageImages(images); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [spreadsData, totalSpreads])

  // ── Init turn.js ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (loading || pageImages.length === 0 || !flipbookEl.current) return

    const el = flipbookEl.current
    const s  = scaleRef.current
    const w  = Math.round(pageW * s)
    const h  = Math.round(pageH * s)

    el.innerHTML = ''
    pageImages.forEach((src, i) => {
      const page = document.createElement('div')
      page.className = 'preview-flip-page'
      const img = document.createElement('img')
      img.src = src
      img.alt = `${t.page} ${i + 1}`
      img.draggable = false
      page.appendChild(img)
      el.appendChild(page)
    })

    ensureTurnJs(() => {
      const $ = (window as any).jQuery
      if (!$?.fn?.turn || !flipbookEl.current) return

      const $book = $(flipbookEl.current)
      $book.turn({
        width:        w * 2,
        height:       h,
        autoCenter:   true,
        gradients:    true,
        acceleration: true,
        elevation:    50,
        duration:     800,
        page:         initialPage,
      })

      $book.bind('turning', (_e: any, page: number) => {
        setCurrentPage(page)
        onPageChange?.(page)
      })
      $book.bind('turned', (_e: any, page: number) => {
        setCurrentPage(page)
      })

      $bookRef.current = $book
    })

    return () => {
      if ($bookRef.current) {
        try { $bookRef.current.turn('destroy') } catch {}
        $bookRef.current = null
      }
      el.innerHTML = ''
    }
  }, [loading, pageImages, initialSpread])

  // ── Navigation ─────────────────────────────────────────────────────────────
  const go = useCallback((delta: number) => {
    if (!$bookRef.current) return
    if (delta > 0) $bookRef.current.turn('next')
    else           $bookRef.current.turn('previous')
  }, [])

  const goFirst = useCallback(() => {
    $bookRef.current?.turn('page', 1)
  }, [])

  const goLast = useCallback(() => {
    $bookRef.current?.turn('page', totalSpreads * 2)
  }, [totalSpreads])

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape')     { onClose(); return }
      if (e.key === 'ArrowLeft')  go(-1)
      if (e.key === 'ArrowRight') go(1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [go, onClose])

  // ── Mouse wheel ────────────────────────────────────────────────────────────
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (annotMode === 'draw') return // don't navigate while drawing
      e.preventDefault()
      if (e.deltaY > 0) go(1)
      else if (e.deltaY < 0) go(-1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [go, annotMode])

  // ── Drawing handlers ───────────────────────────────────────────────────────
  function getDrawPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = drawCanvasRef.current!
    const rect   = canvas.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function onDrawStart(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = getDrawPos(e)
    lastDrawPos.current  = pos
    isDrawingRef.current = true
    // Start tracking this stroke as vector data
    currentStrokeRef.current = { color: drawColor, size: drawSize, points: [pos] }
    setStrokeCount(n => n + 1)
    const ctx = drawCanvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, drawSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = drawColor
    ctx.fill()
  }

  function onDrawMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current || !lastDrawPos.current) return
    const pos = getDrawPos(e)
    currentStrokeRef.current?.points.push(pos)
    const ctx = drawCanvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(lastDrawPos.current.x, lastDrawPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth   = drawSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastDrawPos.current = pos
  }

  function onDrawEnd() {
    isDrawingRef.current = false
    lastDrawPos.current  = null
    if (currentStrokeRef.current && currentStrokeRef.current.points.length > 0) {
      strokesRef.current.push(currentStrokeRef.current)
      currentStrokeRef.current = null
    }
  }

  function clearDrawCanvas() {
    const c = drawCanvasRef.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    strokesRef.current       = []
    currentStrokeRef.current = null
    setStrokeCount(0)
  }

  async function handleSaveComment() {
    if (!commentText.trim() || !onCommentSave) return
    setSavingComment(true)
    const ann = await onCommentSave(commentText.trim(), currentPage)
    if (ann) {
      setAnnotations(prev => [...prev, ann])
      setCommentText('')
      setAnnotMode('view')
    }
    setSavingComment(false)
  }

  async function handleSaveDrawing() {
    if (!drawCanvasRef.current || !onDrawingSave || strokesRef.current.length === 0) return
    setDrawSaveError(null)
    setSavingDrawing(true)
    try {
      // Build SVG from vector strokes — transparent background, no Cloudinary needed
      const w = drawCanvasRef.current.width
      const h = drawCanvasRef.current.height
      const paths = strokesRef.current.map(s => {
        if (s.points.length === 0) return ''
        const pts = s.points
        const d = pts.length === 1
          ? `M${pts[0].x},${pts[0].y} l0.1,0.1`
          : `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ')
        return `<path d="${d}" stroke="${s.color}" stroke-width="${s.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
      }).join('')
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${paths}</svg>`

      const ann = await onDrawingSave(svg, currentPage)
      if (ann) {
        setAnnotations(prev => [...prev, ann])
        clearDrawCanvas()
        setAnnotMode('view')
      } else {
        setDrawSaveError('No se pudo guardar. Revisá tu conexión.')
      }
    } catch (err: any) {
      setDrawSaveError('Error: ' + (err?.message ?? 'desconocido'))
    }
    setSavingDrawing(false)
  }

  const pageComments  = annotations.filter(a => a.page_number === currentPage && a.type === 'comment')
  const pageDrawings  = annotations.filter(a => a.page_number === currentPage && a.type === 'drawing')

  // ── Sizes ──────────────────────────────────────────────────────────────────
  const canvasW = Math.round(pageW * scale)
  const canvasH = Math.round(pageH * scale)
  const isFirst = currentPage <= 1
  const isLast  = currentPage >= totalSpreads * 2

  const pageLabel = (() => {
    if (currentPage <= 1)                return t.cover
    if (currentPage >= totalSpreads * 2) return t.back
    const spreadNum = Math.floor((currentPage - 1) / 2)
    return `${t.page} ${spreadNum * 2 + 1} — ${spreadNum * 2 + 2}`
  })()

  return (
    <div className="preview-overlay">

      {/* ── Title bar ── */}
      <div className="preview-titlebar">
        <span className="preview-title">{t.preview2D}</span>
        <div className="preview-titlebar-actions">
          <button
            className={`preview-icon-btn${annotMode === 'comment' ? ' preview-icon-btn--active' : ''}`}
            disabled={!hasAnnotations}
            onClick={() => setAnnotMode(m => m === 'comment' ? 'view' : 'comment')}
          >
            <MessageSquare size={18} strokeWidth={1.5} />
            <span>{t.comment}</span>
          </button>
          <button
            className={`preview-icon-btn${annotMode === 'draw' ? ' preview-icon-btn--active' : ''}`}
            disabled={!hasAnnotations}
            onClick={() => setAnnotMode(m => m === 'draw' ? 'view' : 'draw')}
          >
            <Pencil size={18} strokeWidth={1.5} />
            <span>{t.draw}</span>
          </button>
        </div>
      </div>

      {/* ── Stage ── */}
      <div className="preview-stage">
        {loading ? (
          <div className="preview-render-loading">{t.preparingPreview}</div>
        ) : (
          <div
            className="preview-book-shell"
            style={{ width: canvasW * 2, height: canvasH }}
          >
            <div ref={flipbookEl} className="preview-flipbook" />

            {/* Saved drawing overlays — SVG vector (transparent) over the book pages */}
            {pageDrawings.map(d => {
              const isSvg = d.content.trimStart().startsWith('<svg')
              if (isSvg) {
                const encoded = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(d.content)
                return (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={d.id} src={encoded} alt="" className="preview-drawing-overlay" />
                )
              }
              // Legacy: Cloudinary image URL — use multiply to approximate transparency
              return (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={d.id} src={d.content} alt="" className="preview-drawing-overlay preview-drawing-overlay--legacy" />
              )
            })}

            {/* Drawing canvas — only in draw mode */}
            {annotMode === 'draw' && (
              <canvas
                ref={drawCanvasRef}
                className="preview-draw-canvas"
                width={canvasW * 2}
                height={canvasH}
                onPointerDown={onDrawStart}
                onPointerMove={onDrawMove}
                onPointerUp={onDrawEnd}
                onPointerCancel={onDrawEnd}
              />
            )}
          </div>
        )}
      </div>

      {/* ── Annotation sidebar — comment or draw mode ── */}
      {hasAnnotations && annotMode !== 'view' && (
        <div className="preview-annot-sidebar">
          {annotMode === 'comment' && (
            <>
              <div className="preview-annot-section">
                <span className="preview-annot-label">Comentario — {pageLabel}</span>
                <textarea
                  className="preview-comment-input"
                  placeholder="Escribí tu comentario sobre esta página..."
                  value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  autoFocus
                />
                <button
                  className="preview-save-btn"
                  onClick={handleSaveComment}
                  disabled={!commentText.trim() || savingComment}
                >
                  {savingComment ? 'Guardando...' : 'Guardar comentario'}
                </button>
              </div>

              {pageComments.length > 0 && (
                <div className="preview-annot-section">
                  <span className="preview-annot-label">Comentarios en esta página</span>
                  {pageComments.map(c => (
                    <div key={c.id} className="preview-comment-item">
                      <p className="preview-comment-text">{c.content}</p>
                      <span className="preview-comment-date">
                        {new Date(c.created_at).toLocaleDateString('es-AR')}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {annotMode === 'draw' && (
            <div className="preview-annot-section">
              <span className="preview-annot-label">Dibujar — {pageLabel}</span>
              <span className="preview-annot-hint">
                {strokeCount === 0
                  ? 'Hacé click sobre el libro para dibujar'
                  : `✓ ${strokeCount} trazo${strokeCount > 1 ? 's' : ''} — listo para guardar`}
              </span>
              {drawSaveError && (
                <span className="preview-draw-error">{drawSaveError}</span>
              )}
              <div className="preview-color-row">
                {DRAW_COLORS.map(c => (
                  <button
                    key={c}
                    className={`preview-color-dot${drawColor === c ? ' preview-color-dot--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setDrawColor(c)}
                  />
                ))}
              </div>
              <div className="preview-size-row">
                {[2, 4, 8].map(s => (
                  <button
                    key={s}
                    className={`preview-size-btn${drawSize === s ? ' preview-size-btn--active' : ''}`}
                    onClick={() => setDrawSize(s)}
                  >
                    <span style={{ width: s * 2.5, height: s * 2.5, borderRadius: '50%', background: drawColor, display: 'block' }} />
                  </button>
                ))}
              </div>
              <div className="preview-draw-actions">
                <button className="preview-clear-btn" onClick={clearDrawCanvas} disabled={savingDrawing}>Limpiar</button>
                <button className="preview-save-btn" onClick={handleSaveDrawing} disabled={savingDrawing}>
                  {savingDrawing ? 'Guardando...' : 'Guardar dibujo'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Bottom controls ── */}
      <div className="preview-controls">
        <div className="preview-nav">
          <button className="preview-nav-btn" onClick={goFirst} disabled={isFirst} title={t.firstPage}>
            <ChevronsLeft size={15} strokeWidth={1.5} />
          </button>
          <button className="preview-nav-btn" onClick={() => go(-1)} disabled={isFirst} title={t.prev}>
            <ChevronLeft size={15} strokeWidth={1.5} />
          </button>
          <span className="preview-page-label">{pageLabel}</span>
          <button className="preview-nav-btn" onClick={() => go(1)} disabled={isLast} title={t.next}>
            <ChevronRight size={15} strokeWidth={1.5} />
          </button>
          <button className="preview-nav-btn" onClick={goLast} disabled={isLast} title={t.lastPage}>
            <ChevronsRight size={15} strokeWidth={1.5} />
          </button>
        </div>
        {onSaveChanges && (
          <SaveChangesButton onSaveChanges={onSaveChanges} />
        )}
        <button className="preview-close-btn" onClick={onClose}>{t.close}</button>
      </div>

    </div>
  )
}

function SaveChangesButton({ onSaveChanges }: { onSaveChanges: () => Promise<void> }) {
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)

  async function handleClick() {
    if (saving || saved) return
    setSaving(true)
    await onSaveChanges()
    setSaving(false)
    setSaved(true)
  }

  return (
    <button
      className={`preview-save-changes-btn${saved ? ' preview-save-changes-btn--saved' : ''}`}
      onClick={handleClick}
      disabled={saving || saved}
    >
      {saving ? 'Guardando...' : saved ? 'Cambios guardados ✓' : 'Guardar cambios'}
    </button>
  )
}
