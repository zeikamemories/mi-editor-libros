'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import JSZip from 'jszip'
import { jsPDF } from 'jspdf'
import * as fabric from 'fabric'

const Topbar       = dynamic(() => import('../components/Topbar/Topbar'),       { ssr: false })
import Toolbar     from '../components/Toolbar/Toolbar'
import TextModal, { type TextOpts } from '../components/TextModal/TextModal'
const PhotoPanel = dynamic(() => import('../components/PhotoPanel/PhotoPanel'), { ssr: false })
import type { Photo } from '../components/PhotoPanel/PhotoPanel'
import SpreadsView from '../components/SpreadsView/SpreadsView'
// Canvas uses Fabric.js (browser-only). Dynamic import with ssr:false prevents
// Next.js from attempting to server-render it, eliminating all hydration errors.
const Canvas       = dynamic(() => import('../components/Canvas/Canvas'),             { ssr: false })
const PreviewModal = dynamic(() => import('../components/PreviewModal/PreviewModal'), { ssr: false })
import LayoutPanel from '../components/LayoutPanel/LayoutPanel'
import PageStrip   from '../components/PageStrip/PageStrip'
import OnboardingTour from '../components/OnboardingTour/OnboardingTour'
import type { Layout } from '../components/LayoutPanel/LayoutPanel'

import { BOOK_SIZE }                                      from '../config/bookSize'
import type { GridSettings, Guide }                        from '../components/Canvas/Canvas'
import { applyLayout, addTextBox, addShape, serializePage,
         deserializePage, dropPhotoOnFrame, dropPhotoFree,
         exportPageAsJpg, buildPageFromLayout,
         dropTextureOnPage, dropStickerOnPage }             from '../components/Canvas/fabricHelpers'
import type { PageData, PhotoAssignment, ShapeKind }       from '../components/Canvas/fabricHelpers'
import { LAYOUTS }                                         from '../config/layouts'

import { LanguageProvider } from '../context/LanguageContext'
import './editor.css'

const PAGE_W = BOOK_SIZE.widthPx   // 816
const PAGE_H = BOOK_SIZE.heightPx  // 1058

// ─── Types ──────────────────────────────────────────────────────────────────

type SpreadSnapshot = { left: PageData; right: PageData }

// ─── Component ──────────────────────────────────────────────────────────────

export default function EditorPage() {

  // ── View mode (editor vs spreads overview) ────────────────────────────────
  const [viewMode, setViewMode] = useState<'editor' | 'spreads'>('editor')

  // ── Export ────────────────────────────────────────────────────────────────
  const [isExporting, setIsExporting] = useState(false)

  // ── Project identity (stable for this session) ─────────────────────────────
  const [projectId] = useState(() => crypto.randomUUID())

  // ── Preview ────────────────────────────────────────────────────────────────
  const [previewOpen,     setPreviewOpen]     = useState(false)
  const [previewSnapshot, setPreviewSnapshot] = useState<Record<number, SpreadSnapshot>>({})

  // ── Photos ─────────────────────────────────────────────────────────────────
  const [photos,       setPhotos]       = useState<Photo[]>(() => {
    if (typeof window === 'undefined') return []
    try {
      const stored = sessionStorage.getItem('zeika_photos')
      if (stored) { sessionStorage.removeItem('zeika_photos'); return JSON.parse(stored) as Photo[] }
    } catch {}
    return []
  })
  const [usedPhotoIds, setUsedPhotoIds] = useState<Set<string>>(new Set())
  const photosRef = useRef<Photo[]>([])

  // ── Book / navigation ──────────────────────────────────────────────────────
  const [currentSpread,       setCurrentSpread]       = useState(0)
  const [totalContentSpreads, setTotalContentSpreads] = useState(13)
  const totalSpreads = totalContentSpreads + 3

  // ── Layout panel ───────────────────────────────────────────────────────────
  const [selectedLayoutId,   setSelectedLayoutId]   = useState<string | null>(null)
  const [selectedPhotoCount, setSelectedPhotoCount] = useState(1)

  // ── Canvas settings ────────────────────────────────────────────────────────
  const [zoom,           setZoom]           = useState(0.75) // overridden by Canvas on mount
  const [rulerMode,      setRulerMode]      = useState(false)
  const [guides,         setGuides]         = useState<Guide[]>([])
  const [frameTool,      setFrameTool]      = useState(false)
  const [tourOpen,       setTourOpen]       = useState(false)
  const [activePageBg,   setActivePageBg]   = useState('#FFFFFF')
  const [showGrid,       setShowGrid]       = useState(false)
  const [gridSettings,   setGridSettings]   = useState<GridSettings>({
    cols: 5, rows: 5, color: '#ff0000', opacity: 20, thickness: 'thin',
  })

  // ── History (undo / redo) ──────────────────────────────────────────────────
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const history      = useRef<string[]>([])
  const historyIndex = useRef(-1)

  // ── Fabric instances ───────────────────────────────────────────────────────
  const fabricLeft    = useRef<fabric.Canvas | null>(null)
  const fabricRight   = useRef<fabric.Canvas | null>(null)
  const syncMirrorsRef = useRef<(() => void) | null>(null)

  // ── Text edit modal ────────────────────────────────────────────────────────
  const [textModal, setTextModal] = useState<{
    textbox: fabric.Textbox
    side:    'left' | 'right'
  } | null>(null)

  // ── Thumbnails (live previews in PageStrip) ────────────────────────────────
  const [thumbnails,      setThumbnails]      = useState<Record<number, { left: string; right: string }>>({})
  const thumbnailTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Cached static thumbnails — set once at mount, reused when spreads are added/removed
  const blankThumbRef    = useRef<string>('')
  const noEditThumbRef   = useRef<string>('')
  const logoThumbRef     = useRef<string>('')

  // ── Auto-open tour on every page load ─────────────────────────────────────
  useEffect(() => {
    setTourOpen(true)
  }, [])

  // Generate initial thumbnails on mount so the strip never shows grey rects
  useEffect(() => {
    const W = 82    // 816 × 0.1
    const H = 106   // 1058 × 0.1
    const total = totalContentSpreads + 3  // same as totalSpreads
    const lastIdx = total - 1

    const mk = () => {
      const c = document.createElement('canvas')
      c.width = W; c.height = H
      return c
    }

    // White blank page
    const blankCanvas = mk()
    const bCtx = blankCanvas.getContext('2d')!
    bCtx.fillStyle = '#ffffff'
    bCtx.fillRect(0, 0, W, H)
    const blank = blankCanvas.toDataURL('image/jpeg', 0.85)
    blankThumbRef.current = blank

    // Grey "No editable" page
    const neCanvas = mk()
    const nCtx = neCanvas.getContext('2d')!
    nCtx.fillStyle = '#e8e8e8'
    nCtx.fillRect(0, 0, W, H)
    nCtx.fillStyle = '#666666'
    nCtx.font = 'bold 6.5px sans-serif'
    nCtx.textAlign = 'center'
    nCtx.textBaseline = 'middle'
    nCtx.fillText('No editable', W / 2, H / 2)
    const noEdit = neCanvas.toDataURL('image/jpeg', 0.85)
    noEditThumbRef.current = noEdit

    // Build initial map: spread 1 left = no-edit, last right = no-edit, rest = blank
    const initial: Record<number, { left: string; right: string }> = {}
    for (let i = 0; i < total; i++) {
      initial[i] = {
        left:  i === 1 ? noEdit : blank,
        right: i === lastIdx ? noEdit : blank,
      }
    }
    setThumbnails(initial)

    // Last spread left page: draw logo over white
    const img = new window.Image()
    img.onload = () => {
      const c = mk()
      const ctx = c.getContext('2d')!
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, W, H)
      const logoW = W * 0.55
      const logoH = logoW * (img.height / img.width)
      ctx.drawImage(img, (W - logoW) / 2, (H - logoH) / 2 - 4, logoW, logoH)
      const logoDataUrl = c.toDataURL('image/jpeg', 0.85)
      logoThumbRef.current = logoDataUrl
      setThumbnails(prev => ({
        ...prev,
        [lastIdx]: { ...prev[lastIdx], left: logoDataUrl },
      }))
    }
    img.src = '/LogoZeika.jpg'
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Active page (last clicked page in Canvas) ──────────────────────────────
  const activePageRef = useRef<'left' | 'right'>('left')

  // ── In-memory spread persistence (survives navigation within the session) ──
  // Keyed by spread index. Saved immediately on every canvas change — no debounce.
  const spreadsData      = useRef<Record<number, SpreadSnapshot>>({})
  const currentSpreadRef = useRef(0)
  // Guard: while deserializing (restoring a spread), suppress auto-saves so that
  // Fabric object:added/removed events fired mid-restore don't overwrite the
  // target spread's saved data with partial canvas state.
  const isDeserializing  = useRef(false)

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getActiveFabric   = () => activePageRef.current === 'right' ? fabricRight.current : fabricLeft.current
  const getInactiveFabric = () => activePageRef.current === 'right' ? fabricLeft.current  : fabricRight.current

  // ── Keep photosRef current so callbacks can read the latest array ─────────
  useEffect(() => { photosRef.current = photos }, [photos])

  // ── Recompute used photos by scanning all saved spreads ───────────────────
  // Runs after every saveCurrentSpread so filters stay accurate even when
  // photos are deleted from the canvas or the user navigates between spreads.
  const recomputeUsedPhotos = useCallback(() => {
    const usedSrcs = new Set<string>()
    for (const snapshot of Object.values(spreadsData.current)) {
      for (const page of [snapshot.left, snapshot.right]) {
        if (page.objects !== undefined) {
          for (const entry of page.objects) {
            if (entry.kind === 'photo') usedSrcs.add(entry.photo)
            if (entry.kind === 'freePhoto') usedSrcs.add(entry.src)
          }
        } else {
          for (const frame of page.frames ?? []) {
            if (!frame.isEmpty && frame.photo) usedSrcs.add(frame.photo)
          }
          for (const fp of page.freePhotos ?? []) {
            usedSrcs.add(fp.src)
          }
        }
      }
    }
    setUsedPhotoIds(new Set(
      photosRef.current.filter((p) => usedSrcs.has(p.src)).map((p) => p.id)
    ))
  }, [])

  // ── Capture thumbnails for the PageStrip ─────────────────────────────────
  const captureThumbnail = useCallback((spreadIndex: number) => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return
    try {
      const opts = { format: 'jpeg' as const, quality: 0.6, multiplier: 0.08 }
      const leftUrl  = lc.toDataURL(opts)
      const rightUrl = rc.toDataURL(opts)
      setThumbnails((prev) => ({ ...prev, [spreadIndex]: { left: leftUrl, right: rightUrl } }))
    } catch (_) { /* canvas not ready */ }
  }, [])

  // ── Render a single page to a small thumbnail from saved PageData ─────────
  // Fast-path for empty pages (pure 2D fill); full Fabric render for pages with content.
  const renderPageThumb = useCallback((pageData: PageData): Promise<string> => {
    const THUMB_W = 82
    const THUMB_H = 106
    const isEmpty = pageData.objects !== undefined
      ? pageData.objects.length === 0 && !pageData.backgroundImage
      : (pageData.frames?.length ?? 0) === 0 &&
        (pageData.texts?.length  ?? 0) === 0 &&
        (pageData.freePhotos?.length ?? 0) === 0 &&
        !pageData.backgroundImage
    if (isEmpty) {
      const c = document.createElement('canvas')
      c.width = THUMB_W; c.height = THUMB_H
      const ctx = c.getContext('2d')!
      ctx.fillStyle = pageData.background || '#ffffff'
      ctx.fillRect(0, 0, THUMB_W, THUMB_H)
      return Promise.resolve(c.toDataURL('image/jpeg', 0.85))
    }
    return exportPageAsJpg(pageData, PAGE_W, PAGE_H, THUMB_W / PAGE_W)
  }, [])

  // ── Regenerate thumbnails for all non-current spreads from spreadsData ─────
  const regenerateThumbnails = useCallback((currentIdx: number, total: number) => {
    for (let i = 0; i < total; i++) {
      if (i === currentIdx) continue
      const snap = spreadsData.current[i]
      if (!snap) continue
      Promise.all([renderPageThumb(snap.left), renderPageThumb(snap.right)]).then(([left, right]) => {
        setThumbnails(prev => ({ ...prev, [i]: { left, right } }))
      })
    }
  }, [renderPageThumb])

  // ── Push a snapshot to undo history ───────────────────────────────────────
  const pushHistory = useCallback(() => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    const snapshot = JSON.stringify({
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    })

    history.current      = [...history.current.slice(0, historyIndex.current + 1), snapshot]
    historyIndex.current = history.current.length - 1

    setCanUndo(historyIndex.current > 0)
    setCanRedo(false)
  }, [])

  // ── Save current spread immediately (no debounce) ─────────────────────────
  // Called on every canvas mutation so navigation always has fresh data.
  // Suppressed while deserializing to prevent mid-restore events from writing
  // partial canvas state into spreadsData.
  const saveCurrentSpread = useCallback(() => {
    if (isDeserializing.current) return
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    spreadsData.current[currentSpreadRef.current] = {
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    }
    pushHistory()
    recomputeUsedPhotos()

    // Debounced thumbnail — avoids capturing on every keystroke/drag event
    if (thumbnailTimerRef.current) clearTimeout(thumbnailTimerRef.current)
    thumbnailTimerRef.current = setTimeout(() => {
      captureThumbnail(currentSpreadRef.current)
    }, 400)
  }, [pushHistory, captureThumbnail, recomputeUsedPhotos])

  // ── Canvas ready: restore saved state, then wire change listeners ───────────
  const handleCanvasReady = useCallback(
    async (left: fabric.Canvas, right: fabric.Canvas, syncMirrors: () => void) => {
      fabricLeft.current   = left
      fabricRight.current  = right
      syncMirrorsRef.current = syncMirrors

      // Restore the current spread BEFORE registering change listeners.
      // If we registered listeners first, every object:added event fired by
      // deserializePage would call saveCurrentSpread and overwrite saved data
      // with the partially-loaded canvas state.
      const saved = spreadsData.current[currentSpreadRef.current]
      if (saved) {
        await deserializePage(left,  saved.left,  PAGE_W, PAGE_H)
        await deserializePage(right, saved.right, PAGE_W, PAGE_H)
        syncMirrors()
      }

      const onChange = () => saveCurrentSpread()
      for (const fc of [left, right]) {
        fc.on('object:modified', onChange)
        fc.on('object:added',    onChange)
        fc.on('object:removed',  onChange)
      }

      pushHistory()
    },
    [saveCurrentSpread, pushHistory],
  )

  // ── Active page change (fired by Canvas on mousedown) ─────────────────────
  const handleActivePageChange = useCallback((page: 'left' | 'right') => {
    activePageRef.current = page
    const fc = page === 'right' ? fabricRight.current : fabricLeft.current
    if (fc) setActivePageBg((fc.backgroundColor as string) || '#FFFFFF')
  }, [])

  // ── Photo upload ───────────────────────────────────────────────────────────
  const handlePhotoUpload = useCallback((uploaded: Photo[]) => {
    setPhotos((prev) => [...prev, ...uploaded])
  }, [])

  // ── Photo delete (from panel) ──────────────────────────────────────────────
  const handlePhotoDelete = useCallback((photoId: string) => {
    setPhotos((prev) => {
      photosRef.current = prev.filter((p) => p.id !== photoId)
      return photosRef.current
    })
    recomputeUsedPhotos()
  }, [recomputeUsedPhotos])

  // ── Photo click: place in first empty frame, active page first ─────────────
  const handlePhotoClick = useCallback(async (photo: Photo) => {
    for (const fc of [getActiveFabric(), getInactiveFabric()]) {
      if (!fc) continue
      const emptyFrame = fc.getObjects().find((obj) => {
        const d = (obj as fabric.FabricObject & { data?: { type: string; isEmpty: boolean } }).data
        return d?.type === 'frame' && d.isEmpty === true
      }) as fabric.Rect | undefined

      if (emptyFrame) {
        await dropPhotoOnFrame(fc, emptyFrame, photo.src, PAGE_W, PAGE_H)
        saveCurrentSpread()
        return
      }
    }
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Photo dropped onto canvas frame (from drag) ────────────────────────────
  const handlePhotoDrop = useCallback((_photoId: string) => {
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Layout select (panel click) → applies to active page ──────────────────
  const handleLayoutSelect = useCallback((layout: Layout) => {
    const fc = getActiveFabric()
    if (!fc) return
    setSelectedLayoutId(layout.id)
    applyLayout(fc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Layout dropped onto a specific page in Canvas ─────────────────────────
  const handleLayoutDropOnPage = useCallback((layoutId: string, page: 'left' | 'right') => {
    const layout = LAYOUTS.find((l) => l.id === layoutId)
    if (!layout) return
    const fc = page === 'right' ? fabricRight.current : fabricLeft.current
    if (!fc) return
    setSelectedLayoutId(layoutId)
    applyLayout(fc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread])

  // ── Add text → active page ─────────────────────────────────────────────────
  const handleAddText = useCallback(() => {
    const fc = getActiveFabric()
    if (!fc) return
    addTextBox(fc, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add shape → active page ────────────────────────────────────────────────
  const handleAddShape = useCallback((kind: ShapeKind) => {
    const fc = getActiveFabric()
    if (!fc) return
    addShape(fc, kind, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Text edit modal handlers ───────────────────────────────────────────────
  const handleTextEdit = useCallback((textbox: fabric.Textbox, side: 'left' | 'right') => {
    setTextModal({ textbox, side })
  }, [])

  const handleTextConfirm = useCallback((opts: TextOpts) => {
    if (!textModal) return
    const { textbox, side } = textModal
    textbox.set({
      text:        opts.text,
      fontFamily:  opts.fontFamily,
      fontWeight:  opts.bold ? 'bold' : 'normal',
      underline:   opts.underline,
      textAlign:   opts.textAlign as fabric.Textbox['textAlign'],
      fontSize:    opts.fontSize,
      fill:        opts.fill,
      lineHeight:  opts.lineHeight,
      charSpacing: opts.charSpacing,
    })
    const fc = side === 'left' ? fabricLeft.current : fabricRight.current
    fc?.renderAll()
    saveCurrentSpread()
    setTextModal(null)
  }, [textModal, saveCurrentSpread])

  const handleTextCancel = useCallback(() => {
    setTextModal(null)
  }, [])

  // ── Undo ───────────────────────────────────────────────────────────────────
  const handleUndo = useCallback(async () => {
    if (historyIndex.current <= 0) return
    const prevIdx  = historyIndex.current - 1
    const snapshot = JSON.parse(history.current[prevIdx]) as SpreadSnapshot
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    isDeserializing.current = true
    try {
      await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
      await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)
    } finally {
      isDeserializing.current = false
    }

    historyIndex.current = prevIdx
    setCanUndo(prevIdx > 0)
    setCanRedo(true)
  }, [])

  // ── Redo ───────────────────────────────────────────────────────────────────
  const handleRedo = useCallback(async () => {
    if (historyIndex.current >= history.current.length - 1) return
    const nextIdx  = historyIndex.current + 1
    const snapshot = JSON.parse(history.current[nextIdx]) as SpreadSnapshot
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    isDeserializing.current = true
    try {
      await deserializePage(lc, snapshot.left,  PAGE_W, PAGE_H)
      await deserializePage(rc, snapshot.right, PAGE_W, PAGE_H)
    } finally {
      isDeserializing.current = false
    }

    historyIndex.current = nextIdx
    setCanUndo(true)
    setCanRedo(nextIdx < history.current.length - 1)
  }, [])

  // ── Spread select: save current → load new ────────────────────────────────
  const handleSpreadSelect = useCallback(async (newSpread: number) => {
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (!lc || !rc) return

    // 1. Save current spread BEFORE changing the index.
    //    saveCurrentSpread reads currentSpreadRef, so it must still point to
    //    the old spread here.
    spreadsData.current[currentSpreadRef.current] = {
      left:  serializePage(lc, PAGE_W, PAGE_H),
      right: serializePage(rc, PAGE_W, PAGE_H),
    }
    // Capture thumbnail of the spread we're leaving
    captureThumbnail(currentSpreadRef.current)

    // 2. Advance the index BEFORE deserializing the new spread.
    //    deserializePage triggers Fabric object:added/removed events which call
    //    saveCurrentSpread(). If currentSpreadRef still points to the old spread
    //    at that point, those saves corrupt the old spread's data with
    //    in-progress content from the new one.
    currentSpreadRef.current = newSpread
    setCurrentSpread(newSpread)

    // 3. Restore the target spread, or clear if it has never been saved.
    //    isDeserializing suppresses saveCurrentSpread during restore so Fabric
    //    object:added/removed events don't overwrite spreadsData mid-load.
    const saved = spreadsData.current[newSpread]
    isDeserializing.current = true
    try {
      if (saved) {
        await deserializePage(lc, saved.left,  PAGE_W, PAGE_H)
        await deserializePage(rc, saved.right, PAGE_W, PAGE_H)
        syncMirrorsRef.current?.()
      } else {
        lc.remove(...lc.getObjects())
        rc.remove(...rc.getObjects())
        lc.backgroundColor = '#ffffff'
        rc.backgroundColor = '#ffffff'
        lc.backgroundImage = undefined
        rc.backgroundImage = undefined
        lc.renderAll()
        rc.renderAll()
      }
    } finally {
      isDeserializing.current = false
    }

    // Reset undo history for this spread
    history.current      = []
    historyIndex.current = -1
    setCanUndo(false)
    setCanRedo(false)
    pushHistory()

    // Sync background swatch to the newly loaded active page
    const activeFc = activePageRef.current === 'right' ? fabricRight.current : fabricLeft.current
    if (activeFc) setActivePageBg((activeFc.backgroundColor as string) || '#FFFFFF')
  }, [pushHistory, captureThumbnail])

  // ── Add spread ─────────────────────────────────────────────────────────────
  const handleAddSpread = useCallback(() => {
    const oldLastIdx = totalContentSpreads + 2   // current last spread index
    const newLastIdx = totalContentSpreads + 3   // last spread index after adding

    // Move last spread's canvas data to the new last position
    const lastData = spreadsData.current[oldLastIdx]
    if (lastData) {
      spreadsData.current[newLastIdx] = lastData
      delete spreadsData.current[oldLastIdx]
    }

    // Move last spread's thumbnail to the new last position,
    // replacing the old last slot with a blank page
    setThumbnails((prev) => {
      const next = { ...prev }
      next[newLastIdx] = prev[oldLastIdx] ?? { left: logoThumbRef.current, right: noEditThumbRef.current }
      next[oldLastIdx] = { left: blankThumbRef.current, right: blankThumbRef.current }
      return next
    })

    setTotalContentSpreads((n) => n + 1)
  }, [totalContentSpreads])

  // ── Delete spread ──────────────────────────────────────────────────────────
  const handleDeleteSpread = useCallback(async (spreadIndex: number) => {
    if (totalContentSpreads <= 13) return

    // Shift in-memory entries: everything after spreadIndex moves down by 1
    const lastIndex = totalContentSpreads + 2
    for (let j = spreadIndex; j <= lastIndex; j++) {
      const next = spreadsData.current[j + 1]
      if (next) spreadsData.current[j] = next
      else      delete spreadsData.current[j]
    }

    // Shift thumbnails the same way so the last-spread thumbnail follows
    setThumbnails((prev) => {
      const next = { ...prev }
      for (let j = spreadIndex; j <= lastIndex; j++) {
        if (prev[j + 1]) next[j] = prev[j + 1]
        else             delete next[j]
      }
      return next
    })

    const newTotal  = totalContentSpreads - 1
    const maxSpread = newTotal + 2

    let target = currentSpreadRef.current
    if (target > maxSpread)                       target = maxSpread
    else if (target >= spreadIndex && target > 0) target = target - 1

    setTotalContentSpreads(newTotal)
    await handleSpreadSelect(target)
  }, [totalContentSpreads, handleSpreadSelect])

  // ── Layout drop on PageStrip spread (always applies to left page) ─────────
  const handleLayoutDrop = useCallback(async (spreadIndex: number, layoutId: string) => {
    await handleSpreadSelect(spreadIndex)
    const layout = LAYOUTS.find((l) => l.id === layoutId)
    const lc = fabricLeft.current
    if (!layout || !lc) return
    setSelectedLayoutId(layoutId)
    applyLayout(lc, layout, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [handleSpreadSelect, saveCurrentSpread])

  // ── Auto-crear ────────────────────────────────────────────────────────────
  const handleAutoCreate = useCallback(async () => {
    const allPhotos = photosRef.current
    if (allPhotos.length === 0) return

    // Editable pages: spread-1 right, then spreads 2…totalContentSpreads+1 both sides
    const available: Array<{ spreadIndex: number; side: 'left' | 'right' }> = []

    const pageHasPhoto = (page: PageData | undefined) => page?.objects !== undefined
      ? page.objects.some((o) => o.kind === 'photo')
      : page?.frames?.some((f) => !f.isEmpty) ?? false

    const s1rFilled = pageHasPhoto(spreadsData.current[1]?.right)
    if (!s1rFilled) available.push({ spreadIndex: 1, side: 'right' })

    for (let si = 2; si <= totalContentSpreads + 1; si++) {
      const saved = spreadsData.current[si]
      if (!pageHasPhoto(saved?.left))  available.push({ spreadIndex: si, side: 'left'  })
      if (!pageHasPhoto(saved?.right)) available.push({ spreadIndex: si, side: 'right' })
    }

    if (available.length === 0) return

    const total = allPhotos.length
    const pages = available.length
    const base  = Math.floor(total / pages)
    const extra = total % pages

    const blankPage = (): PageData => ({ background: '#FFFFFF', pageW: PAGE_W, pageH: PAGE_H, objects: [] })

    let photoIdx = 0

    for (let i = 0; i < available.length; i++) {
      if (photoIdx >= total) break

      const count = Math.min(5, Math.max(1, i < extra ? base + 1 : base))
      const { spreadIndex, side } = available[i]

      const matching = LAYOUTS.filter((l) => l.photoCount === count)
      if (matching.length === 0) continue
      const layout = count === 1
        ? (LAYOUTS.find((l) => l.id === 'layout_1_3') ?? matching[0])
        : count === 2
        ? (LAYOUTS.find((l) => l.id === 'layout_2_4') ?? matching[0])
        : count === 3
          ? (LAYOUTS.find((l) => l.id === 'layout_3_1') ?? matching[0])
          : count === 4
          ? (LAYOUTS.find((l) => l.id === 'layout_4_1') ?? matching[0])
          : matching[Math.floor(Math.random() * matching.length)]

      // Collect the batch for this page
      const batch: PhotoAssignment[] = []
      for (let fi = 0; fi < layout.frames.length && photoIdx < total; fi++, photoIdx++) {
        const p = allPhotos[photoIdx]
        batch.push({ src: p.src, naturalW: p.width, naturalH: p.height })
      }

      // Reorder batch to match frame orientations (landscape ↔ landscape, portrait ↔ portrait)
      const lPool = batch.filter((a) => a.naturalW >= a.naturalH)
      const pPool = batch.filter((a) => a.naturalW  < a.naturalH)
      const assignments: PhotoAssignment[] = layout.frames.map((f) => {
        const frameIsLandscape = (f.w * PAGE_W) >= (f.h * PAGE_H)
        if (frameIsLandscape && lPool.length > 0)  return lPool.shift()!
        if (!frameIsLandscape && pPool.length > 0) return pPool.shift()!
        return (lPool.shift() ?? pPool.shift())!
      }).filter(Boolean) as PhotoAssignment[]

      const pageData  = buildPageFromLayout(layout, assignments, PAGE_W, PAGE_H)
      const otherSide = side === 'left' ? 'right' : 'left'
      const existing  = spreadsData.current[spreadIndex]

      spreadsData.current[spreadIndex] = {
        [side]:      pageData,
        [otherSide]: existing?.[otherSide] ?? blankPage(),
      } as SpreadSnapshot
    }

    recomputeUsedPhotos()
    await handleSpreadSelect(1)

    // After handleSpreadSelect resolves the canvases are fully loaded — capture
    // spread 1 directly, then render all other spreads from their saved PageData.
    captureThumbnail(currentSpreadRef.current)
    regenerateThumbnails(currentSpreadRef.current, totalContentSpreads + 3)
  }, [totalContentSpreads, recomputeUsedPhotos, handleSpreadSelect, captureThumbnail, regenerateThumbnails])

  // ── Zoom ───────────────────────────────────────────────────────────────────
  const handleZoomChange = useCallback((z: number) => setZoom(z), [])

  // ── Ruler ──────────────────────────────────────────────────────────────────
  const handleToggleRuler  = useCallback(() => setRulerMode((v) => !v), [])
  const handleGuidesChange = useCallback((g: Guide[]) => setGuides(g), [])

  // ── Grid ───────────────────────────────────────────────────────────────────
  const handleToggleGrid         = useCallback(() => setShowGrid((v) => !v), [])
  const handleGridSettingsChange = useCallback((s: GridSettings) => setGridSettings(s), [])

  // ── Viewport pan mode ─────────────────────────────────────────────────────

  // ── Frame draw tool ────────────────────────────────────────────────────────
  const handleFrameToolToggle = useCallback(() => {
    setFrameTool((v) => !v)
  }, [])
  const handleFrameToolDeactivate = useCallback(() => setFrameTool(false), [])

  // ── Add texture as free image on active page ──────────────────────────────
  const handleAddTexture = useCallback(async (url: string) => {
    const fc = getActiveFabric()
    if (!fc) return
    await dropTextureOnPage(fc, url, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add sticker (small, centered) on active page ──────────────────────────
  const handleAddSticker = useCallback(async (url: string) => {
    const fc = getActiveFabric()
    if (!fc) return
    await dropStickerOnPage(fc, url, PAGE_W, PAGE_H)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Page background color ─────────────────────────────────────────────────
  const handlePageBgChange = useCallback((color: string) => {
    const fc = getActiveFabric()
    if (!fc) return
    fc.backgroundColor = color
    fc.backgroundImage = undefined
    fc.renderAll()
    setActivePageBg(color)
    saveCurrentSpread()
  }, [saveCurrentSpread]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Apply background to all pages ─────────────────────────────────────────
  const handleApplyBgToAll = useCallback(() => {
    const color = activePageBg
    const blankPage = (): PageData => ({ background: color, pageW: PAGE_W, pageH: PAGE_H, objects: [] })

    // Cover every spread — visited ones get their content preserved, unvisited
    // ones get a minimal entry so deserializePage will apply the color on first load.
    for (let i = 0; i < totalSpreads; i++) {
      const snap = spreadsData.current[i]
      if (snap) {
        spreadsData.current[i] = {
          left:  { ...snap.left,  background: color, backgroundImage: undefined },
          right: { ...snap.right, background: color, backgroundImage: undefined },
        }
      } else {
        spreadsData.current[i] = { left: blankPage(), right: blankPage() }
      }
    }

    // Apply live to the two visible canvases
    const lc = fabricLeft.current
    const rc = fabricRight.current
    if (lc) { lc.backgroundColor = color; lc.backgroundImage = undefined; lc.renderAll() }
    if (rc) { rc.backgroundColor = color; rc.backgroundImage = undefined; rc.renderAll() }
    saveCurrentSpread()

    // Regenerate thumbnails so the page strip reflects the new color immediately.
    captureThumbnail(currentSpreadRef.current)
    regenerateThumbnails(currentSpreadRef.current, totalSpreads)
  }, [activePageBg, totalSpreads, saveCurrentSpread, captureThumbnail, regenerateThumbnails])

  // ── Object selected (future: show properties) ─────────────────────────────
  const handleObjectSelected = useCallback((_obj: fabric.FabricObject | null) => {
    // futuro: mostrar propiedades en toolbar
  }, [])

  // ── View mode toggle ──────────────────────────────────────────────────────
  const handleViewModeChange = useCallback((mode: 'editor' | 'spreads') => {
    if (mode === 'spreads') saveCurrentSpread()
    setViewMode(mode)
  }, [saveCurrentSpread])

  // ── Reorder spreads (drag & drop in SpreadsView) ─────────────────────────
  const handleReorderSpreads = useCallback((fromIndex: number, toIndex: number) => {
    // Save current canvas state first
    saveCurrentSpread()

    // Build new index order by moving fromIndex to toIndex
    const order = Array.from({ length: totalSpreads }, (_, i) => i)
    order.splice(toIndex, 0, order.splice(fromIndex, 1)[0])

    // Remap spreadsData
    const oldData = { ...spreadsData.current }
    const newData: Record<number, SpreadSnapshot> = {}
    order.forEach((oldIdx, newIdx) => {
      if (oldData[oldIdx]) newData[newIdx] = oldData[oldIdx]
    })
    spreadsData.current = newData

    // Remap thumbnails
    setThumbnails((prev) => {
      const next: Record<number, { left: string; right: string }> = {}
      order.forEach((oldIdx, newIdx) => {
        if (prev[oldIdx]) next[newIdx] = prev[oldIdx]
      })
      return next
    })

    // Select the dragged spread (it always lands at toIndex after the move)
    currentSpreadRef.current = toIndex
    setCurrentSpread(toIndex)
  }, [totalSpreads, saveCurrentSpread])

  // Highlight a spread in the overview — just updates selection, no view switch
  const handleSpreadsViewSelect = useCallback((spreadIndex: number) => {
    currentSpreadRef.current = spreadIndex
    setCurrentSpread(spreadIndex)
  }, [])

  // ── Export JPG ─────────────────────────────────────────────────────────────
  const handleExportJpg = useCallback(async () => {
    setIsExporting(true)
    saveCurrentSpread()

    const zip = new JSZip()
    const projectName = 'zeika-libro'
    const folder = zip.folder(projectName)!

    const blankPage = (): PageData => ({
      background: '#FFFFFF', pageW: PAGE_W, pageH: PAGE_H, objects: [],
    })

    // Mirrors PageStrip's buildSpreads: skips "Inside" (spread 1 left) and "Outside" (last spread right)
    type PageExport = { spreadIndex: number; side: 'left' | 'right'; name: string }
    const pageExports: PageExport[] = []

    pageExports.push({ spreadIndex: 0, side: 'left',  name: 'contratapa' })
    pageExports.push({ spreadIndex: 0, side: 'right', name: 'tapa' })
    pageExports.push({ spreadIndex: 1, side: 'right', name: '01' })

    for (let si = 2; si <= totalContentSpreads + 1; si++) {
      const leftNum  = 2 * (si - 1)
      const rightNum = leftNum + 1
      pageExports.push({ spreadIndex: si, side: 'left',  name: String(leftNum).padStart(2, '0') })
      pageExports.push({ spreadIndex: si, side: 'right', name: String(rightNum).padStart(2, '0') })
    }

    const lastIdx     = totalContentSpreads + 2
    const lastLeftNum = totalContentSpreads * 2 + 2
    pageExports.push({ spreadIndex: lastIdx, side: 'left', name: String(lastLeftNum).padStart(2, '0') })

    for (const { spreadIndex, side, name } of pageExports) {
      const spread     = spreadsData.current[spreadIndex]
      const page       = spread?.[side] ?? blankPage()
      const otherSide  = side === 'left' ? 'right' : 'left'
      const adjData    = spread?.[otherSide]
      const adjacent   = adjData ? { data: adjData, fromSide: otherSide as 'left' | 'right' } : undefined
      const dataUrl    = await exportPageAsJpg(page, PAGE_W, PAGE_H, 3.125, adjacent)
      const base64     = dataUrl?.split(',')[1] ?? ''
      folder.file(`${name}.jpg`, base64, { base64: true })
    }

    const blob = await zip.generateAsync({ type: 'blob' })
    const link = document.createElement('a')
    link.download = `${projectName}.zip`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)

    setIsExporting(false)
  }, [saveCurrentSpread, totalContentSpreads])

  // ── Export PDF ─────────────────────────────────────────────────────────────
  const handleExportPdf = useCallback(async () => {
    setIsExporting(true)
    saveCurrentSpread()

    const blankPage = (): PageData => ({
      background: '#FFFFFF', pageW: PAGE_W, pageH: PAGE_H, objects: [],
    })

    const pageWidthMm  = 432
    const pageHeightMm = 280

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pageWidthMm, pageHeightMm],
    })

    for (let i = 0; i < totalSpreads; i++) {
      const spread = spreadsData.current[i]
      const leftData  = spread?.left  ?? blankPage()
      const rightData = spread?.right ?? blankPage()

      const leftUrl  = await exportPageAsJpg(leftData,  PAGE_W, PAGE_H, 1, { data: rightData, fromSide: 'right' })
      const rightUrl = await exportPageAsJpg(rightData, PAGE_W, PAGE_H, 1, { data: leftData,  fromSide: 'left'  })

      if (i > 0) pdf.addPage()
      pdf.addImage(leftUrl,  'JPEG', 0,                  0, pageWidthMm / 2, pageHeightMm)
      pdf.addImage(rightUrl, 'JPEG', pageWidthMm / 2,    0, pageWidthMm / 2, pageHeightMm)
    }

    pdf.save('zeika-libro.pdf')
    setIsExporting(false)
  }, [saveCurrentSpread, totalSpreads])

  // ── Preview ────────────────────────────────────────────────────────────────
  const handleOpenPreview = useCallback(() => {
    // Flush the current spread into spreadsData before snapshotting
    saveCurrentSpread()
    setPreviewSnapshot({ ...spreadsData.current })
    setPreviewOpen(true)
  }, [saveCurrentSpread])

  const handleClosePreview = useCallback(() => setPreviewOpen(false), [])

  // ── Share: save project to localStorage so the preview route can load it ──
  const handleShare = useCallback(() => {
    saveCurrentSpread()
    localStorage.setItem(
      `zeika_project_${projectId}`,
      JSON.stringify({ spreadsData: spreadsData.current, totalSpreads }),
    )
  }, [saveCurrentSpread, projectId, totalSpreads])

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <LanguageProvider>
    <>
    <div className="editor-root">
      <Topbar onPreview={handleOpenPreview} onExportJpg={handleExportJpg} onExportPdf={handleExportPdf} isExporting={isExporting} projectId={projectId} onShare={handleShare} onTourOpen={() => setTourOpen(true)} />

      <div className="editor-body">
        <PhotoPanel
          photos={photos}
          usedPhotoIds={usedPhotoIds}
          onUpload={handlePhotoUpload}
          onPhotoClick={handlePhotoClick}
          onDelete={handlePhotoDelete}
          onAutoCreate={handleAutoCreate}
        />

        <div className="editor-center">
          <Toolbar
            canUndo={canUndo}
            canRedo={canRedo}
            rulerMode={rulerMode}
            frameTool={frameTool}
            viewMode={viewMode}
            pageBackground={activePageBg}
            showGrid={showGrid}
            gridSettings={gridSettings}
            onUndo={handleUndo}
            onRedo={handleRedo}
            onToggleRuler={handleToggleRuler}
            onAddText={handleAddText}
            onFrameToolToggle={handleFrameToolToggle}
            onViewModeChange={handleViewModeChange}
            onPageBgChange={handlePageBgChange}
            onApplyBgToAll={handleApplyBgToAll}
            onToggleGrid={handleToggleGrid}
            onGridSettingsChange={handleGridSettingsChange}
            onAddShape={handleAddShape}
          />

          {viewMode === 'spreads' ? (
            <SpreadsView
              thumbnails={thumbnails}
              totalSpreads={totalSpreads}
              currentSpread={currentSpread}
              onSpreadSelect={handleSpreadsViewSelect}
              onReorderSpreads={handleReorderSpreads}
            />
          ) : (
            <>
              <Canvas
                zoom={zoom}
                showGrid={showGrid}
                rulerMode={rulerMode}
                guides={guides}
                onGuidesChange={handleGuidesChange}
                gridSettings={gridSettings}
                currentSpread={currentSpread}
                totalSpreads={totalSpreads}
                viewMode={viewMode}
                frameTool={frameTool}
                onObjectSelected={handleObjectSelected}
                onCanvasReady={handleCanvasReady}
                onSpreadChange={handleSpreadSelect}
                onZoomChange={handleZoomChange}
                onActivePageChange={handleActivePageChange}
                onLayoutDropOnPage={handleLayoutDropOnPage}
                onPhotoDrop={handlePhotoDrop}
                onTextEdit={handleTextEdit}
                onFrameToolDeactivate={handleFrameToolDeactivate}
                onUndo={handleUndo}
                onRedo={handleRedo}
              />

              <PageStrip
                currentSpread={currentSpread}
                totalContentSpreads={totalContentSpreads}
                onSpreadSelect={handleSpreadSelect}
                onAddSpread={handleAddSpread}
                onDeleteSpread={handleDeleteSpread}
                onLayoutDrop={handleLayoutDrop}
                thumbnails={thumbnails}
              />
            </>
          )}
        </div>

        <LayoutPanel
          selectedPhotoCount={selectedPhotoCount}
          selectedLayoutId={selectedLayoutId}
          onPhotoCountChange={setSelectedPhotoCount}
          onLayoutSelect={handleLayoutSelect}
          onAddTexture={handleAddTexture}
          onAddSticker={handleAddSticker}
        />
      </div>
    </div>

    {previewOpen && (
      <PreviewModal
        spreadsData={previewSnapshot}
        totalSpreads={totalSpreads}
        initialSpread={currentSpread}
        onClose={handleClosePreview}
      />
    )}

    <OnboardingTour open={tourOpen} onClose={() => setTourOpen(false)} />

    {textModal && (
      <TextModal
        initialText={textModal.textbox.text ?? ''}
        initialFont={textModal.textbox.fontFamily ?? 'amandine'}
        initialBold={textModal.textbox.fontWeight === 'bold'}
        initialUnderline={textModal.textbox.underline ?? false}
        initialAlign={textModal.textbox.textAlign ?? 'left'}
        initialSize={textModal.textbox.fontSize ?? 24}
        initialColor={(textModal.textbox.fill as string) ?? '#191919'}
        initialLineHeight={textModal.textbox.lineHeight ?? 1.16}
        initialCharSpacing={textModal.textbox.charSpacing ?? 0}
        onConfirm={handleTextConfirm}
        onCancel={handleTextCancel}
      />
    )}
    </>
    </LanguageProvider>
  )
}
