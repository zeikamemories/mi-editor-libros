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

interface Props {
  spreadsData:    Record<number, SpreadData>
  totalSpreads:   number
  initialSpread:  number
  pageW:          number
  pageH:          number
  onClose:        () => void
  onPageChange?:  (page: number) => void
}

const TITLEBAR_H = 50
const CONTROLS_H = 64

// ── Gray "No editable" placeholder — matches the Canvas overlay style ─────────
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

// ── Module-level turn.js loader (runs once per browser session) ──────────────
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
  spreadsData,
  totalSpreads,
  initialSpread,
  pageW,
  pageH,
  onClose,
  onPageChange,
}: Props) {
  const EMPTY_PAGE: PageData = { background: '#ffffff', pageW, pageH, objects: [] }
  const { t } = useLang()
  const [scale,       setScale]       = useState(0.5)
  const [loading,     setLoading]     = useState(true)
  const [pageImages,  setPageImages]  = useState<string[]>([])
  // Map editor's initialSpread to the re-ordered turn.js page number:
  // spread 0 (Tapa/Contra) → page 1 (Tapa), spread s>0 → page s*2
  const initialPage = initialSpread === 0 ? 1 : initialSpread * 2
  const [currentPage, setCurrentPage] = useState(initialPage)

  const flipbookEl = useRef<HTMLDivElement>(null)
  const $bookRef   = useRef<any>(null)
  const scaleRef   = useRef(scale)

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

  // Resize turn.js book when scale changes
  useEffect(() => {
    if (!$bookRef.current) return
    try {
      $bookRef.current.turn('size',
        Math.round(pageW * scale) * 2,
        Math.round(pageH * scale),
      )
    } catch {}
  }, [scale])

  // ── Pre-render all pages to JPEG data URLs ────────────────────────────────
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    const tasks: Promise<string>[] = []
    // Book order: Tapa → inner spreads → Contra
    // Inside (spread 1 left) and Outside (last spread right) are non-editable — rendered as gray placeholders
    const s0 = spreadsData[0]
    tasks.push(exportPageAsJpg(s0?.right ?? EMPTY_PAGE, pageW, pageH, 1,   // Tapa
      s0?.left  ? { data: s0.left,  fromSide: 'left'  } : undefined))
    for (let s = 1; s < totalSpreads; s++) {
      const data     = spreadsData[s]
      const left     = data?.left  ?? EMPTY_PAGE
      const right    = data?.right ?? EMPTY_PAGE
      const isInside  = s === 1
      const isOutside = s === totalSpreads - 1
      tasks.push(isInside
        ? Promise.resolve(renderNoEditPage(t.noEditable, pageW, pageH))
        : exportPageAsJpg(left,  pageW, pageH, 1, { data: right, fromSide: 'right' }))
      tasks.push(isOutside
        ? Promise.resolve(renderNoEditPage(t.noEditable, pageW, pageH))
        : exportPageAsJpg(right, pageW, pageH, 1, { data: left,  fromSide: 'left'  }))
    }
    tasks.push(exportPageAsJpg(s0?.left ?? EMPTY_PAGE, pageW, pageH, 1,    // Contra
      s0?.right ? { data: s0.right, fromSide: 'right' } : undefined))

    Promise.all(tasks).then(images => {
      if (!cancelled) { setPageImages(images); setLoading(false) }
    })

    return () => { cancelled = true }
  }, [spreadsData, totalSpreads])

  // ── Init turn.js once all images are ready ────────────────────────────────
  useEffect(() => {
    if (loading || pageImages.length === 0 || !flipbookEl.current) return

    const el = flipbookEl.current
    const s  = scaleRef.current
    const w  = Math.round(pageW * s)
    const h  = Math.round(pageH * s)

    // Build page DOM manually so React never interferes with turn.js internals
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

      $book.bind('turned', (_e: any, page: number) => {
        setCurrentPage(page)
        onPageChange?.(page)
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
      e.preventDefault()
      if (e.deltaY > 0) go(1)
      else if (e.deltaY < 0) go(-1)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => window.removeEventListener('wheel', onWheel)
  }, [go])

  const canvasW   = Math.round(pageW * scale)
  const canvasH   = Math.round(pageH * scale)
  const isFirst = currentPage <= 1
  const isLast  = currentPage >= totalSpreads * 2

  const pageLabel = (() => {
    if (currentPage <= 1)                  return t.cover
    if (currentPage >= totalSpreads * 2)   return t.back
    const spreadNum = Math.floor((currentPage - 1) / 2)
    return `${t.page} ${spreadNum * 2 + 1} — ${spreadNum * 2 + 2}`
  })()

  return (
    <div className="preview-overlay">

      {/* ── Title bar ── */}
      <div className="preview-titlebar">
        <span className="preview-title">{t.preview2D}</span>
        <div className="preview-titlebar-actions">
          <button className="preview-icon-btn" disabled>
            <MessageSquare size={18} strokeWidth={1.5} />
            <span>{t.comment}</span>
          </button>
          <button className="preview-icon-btn" disabled>
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
          </div>
        )}
      </div>

      {/* ── Bottom controls ── */}
      <div className="preview-controls">
        <div className="preview-nav">
          <button
            className="preview-nav-btn"
            onClick={goFirst}
            disabled={isFirst}
            title={t.firstPage}
          >
            <ChevronsLeft size={15} strokeWidth={1.5} />
          </button>
          <button
            className="preview-nav-btn"
            onClick={() => go(-1)}
            disabled={isFirst}
            title={t.prev}
          >
            <ChevronLeft size={15} strokeWidth={1.5} />
          </button>
          <span className="preview-page-label">{pageLabel}</span>
          <button
            className="preview-nav-btn"
            onClick={() => go(1)}
            disabled={isLast}
            title={t.next}
          >
            <ChevronRight size={15} strokeWidth={1.5} />
          </button>
          <button
            className="preview-nav-btn"
            onClick={goLast}
            disabled={isLast}
            title={t.lastPage}
          >
            <ChevronsRight size={15} strokeWidth={1.5} />
          </button>
        </div>
        <button className="preview-close-btn" onClick={onClose}>{t.close}</button>
      </div>

    </div>
  )
}
