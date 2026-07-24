'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  MessageSquare, Pencil, Undo2,
  ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
} from 'lucide-react'
import { exportPageAsJpg } from '../Canvas/fabricHelpers'
import type { PageData } from '../Canvas/fabricHelpers'
import { mapWithConcurrency } from '../../lib/concurrency'
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
  onCommentSave?:    (content: string, page: number) => Promise<Annotation | null>
  onCommentUpdate?:  (id: string, content: string) => Promise<boolean>
  onCommentDelete?:  (id: string) => Promise<void>
  onDrawingSave?:    (dataUrl: string, page: number) => Promise<Annotation | null>
  onDrawingDelete?:  (ids: string[]) => Promise<void>
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
  annotations: initialAnnotations, onCommentSave, onCommentUpdate, onCommentDelete,
  onDrawingSave, onDrawingDelete,
}: Props) {
  const EMPTY_PAGE: PageData = { background: '#ffffff', pageW, pageH, objects: [] }
  const { t } = useLang()
  const [scale,      setScale]      = useState(0.5)
  const [loading,    setLoading]    = useState(true)
  const [renderProgress, setRenderProgress] = useState({ done: 0, total: 0 })
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
  const [commentText,    setCommentText]    = useState('')
  const [savingComment,  setSavingComment]  = useState(false)
  const [pendingComment,   setPendingComment]   = useState<{ x: number; y: number } | null>(null)
  const [hoveredCommentId, setHoveredCommentId] = useState<string | null>(null)
  const [activeCommentId,  setActiveCommentId]  = useState<string | null>(null)
  const [editText,         setEditText]         = useState('')
  const [savingEdit,       setSavingEdit]       = useState(false)
  const [drawColor,      setDrawColor]      = useState(DRAW_COLORS[0])
  const [drawSize,       setDrawSize]       = useState(3)
  const isDrawingRef     = useRef(false)
  const [strokeCount,    setStrokeCount]    = useState(0)
  const [drawAutoSaved,  setDrawAutoSaved]  = useState(false)
  const [drawPanelOpen,  setDrawPanelOpen]  = useState(false)
  const drawCanvasRef   = useRef<HTMLCanvasElement>(null)
  const lastDrawPos     = useRef<{ x: number; y: number } | null>(null)
  // Track strokes as vector data for SVG export
  const strokesRef = useRef<Array<{ color: string; size: number; points: Array<{ x: number; y: number }> }>>([])
  const currentStrokeRef = useRef<{ color: string; size: number; points: Array<{ x: number; y: number }> } | null>(null)
  const autoSaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveParamsRef  = useRef<{ w: number; h: number; page: number }>({ w: 0, h: 0, page: 0 })

  // ── Toast — confirms a comment/drawing actually reached the design team ──
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const showToast = useCallback((msg: string) => {
    setToastMsg(msg)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToastMsg(null), 2800)
  }, [])

  useEffect(() => {
    if (initialAnnotations) setAnnotations(initialAnnotations)
  }, [initialAnnotations])

  // Reset on mode change
  useEffect(() => {
    setStrokeCount(0)
    setDrawAutoSaved(false)
    setDrawPanelOpen(annotMode === 'draw')
    setPendingComment(null)
    setActiveCommentId(null)
    setHoveredCommentId(null)
    setCommentText('')
    setEditText('')
  }, [annotMode])

  // Clear drawing canvas + strokes when page changes (cancel pending auto-save)
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = null
      // Flush any pending strokes before leaving this spread
      if (strokesRef.current.length > 0) saveCurrentStrokes()
    }
    const c = drawCanvasRef.current
    if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    strokesRef.current = []
    currentStrokeRef.current = null
    isDrawingRef.current = false
    lastDrawPos.current  = null
    setStrokeCount(0)
    setDrawAutoSaved(false)
    setPendingComment(null)
    setActiveCommentId(null)
    setHoveredCommentId(null)
    setEditText('')
  }, [currentPage])

  // Clean up timer on unmount
  useEffect(() => () => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
    if (toastTimer.current)    clearTimeout(toastTimer.current)
  }, [])

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
  // Every page is exported to its own offscreen Fabric canvas (exportPageAsJpg),
  // so pages are independent of each other and safe to render concurrently —
  // this used to run one page at a time, which is why a ~20-spread book could
  // take a minute-plus to open. A small concurrency cap keeps it fast without
  // spinning up dozens of offscreen canvases at once on weaker devices.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setRenderProgress({ done: 0, total: 0 })

    // On mobile, render at half resolution to avoid crashing Safari
    const renderScale = window.innerWidth < 900 ? 0.5 : 1
    const RENDER_CONCURRENCY = 4

    async function renderAll() {
      const s0 = spreadsData[0]
      type Task = () => Promise<string>
      const tasks: Task[] = []

      const jpgTask = (page: PageData, adj?: { data: PageData; fromSide: 'left' | 'right' }): Task =>
        () => exportPageAsJpg(page, pageW, pageH, renderScale, adj)
      const staticTask = (label: string): Task =>
        () => Promise.resolve(renderNoEditPage(label, pageW, pageH))

      tasks.push(jpgTask(s0?.right ?? EMPTY_PAGE, s0?.left ? { data: s0.left, fromSide: 'left' } : undefined))

      for (let s = 1; s < totalSpreads; s++) {
        const data      = spreadsData[s]
        const left      = data?.left  ?? EMPTY_PAGE
        const right     = data?.right ?? EMPTY_PAGE
        const isInside  = s === 1
        const isOutside = s === totalSpreads - 1

        tasks.push(isInside  ? staticTask(t.noEditable) : jpgTask(left,  { data: right, fromSide: 'right' }))
        tasks.push(isOutside ? staticTask(t.noEditable) : jpgTask(right, { data: left,  fromSide: 'left'  }))
      }

      tasks.push(jpgTask(s0?.left ?? EMPTY_PAGE, s0?.right ? { data: s0.right, fromSide: 'right' } : undefined))

      if (cancelled) return
      setRenderProgress({ done: 0, total: tasks.length })
      let done = 0

      const results = await mapWithConcurrency(tasks, RENDER_CONCURRENCY, async (task) => {
        const result = await task()
        done += 1
        if (!cancelled) setRenderProgress({ done, total: tasks.length })
        return result
      })
      if (cancelled) return

      // A single page failing to render (bad photo URL, etc.) shouldn't block
      // the whole preview — fall back to the same placeholder used elsewhere.
      const images = results.map(r => r.status === 'fulfilled' ? r.value : renderNoEditPage(t.noEditable, pageW, pageH))
      setPageImages(images)
      setLoading(false)
    }

    renderAll()
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

      // Disable input while a page-turn animation is running — otherwise a
      // fast swipe on mobile queues up several turns and the reader loses
      // track of where they are in the book.
      $book.bind('turning', (_e: any, page: number) => {
        setCurrentPage(page)
        onPageChange?.(page)
        $book.turn('disable', true)
      })
      $book.bind('turned', (_e: any, page: number) => {
        setCurrentPage(page)
        $book.turn('disable', false)
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
    ;(e.currentTarget as any)._capturedPointerId = e.pointerId
    setDrawPanelOpen(false)
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
    // Auto-save strokes after 800ms of inactivity
    if (onDrawingSave && strokesRef.current.length > 0) {
      const canvas = drawCanvasRef.current
      if (canvas) saveParamsRef.current = { w: canvas.width, h: canvas.height, page: currentPage }
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current)
      autoSaveTimer.current = setTimeout(saveCurrentStrokes, 800)
    }
  }

  async function saveCurrentStrokes() {
    // Don't interrupt an active stroke — onDrawEnd will reschedule after pointer-up
    if (isDrawingRef.current) return
    if (!onDrawingSave || strokesRef.current.length === 0) return
    const { w, h, page } = saveParamsRef.current
    if (!w || !h) return

    // Snapshot and atomically clear pending strokes before the async call
    // so a concurrent stroke doesn't get wiped if the save takes time
    const strokes = strokesRef.current.splice(0)

    const paths = strokes.map(s => {
      const pts = s.points
      if (pts.length === 0) return ''
      const d = pts.length === 1
        ? `M${pts[0].x},${pts[0].y} l0.1,0.1`
        : `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map(p => `L${p.x},${p.y}`).join(' ')
      return `<path d="${d}" stroke="${s.color}" stroke-width="${s.size}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    }).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">${paths}</svg>`
    const ann = await onDrawingSave(svg, page)
    if (ann) {
      setAnnotations(prev => [...prev, ann])
      setStrokeCount(0)
      setDrawAutoSaved(true)
      showToast('✓ Dibujo guardado')
      // Only clear canvas if the user isn't mid-stroke during the async wait
      if (!isDrawingRef.current) {
        const c = drawCanvasRef.current
        if (c) c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
      }
    } else {
      // Save failed — put strokes back so they aren't lost
      strokesRef.current = [...strokes, ...strokesRef.current]
    }
  }

  function redrawCanvas() {
    const c = drawCanvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')!
    ctx.clearRect(0, 0, c.width, c.height)
    for (const s of strokesRef.current) {
      if (s.points.length === 0) continue
      ctx.strokeStyle = s.color
      ctx.lineWidth   = s.size
      ctx.lineCap     = 'round'
      ctx.lineJoin    = 'round'
      if (s.points.length === 1) {
        ctx.beginPath()
        ctx.arc(s.points[0].x, s.points[0].y, s.size / 2, 0, Math.PI * 2)
        ctx.fillStyle = s.color
        ctx.fill()
      } else {
        ctx.beginPath()
        ctx.moveTo(s.points[0].x, s.points[0].y)
        for (let i = 1; i < s.points.length; i++) ctx.lineTo(s.points[i].x, s.points[i].y)
        ctx.stroke()
      }
    }
  }

  function undoLastStroke() {
    if (autoSaveTimer.current) { clearTimeout(autoSaveTimer.current); autoSaveTimer.current = null }

    if (strokesRef.current.length > 0) {
      // Still unsaved strokes on canvas — undo the last one
      strokesRef.current.pop()
      setStrokeCount(n => Math.max(0, n - 1))
      redrawCanvas()
      // Reschedule auto-save if strokes remain
      if (strokesRef.current.length > 0 && onDrawingSave) {
        const canvas = drawCanvasRef.current
        if (canvas) saveParamsRef.current = { w: canvas.width, h: canvas.height, page: currentPage }
        autoSaveTimer.current = setTimeout(saveCurrentStrokes, 800)
      }
    } else {
      // All strokes already saved as annotations — remove the last saved drawing
      const lastDrawing = pageDrawings[pageDrawings.length - 1]
      if (!lastDrawing) return
      setAnnotations(prev => prev.filter(a => a.id !== lastDrawing.id))
      onDrawingDelete?.([lastDrawing.id])
      setDrawAutoSaved(false)
    }
  }

  function parseComment(c: Annotation): { text: string; x: number; y: number } {
    try {
      if (c.content.startsWith('{')) {
        const p = JSON.parse(c.content)
        return { text: p.text ?? c.content, x: p.x ?? 0.5, y: p.y ?? 0.5 }
      }
    } catch {}
    return { text: c.content, x: 0.5, y: 0.5 }
  }

  function handleBookClick(e: React.MouseEvent<HTMLDivElement>) {
    if (annotMode !== 'comment' || pendingComment) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPendingComment({
      x: (e.clientX - rect.left) / rect.width,
      y: (e.clientY - rect.top)  / rect.height,
    })
    setActiveCommentId(null)
  }

  function handleBookTouchEnd(e: React.TouchEvent<HTMLDivElement>) {
    if (annotMode !== 'comment' || pendingComment) return
    e.preventDefault()
    e.stopPropagation()
    const touch = e.changedTouches[0]
    if (!touch) return
    const rect = e.currentTarget.getBoundingClientRect()
    setPendingComment({
      x: (touch.clientX - rect.left) / rect.width,
      y: (touch.clientY - rect.top)  / rect.height,
    })
    setActiveCommentId(null)
  }

  async function handleSaveComment() {
    if (!commentText.trim() || !onCommentSave || !pendingComment) return
    setSavingComment(true)
    const content = JSON.stringify({ text: commentText.trim(), x: pendingComment.x, y: pendingComment.y })
    const ann = await onCommentSave(content, spreadLeftPage)
    if (ann) {
      setAnnotations(prev => [...prev, ann])
      setCommentText('')
      setPendingComment(null)
      showToast('✓ Comentario enviado')
    }
    setSavingComment(false)
  }

  async function handleUpdateComment() {
    if (!editText.trim() || !onCommentUpdate || !activeCommentId) return
    setSavingEdit(true)
    const existing = annotations.find(a => a.id === activeCommentId)
    if (!existing) { setSavingEdit(false); return }
    const { x, y } = parseComment(existing)
    const newContent = JSON.stringify({ text: editText.trim(), x, y })
    const ok = await onCommentUpdate(activeCommentId, newContent)
    if (ok) {
      setAnnotations(prev => prev.map(a => a.id === activeCommentId ? { ...a, content: newContent } : a))
      setActiveCommentId(null)
      setEditText('')
      showToast('✓ Comentario actualizado')
    }
    setSavingEdit(false)
  }

  async function handleDeleteComment(id: string) {
    if (onCommentDelete) await onCommentDelete(id)
    setAnnotations(prev => prev.filter(a => a.id !== id))
    setActiveCommentId(null)
    setEditText('')
  }

// Turn.js can report either the left or right page of the spread depending on
  // turn.js even pages (2, 4, 6…) are left pages; odd pages > 1 (3, 5, 7…) are right pages.
  // Normalize to the left page. Cover (page 1) and back cover are single pages — no +1 pair.
  const spreadLeftPage  = currentPage > 1 && currentPage % 2 === 1 ? currentPage - 1 : currentPage
  const isSinglePage    = currentPage <= 1 || currentPage >= totalSpreads * 2
  const spreadRightPage = isSinglePage ? spreadLeftPage : spreadLeftPage + 1
  const onSpread        = (a: Annotation) => a.page_number === spreadLeftPage || a.page_number === spreadRightPage
  const pageComments    = annotations.filter(a => onSpread(a) && a.type === 'comment')
  const pageDrawings    = annotations.filter(a => onSpread(a) && a.type === 'drawing')

  // ── Sizes ──────────────────────────────────────────────────────────────────
  const canvasW = Math.round(pageW * scale)
  const canvasH = Math.round(pageH * scale)
  const isFirst = currentPage <= 1
  const isLast  = currentPage >= totalSpreads * 2

  // Map turn.js's raw page index to the builder's own content-page numbering.
  // turn.js page 1 = front cover, page 2 = blank inside-front flyleaf, page 3 =
  // content page 1, ... page (2*totalSpreads) = back cover. So content page =
  // turnPage - 2, valid between 1 and maxContent. The spread right after the
  // cover and the spread right before the back cover each show only ONE real
  // page (the other side is the non-editable flyleaf) — same as the builder's
  // PageStrip, which labels those spreads with a single number instead of a range.
  const pageLabel = (() => {
    if (spreadLeftPage <= 1)                  return t.cover
    if (spreadLeftPage >= totalSpreads * 2)   return t.back

    const maxContent   = totalSpreads * 2 - 4
    const contentLeft  = spreadLeftPage  - 2
    const contentRight = spreadRightPage - 2
    const leftReal     = contentLeft  >= 1 && contentLeft  <= maxContent
    const rightReal    = contentRight >= 1 && contentRight <= maxContent

    if (leftReal && rightReal) return `${t.carilla} ${contentLeft} — ${contentRight}`
    if (rightReal)             return `${t.carilla} ${contentRight}`
    if (leftReal)              return `${t.carilla} ${contentLeft}`
    return t.carilla
  })()

  return (
    <div className="preview-overlay">

      {toastMsg && <div className="preview-toast">{toastMsg}</div>}

      {/* ── Title bar ── */}
      <div className="preview-titlebar">
        <button className="preview-close-btn" onClick={onClose}>{t.close}</button>
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
          <div className="preview-render-loading">
            {t.preparingPreview}
            {renderProgress.total > 0 && ` (${renderProgress.done}/${renderProgress.total})`}
          </div>
        ) : (
          <div
            className="preview-book-shell"
            style={{ width: canvasW * 2, height: canvasH }}
          >
            <div
              ref={flipbookEl}
              className="preview-flipbook"
            />

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
                onTouchStart={e => e.stopPropagation()}
              />
            )}

            {/* Comment pins — always visible when there are comments on this page */}
            {pageComments.map((c, i) => {
              const { text, x, y } = parseComment(c)
              const isActive  = activeCommentId === c.id
              const isHovered = hoveredCommentId === c.id && !isActive
              return (
                <div key={c.id}>
                  <div
                    className={`preview-comment-pin${isActive ? ' preview-comment-pin--active' : ''}`}
                    style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                    onMouseEnter={() => setHoveredCommentId(c.id)}
                    onMouseLeave={() => setHoveredCommentId(null)}
                    onClick={e => {
                      e.stopPropagation()
                      if (isActive) { setActiveCommentId(null); setEditText('') }
                      else { setActiveCommentId(c.id); setEditText(text); setPendingComment(null) }
                    }}
                    onTouchEnd={e => {
                      e.stopPropagation()
                      e.preventDefault()
                      if (isActive) { setActiveCommentId(null); setEditText('') }
                      else { setActiveCommentId(c.id); setEditText(text); setPendingComment(null) }
                    }}
                  >
                    {i + 1}
                  </div>
                  {isHovered && (
                    <div className="preview-comment-tooltip" style={{ left: `${x * 100}%`, top: `${y * 100}%` }}>
                      {text}
                    </div>
                  )}
                  {isActive && (
                    <div
                      className="preview-comment-popup"
                      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
                      onClick={e => e.stopPropagation()}
                    >
                      <textarea
                        className="preview-comment-popup-input"
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleUpdateComment() }
                          if (e.key === 'Escape') { setActiveCommentId(null); setEditText('') }
                        }}
                        autoFocus
                        rows={2}
                      />
                      <div className="preview-comment-popup-actions">
                        <button
                          className="preview-comment-popup-delete"
                          onClick={() => handleDeleteComment(c.id)}
                          title="Eliminar"
                        >🗑</button>
                        <button
                          className="preview-comment-popup-send"
                          onClick={handleUpdateComment}
                          disabled={!editText.trim() || savingEdit}
                        >
                          {savingEdit ? '…' : '↑'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}

            {/* Comment mode extras: click overlay + pending popup */}
            {annotMode === 'comment' && hasAnnotations && (
              <>
                <div
                  className="preview-comment-overlay"
                  onClick={handleBookClick}
                  onTouchStart={e => e.stopPropagation()}
                  onTouchEnd={handleBookTouchEnd}
                />
                {pendingComment && (
                  <div
                    className="preview-comment-popup"
                    style={{ left: `${pendingComment.x * 100}%`, top: `${pendingComment.y * 100}%` }}
                    onClick={e => e.stopPropagation()}
                  >
                    <textarea
                      className="preview-comment-popup-input"
                      placeholder="Agregá un comentario..."
                      value={commentText}
                      onChange={e => setCommentText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveComment() }
                        if (e.key === 'Escape') { setPendingComment(null); setCommentText('') }
                      }}
                      autoFocus
                      rows={2}
                    />
                    <div className="preview-comment-popup-actions">
                      <button className="preview-comment-popup-cancel" onClick={() => { setPendingComment(null); setCommentText('') }}>✕</button>
                      <button
                        className="preview-comment-popup-send"
                        onClick={handleSaveComment}
                        disabled={!commentText.trim() || savingComment}
                      >
                        {savingComment ? '…' : '↑'}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Draw panel — floats inside stage, top-right ── */}
        {hasAnnotations && annotMode === 'draw' && drawPanelOpen && (
          <div className="preview-annot-sidebar preview-annot-sidebar--draw">
            <div className="preview-annot-section">
              <span className="preview-annot-label">Dibujar — {pageLabel}</span>
              <span className="preview-annot-hint">
                {strokeCount === 0 && !drawAutoSaved
                  ? 'Dibujá sobre el libro — se guarda solo'
                  : drawAutoSaved
                    ? '✓ Guardado'
                    : `${strokeCount} trazo${strokeCount > 1 ? 's' : ''} — guardando...`}
              </span>
              <div className="preview-color-row">
                {DRAW_COLORS.map(c => (
                  <button
                    key={c}
                    className={`preview-color-dot${drawColor === c ? ' preview-color-dot--active' : ''}`}
                    style={{ background: c }}
                    onClick={() => setDrawColor(c)}
                  />
                ))}
                <button
                  className="preview-undo-btn"
                  onClick={undoLastStroke}
                  disabled={strokeCount === 0 && pageDrawings.length === 0}
                  title="Deshacer último trazo"
                >
                  <Undo2 size={15} strokeWidth={1.5} />
                </button>
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
            </div>
          </div>
        )}


      </div>

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
      </div>

    </div>
  )
}

