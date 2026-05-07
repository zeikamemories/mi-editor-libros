'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import * as fabric from 'fabric'
import { X, AlignStartVertical, AlignCenterVertical, AlignEndVertical, AlignVerticalJustifyStart, AlignCenterHorizontal, AlignVerticalJustifyEnd, AlignVerticalSpaceAround, AlignHorizontalSpaceAround } from 'lucide-react'
import { BOOK_SIZE } from '../../config/bookSize'
import { dropPhotoOnFrame, dropPhotoFree, dropTextureOnPage, dropStickerOnPage, findFrameAtPoint, findPhotoAtPoint, replacePhotoInFrame, restoreEmptyFrame, createFrameAtPx, makeClipRect } from './fabricHelpers'
import { useLang } from '../../context/LanguageContext'
import './Canvas.css'

const PAGE_W = BOOK_SIZE.widthPx   // 816
const PAGE_H = BOOK_SIZE.heightPx  // 1058
const BLEED  = BOOK_SIZE.bleedPx   // 11

// Unscaled full spread dimensions (page nums + canvases + nav, no rulers)
const PAGE_NUM = 32
const NAV      = 72
const SPINE    = 1

const SPREAD_W = PAGE_W + SPINE + PAGE_W   // 1633
const SPREAD_H = PAGE_NUM + PAGE_H + NAV   // 1162

const ZOOM_MIN = 0.1
const ZOOM_MAX = 5.0
const SCROLL_PAD = 400


interface CanvasProps {
  zoom: number
  showGrid: boolean
  gridSettings: GridSettings
  rulerMode: boolean
  guides: Guide[]
  onGuidesChange: (guides: Guide[]) => void
  currentSpread: number
  totalSpreads: number
  viewMode: 'editor' | 'spreads'
  frameTool: boolean
  onObjectSelected: (obj: fabric.FabricObject | null) => void
  onCanvasReady: (left: fabric.Canvas, right: fabric.Canvas, syncMirrors: () => void) => void
  onSpreadChange: (spread: number) => void
  onZoomChange: (zoom: number) => void
  onActivePageChange: (page: 'left' | 'right') => void
  onLayoutDropOnPage: (layoutId: string, page: 'left' | 'right') => void
  onPhotoDrop: (photoId: string) => void
  onTextEdit?: (textbox: fabric.Textbox, side: 'left' | 'right') => void
  onFrameToolDeactivate: () => void
  onUndo?: () => void
  onRedo?: () => void
}

function spreadLabel(spread: number, totalSpreads: number, back: string, cover: string): { left: string; right: string } {
  if (spread === 0) return { left: back, right: cover }
  if (spread === 1) return { left: 'Inside', right: '01' }
  if (spread === totalSpreads - 1) {
    const lastLeft = String((totalSpreads - 3) * 2 + 2).padStart(2, '0')
    return { left: lastLeft, right: 'Outside' }
  }
  const leftNum  = 2 * (spread - 1)
  const rightNum = leftNum + 1
  return { left: String(leftNum).padStart(2, '0'), right: String(rightNum).padStart(2, '0') }
}

export interface GridSettings {
  cols: number
  rows: number
  color: string
  opacity: number
  thickness: 'thin' | 'normal'
}

function GridOverlay({ settings }: { settings: GridSettings }) {
  const { cols, rows, color, opacity, thickness } = settings
  const sw  = thickness === 'thin' ? 0.6 : 1.2
  const gap = 5
  const vLines = Array.from({ length: cols - 1 }, (_, i) => (PAGE_W / cols) * (i + 1))
  const hLines = Array.from({ length: rows - 1 }, (_, i) => (PAGE_H / rows) * (i + 1))
  return (
    <svg
      style={{ position: 'absolute', top: 0, left: 0, width: PAGE_W, height: PAGE_H, pointerEvents: 'none', opacity: opacity / 100 }}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      aria-hidden="true"
    >
      {vLines.map((x) => (
        <g key={x}>
          <line x1={x - gap / 2} y1={0} x2={x - gap / 2} y2={PAGE_H} stroke={color} strokeWidth={sw} />
          <line x1={x + gap / 2} y1={0} x2={x + gap / 2} y2={PAGE_H} stroke={color} strokeWidth={sw} />
        </g>
      ))}
      {hLines.map((y) => (
        <g key={y}>
          <line x1={0} y1={y - gap / 2} x2={PAGE_W} y2={y - gap / 2} stroke={color} strokeWidth={sw} />
          <line x1={0} y1={y + gap / 2} x2={PAGE_W} y2={y + gap / 2} stroke={color} strokeWidth={sw} />
        </g>
      ))}
    </svg>
  )
}

export interface Guide { id: string; type: 'h' | 'v'; pos: number }

const CM_PX     = 37.8
const RULER_SIZE = 22
let _gseq = 0

type DragState =
  | { mode: 'create-h' | 'create-v'; pos: number }
  | { mode: 'move'; id: string; guideType: 'h' | 'v'; pos: number; startPos: number }

// Guide lines only — no ruler bars
function GuidesOverlay({
  pageW, pageH, zoom, guides, onGuidesChange, pageWrapRef,
}: {
  pageW: number; pageH: number; zoom: number
  guides: Guide[]; onGuidesChange: (g: Guide[]) => void
  pageWrapRef: React.RefObject<HTMLDivElement | null>
}) {
  const zoomRef   = useRef(zoom);            zoomRef.current = zoom
  const guidesRef = useRef(guides);          guidesRef.current = guides
  const changeRef = useRef(onGuidesChange);  changeRef.current = onGuidesChange
  const dragRef   = useRef<DragState | null>(null)
  const [, tick]  = useState(0)
  const redraw    = () => tick(n => n + 1)

  const toPage = (cx: number, cy: number) => {
    const r = pageWrapRef.current?.getBoundingClientRect()
    if (!r) return { x: 0, y: 0 }
    return { x: (cx - r.left) / zoomRef.current, y: (cy - r.top) / zoomRef.current }
  }

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      const { x, y } = toPage(e.clientX, e.clientY)
      if (d.mode === 'move') {
        dragRef.current = { ...d, pos: d.guideType === 'h' ? y : x }
      } else {
        dragRef.current = { mode: d.mode, pos: d.mode === 'create-h' ? y : x }
      }
      redraw()
    }
    const onUp = (e: MouseEvent) => {
      const d = dragRef.current; if (!d) return
      const { x, y } = toPage(e.clientX, e.clientY)
      dragRef.current = null; redraw()
      if (d.mode === 'move') {
        const isH      = d.guideType === 'h'
        const finalPos = isH ? y : x
        const clicked  = Math.abs(finalPos - d.startPos) < 4
        const offPage  = isH ? (y < 0 || y > pageH) : (x < 0 || x > pageW)
        if (clicked || offPage) {
          changeRef.current(guidesRef.current.filter(g => g.id !== d.id))
        } else {
          changeRef.current(guidesRef.current.map(g => g.id === d.id ? { ...g, pos: finalPos } : g))
        }
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [pageW, pageH])

  const drag          = dragRef.current
  const displayGuides = drag?.mode === 'move' ? guides.filter(g => g.id !== drag.id) : guides
  const preview = drag?.mode === 'move' ? {
    type: drag.guideType,
    pos:  drag.pos,
  } : null

  return (
    <svg
      className="canvas-guides-overlay"
      style={{ width: pageW, height: pageH }}
      viewBox={`0 0 ${pageW} ${pageH}`}
      aria-hidden="true"
    >
      {displayGuides.map(g => {
        const x1 = g.type === 'v' ? g.pos : 0
        const y1 = g.type === 'h' ? g.pos : 0
        const x2 = g.type === 'v' ? g.pos : pageW
        const y2 = g.type === 'h' ? g.pos : pageH
        return (
          <g key={g.id} style={{ cursor: 'crosshair' }}
            onMouseDown={e => { e.preventDefault(); e.stopPropagation()
              dragRef.current = { mode: 'move', id: g.id, guideType: g.type, pos: g.pos, startPos: g.pos }; redraw() }}
          >
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={10} style={{ pointerEvents: 'stroke' }} />
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00C073" strokeWidth={0.8} style={{ pointerEvents: 'none' }} />
          </g>
        )
      })}
      {preview && (() => {
        const x1 = preview.type === 'v' ? preview.pos : 0
        const y1 = preview.type === 'h' ? preview.pos : 0
        const x2 = preview.type === 'v' ? preview.pos : pageW
        const y2 = preview.type === 'h' ? preview.pos : pageH
        return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00C073" strokeWidth={0.8} strokeDasharray="5 3" style={{ pointerEvents: 'none' }} />
      })()}
    </svg>
  )
}

// Viewport-level rulers — sit fixed at top and left edges of canvas-outer
function ViewportRulers({
  zoom, innerRef, guides, onGuidesChange,
}: {
  zoom: number
  innerRef: React.RefObject<HTMLDivElement | null>
  guides: Guide[]
  onGuidesChange: (guides: Guide[]) => void
}) {
  const hRef       = useRef<HTMLCanvasElement>(null)
  const vRef       = useRef<HTMLCanvasElement>(null)
  const previewHRef = useRef<HTMLDivElement>(null)
  const previewVRef = useRef<HTMLDivElement>(null)
  const zoomRef    = useRef(zoom);    zoomRef.current = zoom
  const guidesRef  = useRef(guides);  guidesRef.current = guides
  const changeRef  = useRef(onGuidesChange); changeRef.current = onGuidesChange

  type RulerDrag = { type: 'h' | 'v'; pos: number }
  const rulerDragRef = useRef<RulerDrag | null>(null)

  // Convert client XY → page pixel coordinates using inner scroll state
  const toPageCoord = useCallback((clientX: number, clientY: number) => {
    const inner = innerRef.current
    if (!inner) return { x: 0, y: 0 }
    const r = inner.getBoundingClientRect()
    const z = zoomRef.current
    return {
      x: (clientX - r.left + inner.scrollLeft - SCROLL_PAD) / z,
      y: (clientY - r.top  + inner.scrollTop  - SCROLL_PAD) / z,
    }
  }, [innerRef])

  // Move preview lines via direct DOM — no React re-render during drag
  const showPreview = useCallback((type: 'h' | 'v', pos: number) => {
    const inner = innerRef.current
    if (!inner) return
    const z = zoomRef.current
    if (type === 'h') {
      const el = previewHRef.current
      if (!el) return
      el.style.top     = (pos * z + SCROLL_PAD - inner.scrollTop + RULER_SIZE) + 'px'
      el.style.display = 'block'
    } else {
      const el = previewVRef.current
      if (!el) return
      el.style.left    = (pos * z + SCROLL_PAD - inner.scrollLeft + RULER_SIZE) + 'px'
      el.style.display = 'block'
    }
  }, [innerRef])

  const hidePreview = useCallback(() => {
    if (previewHRef.current) previewHRef.current.style.display = 'none'
    if (previewVRef.current) previewVRef.current.style.display = 'none'
  }, [])

  // Document-level tracking during ruler drag
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const drag = rulerDragRef.current
      if (!drag) return
      const { x, y } = toPageCoord(e.clientX, e.clientY)
      const pos = drag.type === 'h' ? y : x
      rulerDragRef.current = { ...drag, pos }
      showPreview(drag.type, pos)
    }
    const onUp = (e: MouseEvent) => {
      const drag = rulerDragRef.current
      if (!drag) return
      const { x, y } = toPageCoord(e.clientX, e.clientY)
      const pos = drag.type === 'h' ? y : x
      rulerDragRef.current = null
      hidePreview()
      if (pos >= 0) {
        changeRef.current([...guidesRef.current, { id: `g${++_gseq}`, type: drag.type, pos }])
      }
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [toPageCoord, showPreview, hidePreview])

  // Mousedown on each ruler canvas starts a guide drag
  useEffect(() => {
    const hc = hRef.current
    const vc = vRef.current
    if (!hc || !vc) return
    const onHDown = (e: MouseEvent) => {
      e.preventDefault()
      const { y } = toPageCoord(e.clientX, e.clientY)
      rulerDragRef.current = { type: 'h', pos: y }
      showPreview('h', y)
    }
    const onVDown = (e: MouseEvent) => {
      e.preventDefault()
      const { x } = toPageCoord(e.clientX, e.clientY)
      rulerDragRef.current = { type: 'v', pos: x }
      showPreview('v', x)
    }
    hc.addEventListener('mousedown', onHDown)
    vc.addEventListener('mousedown', onVDown)
    return () => {
      hc.removeEventListener('mousedown', onHDown)
      vc.removeEventListener('mousedown', onVDown)
    }
  }, [toPageCoord, showPreview])

  const draw = useCallback(() => {
    const inner = innerRef.current
    const hc    = hRef.current
    const vc    = vRef.current
    if (!inner || !hc || !vc) return

    const { scrollLeft, scrollTop, clientWidth, clientHeight } = inner
    const z   = zoomRef.current
    const CM  = CM_PX * z
    const dpr = window.devicePixelRatio || 1

    // ── Horizontal ruler — full width of canvas-inner ──────────
    // clientWidth is already the inner width (outer minus 22px left offset)
    const hw = clientWidth
    const hh = RULER_SIZE
    const hwPx = Math.round(hw * dpr)
    const hhPx = Math.round(hh * dpr)
    if (hc.width !== hwPx || hc.height !== hhPx) {
      hc.width  = hwPx; hc.height = hhPx
      hc.style.width = hw + 'px'; hc.style.height = hh + 'px'
    }
    const hCtx = hc.getContext('2d')!
    hCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    hCtx.fillStyle = '#F0F0F0'
    hCtx.fillRect(0, 0, hw, hh)
    hCtx.strokeStyle = '#C8C8C8'
    hCtx.lineWidth   = 0.5
    hCtx.beginPath(); hCtx.moveTo(0, hh - 0.5); hCtx.lineTo(hw, hh - 0.5); hCtx.stroke()

    const originX = SCROLL_PAD - scrollLeft
    const startI  = Math.floor(-originX / CM) - 1
    const endI    = Math.ceil((hw - originX) / CM) + 1

    // Minor ticks — every 1cm, no label
    hCtx.strokeStyle = '#CACACA'
    hCtx.lineWidth   = 0.6
    for (let i = startI; i <= endI; i++) {
      if (i % 5 === 0) continue
      const x = originX + i * CM
      if (x < 0 || x > hw) continue
      hCtx.beginPath(); hCtx.moveTo(x, hh - 4); hCtx.lineTo(x, hh); hCtx.stroke()
    }

    // Major ticks — every 5cm, with label
    hCtx.strokeStyle  = '#888'
    hCtx.lineWidth    = 0.8
    hCtx.fillStyle    = '#555'
    hCtx.font         = '10px Arial, sans-serif'
    hCtx.textBaseline = 'top'
    hCtx.textAlign    = 'left'
    for (let i = startI; i <= endI; i++) {
      if (i % 5 !== 0) continue
      const x = originX + i * CM
      if (x < 0 || x > hw) continue
      hCtx.beginPath(); hCtx.moveTo(x, hh - 8); hCtx.lineTo(x, hh); hCtx.stroke()
      if (i !== 0 && x > 4 && x < hw - 16) hCtx.fillText(String(i), x + 2, 2)
    }

    // ── Vertical ruler — full height of canvas-inner ───────────
    const vw = RULER_SIZE
    const vh = clientHeight
    const vwPx = Math.round(vw * dpr)
    const vhPx = Math.round(vh * dpr)
    if (vc.width !== vwPx || vc.height !== vhPx) {
      vc.width  = vwPx; vc.height = vhPx
      vc.style.width = vw + 'px'; vc.style.height = vh + 'px'
    }
    const vCtx = vc.getContext('2d')!
    vCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
    vCtx.fillStyle = '#F0F0F0'
    vCtx.fillRect(0, 0, vw, vh)
    vCtx.strokeStyle = '#C8C8C8'
    vCtx.lineWidth   = 0.5
    vCtx.beginPath(); vCtx.moveTo(vw - 0.5, 0); vCtx.lineTo(vw - 0.5, vh); vCtx.stroke()

    const originY = SCROLL_PAD - scrollTop
    const startJ  = Math.floor(-originY / CM) - 1
    const endJ    = Math.ceil((vh - originY) / CM) + 1

    // Minor ticks — every 1cm, no label
    vCtx.strokeStyle = '#CACACA'
    vCtx.lineWidth   = 0.6
    for (let j = startJ; j <= endJ; j++) {
      if (j % 5 === 0) continue
      const y = originY + j * CM
      if (y < 0 || y > vh) continue
      vCtx.beginPath(); vCtx.moveTo(vw - 4, y); vCtx.lineTo(vw, y); vCtx.stroke()
    }

    // Major ticks — every 5cm, with label
    vCtx.strokeStyle  = '#888'
    vCtx.lineWidth    = 0.8
    vCtx.fillStyle    = '#555'
    vCtx.font         = '10px Arial, sans-serif'
    vCtx.textBaseline = 'middle'
    vCtx.textAlign    = 'right'
    for (let j = startJ; j <= endJ; j++) {
      if (j % 5 !== 0) continue
      const y = originY + j * CM
      if (y < 0 || y > vh) continue
      vCtx.beginPath(); vCtx.moveTo(vw - 8, y); vCtx.lineTo(vw, y); vCtx.stroke()
      if (j !== 0 && y > 8 && y < vh - 4) {
        vCtx.save()
        vCtx.translate(vw - 10, y)
        vCtx.rotate(-Math.PI / 2)
        vCtx.fillText(String(j), 0, 0)
        vCtx.restore()
      }
    }
  }, [innerRef])

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    inner.addEventListener('scroll', draw, { passive: true })
    requestAnimationFrame(draw)
    return () => inner.removeEventListener('scroll', draw)
  }, [draw, innerRef])

  useEffect(() => { requestAnimationFrame(draw) }, [zoom, draw])

  useEffect(() => {
    const onResize = () => requestAnimationFrame(draw)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [draw])

  return (
    <>
      <div className="canvas-ruler-corner" />
      <canvas ref={hRef} className="canvas-ruler-h" style={{ cursor: 's-resize' }} />
      <canvas ref={vRef} className="canvas-ruler-v" style={{ cursor: 'e-resize' }} />
      <div ref={previewHRef} className="canvas-ruler-preview-h" />
      <div ref={previewVRef} className="canvas-ruler-preview-v" />
    </>
  )
}

function BleedOverlay() {
  return (
    <svg
      className="canvas-bleed-overlay"
      width={PAGE_W}
      height={PAGE_H}
      viewBox={`0 0 ${PAGE_W} ${PAGE_H}`}
      aria-hidden="true"
    >
      <rect
        x={BLEED} y={BLEED}
        width={PAGE_W - BLEED * 2}
        height={PAGE_H - BLEED * 2}
        fill="none"
        stroke="#528ED6"
        strokeWidth={1}
        strokeDasharray="5 5"
      />
    </svg>
  )
}

export default function Canvas({
  zoom,
  showGrid,
  gridSettings,
  rulerMode,
  guides,
  onGuidesChange,
  currentSpread,
  totalSpreads,
  viewMode,
  frameTool,
  onObjectSelected,
  onCanvasReady,
  onSpreadChange,
  onZoomChange,
  onActivePageChange,
  onLayoutDropOnPage,
  onPhotoDrop,
  onTextEdit,
  onFrameToolDeactivate,
  onUndo,
  onRedo,
}: CanvasProps) {
  const leftElRef   = useRef<HTMLCanvasElement>(null)
  const rightElRef  = useRef<HTMLCanvasElement>(null)
  const leftFabric  = useRef<fabric.Canvas | null>(null)
  const rightFabric = useRef<fabric.Canvas | null>(null)
  const outerRef        = useRef<HTMLDivElement>(null)
  const innerRef        = useRef<HTMLDivElement>(null)
  const spreadRootRef   = useRef<HTMLDivElement>(null)
  const scaleAnchorRef  = useRef<HTMLDivElement>(null)
  const leftPageWrapRef  = useRef<HTMLDivElement>(null)
  const rightPageWrapRef = useRef<HTMLDivElement>(null)
  const badgeTextRef    = useRef<HTMLSpanElement>(null)
  const zoomDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Viewport pan state ───────────────────────────────────────────────────
  const [spacebarPan,   setSpacebarPan]   = useState(false)
  const isVPDragging    = useRef(false)
  const vpDragStart     = useRef({ x: 0, y: 0, sl: 0, st: 0 })
  const vpOverlayRef    = useRef<HTMLDivElement>(null)
  const isTextEditingRef = useRef(false)

  const { t } = useLang()

  // ── Active page + drag-over visual state ─────────────────────────────────
  const [activePage,    setActivePage]    = useState<'left' | 'right'>('left')
  const [dragOverPage,  setDragOverPage]  = useState<'left' | 'right' | null>(null)
  const [panModeActive, setPanModeActive] = useState(false)

  // ── Selected textbox tracking (for delete button) ─────────────────────────
  type TextSel = { side: 'left' | 'right'; top: number; left: number; width: number } | null
  const [textSel,     setTextSel]     = useState<TextSel>(null)
  const [textEditing, setTextEditing] = useState(false)

  // ── Multi-selection alignment toolbar ──────────────────────────────────────
  type MultiSel = { side: 'left' | 'right'; selTop: number; selBottom: number; selLeft: number; selWidth: number } | null
  const [multiSel, setMultiSel]     = useState<MultiSel>(null)
  const suppressMultiSelRef = useRef(false)

  // ── Context menu ─────────────────────────────────────────────────────────
  type CtxMenu = { x: number; y: number; obj: fabric.FabricObject; fc: fabric.Canvas } | null
  const [ctxMenu, setCtxMenu] = useState<CtxMenu>(null)
  const ctxMenuRef = useRef<HTMLDivElement>(null)

  // ── Content-grabber (pan) state — refs avoid stale closure issues ────────
  const isPanMode             = useRef(false)
  const panTargetRef          = useRef<fabric.FabricImage | null>(null)
  const lastClickRef          = useRef<{ target: fabric.FabricObject; time: number } | null>(null)
  const panIndicatorRef       = useRef<fabric.Rect | null>(null)
  const panIndicatorCanvasRef = useRef<fabric.Canvas | null>(null)
  const panCloneRef           = useRef<fabric.FabricImage | null>(null)
  const panData               = useRef<{
    img:          fabric.FabricImage
    startPtr:     { x: number; y: number }
    startImgLeft: number
    startImgTop:  number
  } | null>(null)

  // ── Frame draw tool state ─────────────────────────────────────────────────
  const isFrameToolRef = useRef(false)
  const frameDrawRef   = useRef<{
    canvas:  fabric.Canvas
    startX:  number
    startY:  number
    preview: fabric.Rect
  } | null>(null)
  const onFrameToolDeactivateRef = useRef(onFrameToolDeactivate)

  // Mirror latest callbacks/values into refs so effects stay stable
  const onObjectSelectedRef   = useRef(onObjectSelected)
  const onCanvasReadyRef      = useRef(onCanvasReady)
  const onZoomChangeRef       = useRef(onZoomChange)
  const onActivePageChangeRef = useRef(onActivePageChange)
  const onLayoutDropOnPageRef = useRef(onLayoutDropOnPage)
  const onPhotoDropRef        = useRef(onPhotoDrop)
  const onTextEditRef         = useRef(onTextEdit)
  const onUndoRef             = useRef(onUndo)
  const onRedoRef             = useRef(onRedo)
  const zoomRef               = useRef(zoom)

  useEffect(() => { onObjectSelectedRef.current   = onObjectSelected   }, [onObjectSelected])
  useEffect(() => { onCanvasReadyRef.current       = onCanvasReady       }, [onCanvasReady])
  useEffect(() => { onZoomChangeRef.current        = onZoomChange        }, [onZoomChange])
  useEffect(() => { onActivePageChangeRef.current  = onActivePageChange  }, [onActivePageChange])
  useEffect(() => { onLayoutDropOnPageRef.current  = onLayoutDropOnPage  }, [onLayoutDropOnPage])
  useEffect(() => { onPhotoDropRef.current         = onPhotoDrop         }, [onPhotoDrop])
  useEffect(() => { onTextEditRef.current               = onTextEdit               }, [onTextEdit])
  useEffect(() => { onFrameToolDeactivateRef.current    = onFrameToolDeactivate    }, [onFrameToolDeactivate])
  useEffect(() => { onUndoRef.current               = onUndo               }, [onUndo])
  useEffect(() => { onRedoRef.current               = onRedo               }, [onRedo])
  useEffect(() => { zoomRef.current = zoom }, [zoom])
  useEffect(() => { isTextEditingRef.current = textEditing }, [textEditing])

  // ── Spacebar → temporary viewport pan ────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return
      if (isTextEditingRef.current) return
      const tag = (e.target as HTMLElement)?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      e.preventDefault()
      setSpacebarPan(true)
    }
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      setSpacebarPan(false)
      isVPDragging.current = false
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keyup',   onKeyUp)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keyup',   onKeyUp)
    }
  }, [])

  // ── Middle mouse button: viewport pan (hold to drag, like Figma) ──────────
  useEffect(() => {
    let active = false
    let sx = 0, sy = 0, ssl = 0, sst = 0

    const onDown = (e: MouseEvent) => {
      if (e.button !== 1) return
      if (!outerRef.current?.contains(e.target as Node)) return
      e.preventDefault()
      const inner = innerRef.current
      if (!inner) return
      active = true
      sx = e.clientX; sy = e.clientY
      ssl = inner.scrollLeft; sst = inner.scrollTop
      document.body.style.cursor = 'grabbing'
    }
    const onMove = (e: MouseEvent) => {
      if (!active) return
      const inner = innerRef.current
      if (!inner) return
      inner.scrollLeft = ssl - (e.clientX - sx)
      inner.scrollTop  = sst - (e.clientY - sy)
    }
    const onUp = (e: MouseEvent) => {
      if (e.button !== 1) return
      active = false
      document.body.style.cursor = ''
    }

    document.addEventListener('mousedown', onDown)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup',   onUp)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup',   onUp)
    }
  }, [])

  // ── Frame draw tool: crosshair cursor + block object selection ───────────
  useEffect(() => {
    isFrameToolRef.current = frameTool
    const lc = leftFabric.current
    const rc = rightFabric.current
    if (!lc || !rc) return
    ;[lc, rc].forEach(fc => {
      fc.defaultCursor  = frameTool ? 'crosshair' : 'default'
      fc.skipTargetFind = frameTool
      fc.renderAll()
    })
  }, [frameTool])

  // ── Viewport drag: move scroll while overlay is up ────────────────────────
  const isViewportPanning = spacebarPan
  useEffect(() => {
    if (!isViewportPanning) {
      isVPDragging.current = false
      return
    }
    const onMouseMove = (e: MouseEvent) => {
      if (!isVPDragging.current) return
      const inner = innerRef.current
      if (!inner) return
      const { x, y, sl, st } = vpDragStart.current
      inner.scrollLeft = sl - (e.clientX - x)
      inner.scrollTop  = st - (e.clientY - y)
    }
    const onMouseUp = () => {
      isVPDragging.current = false
      if (vpOverlayRef.current) vpOverlayRef.current.style.cursor = 'grab'
    }
    // Forward non-zoom wheel events to canvas-inner (overlay is a sibling, not an ancestor)
    const overlay = vpOverlayRef.current
    const onOverlayWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return  // let it bubble to outerRef for zoom
      e.preventDefault()
      const inner = innerRef.current
      if (inner) {
        inner.scrollLeft += e.deltaX
        inner.scrollTop  += e.deltaY
      }
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup',   onMouseUp)
    if (overlay) overlay.addEventListener('wheel', onOverlayWheel, { passive: false })
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup',   onMouseUp)
      if (overlay) overlay.removeEventListener('wheel', onOverlayWheel)
    }
  }, [isViewportPanning])

  // ── applyZoom: bypasses React state for smooth gesture zoom ──────────────
  const applyZoom = useCallback((newZoom: number, scrollTo?: { x: number; y: number }) => {
    const root   = spreadRootRef.current
    const anchor = scaleAnchorRef.current
    const inner  = innerRef.current
    if (!root || !anchor || !inner) return

    root.style.transform  = `scale(${newZoom})`
    anchor.style.width    = `${SPREAD_W * newZoom}px`
    anchor.style.height   = `${SPREAD_H * newZoom}px`
    if (badgeTextRef.current) badgeTextRef.current.textContent = `${Math.round(newZoom * 100)}%`

    if (scrollTo) {
      inner.scrollLeft = Math.max(0, scrollTo.x)
      inner.scrollTop  = Math.max(0, scrollTo.y)
    } else {
      inner.scrollLeft = Math.round((inner.scrollWidth  - inner.clientWidth)  / 2)
      inner.scrollTop  = Math.round((inner.scrollHeight - inner.clientHeight) / 2)
    }

    zoomRef.current = newZoom

    if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current)
    zoomDebounceRef.current = setTimeout(() => {
      onZoomChangeRef.current(newZoom)
    }, 150)
  }, [])

  // ── Initial zoom: hardcoded 49%, centers the scroll viewport ────────────
  useEffect(() => {
    applyZoom(0.49)
  }, [applyZoom])

  // ── Multi-selection alignment ──────────────────────────────────────────────
  type AlignType = 'left' | 'center-h' | 'right' | 'top' | 'center-v' | 'bottom' | 'dist-v' | 'dist-h'
  const applyAlignment = useCallback((type: AlignType) => {
    if (!multiSel) return
    const fc = multiSel.side === 'left' ? leftFabric.current : rightFabric.current
    if (!fc) return

    const objs = fc.getActiveObjects().slice()
    if (objs.length < 2) return
    const items = objs.map(obj => ({ obj, br: obj.getBoundingRect() }))
    const selBR = {
      left:   Math.min(...items.map(it => it.br.left)),
      top:    Math.min(...items.map(it => it.br.top)),
      right:  Math.max(...items.map(it => it.br.left + it.br.width)),
      bottom: Math.max(...items.map(it => it.br.top  + it.br.height)),
    }

    suppressMultiSelRef.current = true
    fc.discardActiveObject()

    items.forEach(({ obj, br }) => {
      switch (type) {
        case 'left':
          obj.set({ left: (obj.left ?? 0) + (selBR.left - br.left) }); break
        case 'center-h':
          obj.set({ left: (obj.left ?? 0) + ((selBR.left + selBR.right) / 2 - (br.left + br.width / 2)) }); break
        case 'right':
          obj.set({ left: (obj.left ?? 0) + (selBR.right - (br.left + br.width)) }); break
        case 'top':
          obj.set({ top: (obj.top ?? 0) + (selBR.top - br.top) }); break
        case 'center-v':
          obj.set({ top: (obj.top ?? 0) + ((selBR.top + selBR.bottom) / 2 - (br.top + br.height / 2)) }); break
        case 'bottom':
          obj.set({ top: (obj.top ?? 0) + (selBR.bottom - (br.top + br.height)) }); break
      }
      if (type !== 'dist-v' && type !== 'dist-h') obj.setCoords()
    })

    if (type === 'dist-h') {
      const sorted    = [...items].sort((a, b) => a.br.left - b.br.left)
      const totalW    = sorted.reduce((s, it) => s + it.br.width, 0)
      const totalSpan = sorted.at(-1)!.br.left + sorted.at(-1)!.br.width - sorted[0].br.left
      const gap       = (totalSpan - totalW) / (sorted.length - 1)
      let cursor      = sorted[0].br.left
      sorted.forEach(({ obj, br }) => {
        obj.set({ left: (obj.left ?? 0) + (cursor - br.left) })
        obj.setCoords()
        cursor += br.width + gap
      })
    }
    if (type === 'dist-v') {
      const sorted    = [...items].sort((a, b) => a.br.top - b.br.top)
      const totalH    = sorted.reduce((s, it) => s + it.br.height, 0)
      const totalSpan = sorted.at(-1)!.br.top + sorted.at(-1)!.br.height - sorted[0].br.top
      const gap       = (totalSpan - totalH) / (sorted.length - 1)
      let cursor      = sorted[0].br.top
      sorted.forEach(({ obj, br }) => {
        obj.set({ top: (obj.top ?? 0) + (cursor - br.top) })
        obj.setCoords()
        cursor += br.height + gap
      })
    }

    // Compute updated bounding rects (objects are standalone, so getBoundingRect is canvas-absolute)
    const newBRs    = objs.map(obj => obj.getBoundingRect())
    const newSelTop    = Math.min(...newBRs.map(br => br.top))
    const newSelBottom = Math.max(...newBRs.map(br => br.top + br.height))
    const newSelLeft   = Math.min(...newBRs.map(br => br.left))
    const newSelRight  = Math.max(...newBRs.map(br => br.left + br.width))

    const newSel = new fabric.ActiveSelection(objs, { canvas: fc })
    fc.setActiveObject(newSel)
    fc.renderAll()
    suppressMultiSelRef.current = false

    setMultiSel({ side: multiSel.side, selTop: newSelTop, selBottom: newSelBottom, selLeft: newSelLeft, selWidth: newSelRight - newSelLeft })
    fc.fire('object:modified', { target: newSel })
  }, [multiSel])

  // ── Mouse wheel / pinch zoom — direct DOM, no React state ────────────────
  useEffect(() => {
    const el = outerRef.current
    if (!el) return

    const handleWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()

      const inner = innerRef.current
      if (!inner) return

      const rect    = inner.getBoundingClientRect()
      const cursorX = e.clientX - rect.left
      const cursorY = e.clientY - rect.top
      const contentX = (cursorX + inner.scrollLeft - SCROLL_PAD) / zoomRef.current
      const contentY = (cursorY + inner.scrollTop  - SCROLL_PAD) / zoomRef.current

      let dy = e.deltaY
      if (e.deltaMode === 1) dy *= 16
      if (e.deltaMode === 2) dy *= 100
      const newZoom = parseFloat(
        Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, zoomRef.current * (1 - dy * 0.006))).toFixed(4)
      )

      if (newZoom === zoomRef.current) return

      applyZoom(newZoom, {
        x: contentX * newZoom - cursorX + SCROLL_PAD,
        y: contentY * newZoom - cursorY + SCROLL_PAD,
      })
    }

    el.addEventListener('wheel', handleWheel, { passive: false })
    return () => {
      el.removeEventListener('wheel', handleWheel)
      if (zoomDebounceRef.current) clearTimeout(zoomDebounceRef.current)
    }
  }, [applyZoom])

  // ── Fabric initialisation ─────────────────────────────────────────────────
  useEffect(() => {
    if (!leftElRef.current || !rightElRef.current) return

    const lc = new fabric.Canvas(leftElRef.current, {
      width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', selection: true,
    })
    const rc = new fabric.Canvas(rightElRef.current, {
      width: PAGE_W, height: PAGE_H, backgroundColor: '#ffffff', selection: true,
    })

    leftFabric.current  = lc
    rightFabric.current = rc

    // ── Image pan mode exit ───────────────────────────────────────────────
    const exitImgPanMode = () => {
      const c   = panIndicatorCanvasRef.current
      const img = panTargetRef.current
      if (img) {
        const pd = (img as unknown as fabric.FabricObject & { data: {
          frameX: number; frameY: number; frameW: number; frameH: number
          naturalW: number; naturalH: number; coverScale: number; editScale: number
        } }).data
        const scaleXY  = pd.coverScale * (pd.editScale ?? 1)
        const virtW    = pd.frameW / scaleXY
        const virtH    = pd.frameH / scaleXY
        // Convert img.left/top back to cropX/cropY for virtual-dims normal mode
        const panX     = (img.left ?? pd.frameX + pd.frameW / 2) - (pd.frameX + pd.frameW / 2)
        const panY     = (img.top  ?? pd.frameY + pd.frameH / 2) - (pd.frameY + pd.frameH / 2)
        const rawCropX = (pd.naturalW - virtW) / 2 - panX / scaleXY
        const rawCropY = (pd.naturalH - virtH) / 2 - panY / scaleXY
        const cropX    = Math.max(0, Math.min(rawCropX, pd.naturalW - virtW))
        const cropY    = Math.max(0, Math.min(rawCropY, pd.naturalH - virtH))
        img.set({
          width:          virtW,
          height:         virtH,
          scaleX:         scaleXY,
          scaleY:         scaleXY,
          cropX,
          cropY,
          left:           pd.frameX + pd.frameW / 2,
          top:            pd.frameY + pd.frameH / 2,
          opacity:        1,
          selectable:     true,
          evented:        true,
          lockUniScaling: false,
        })
        img.clipPath = makeClipRect(pd.frameX, pd.frameY, pd.frameW, pd.frameH)
        img.setCoords()
      }
      // Remove the full-opacity clone that showed the in-frame content
      if (panCloneRef.current && panIndicatorCanvasRef.current) {
        panIndicatorCanvasRef.current.remove(panCloneRef.current)
        panCloneRef.current = null
      }
      isPanMode.current    = false
      panData.current      = null
      panTargetRef.current = null
      setPanModeActive(false)
      if (c) {
        c.selection     = true
        c.defaultCursor = 'default'
        if (panIndicatorRef.current) c.remove(panIndicatorRef.current)
        // Sync spread mirror after exiting pan mode so crop/scale changes reflect
        if (img) syncSpreadMirror(img as unknown as fabric.FabricImage, c, c === lc ? rc : lc)
        c.renderAll()
      }
      panIndicatorRef.current       = null
      panIndicatorCanvasRef.current = null
    }

    const updateTextSel = (obj: fabric.FabricObject | null | undefined, side: 'left' | 'right') => {
      if (obj instanceof fabric.Textbox) {
        const br = obj.getBoundingRect()
        setTextSel({ side, top: br.top, left: br.left, width: br.width })
      } else {
        setTextSel(null)
      }
    }

    // Track which canvas was last interacted with (for Ctrl+Z)
    let activeCanvas: fabric.Canvas = lc

    const syncMultiSel = (fc: fabric.Canvas, side: 'left' | 'right') => {
      if (suppressMultiSelRef.current) return
      const objs = fc.getActiveObjects()
      if (objs.length < 2) { setMultiSel(null); return }
      const activeObj = fc.getActiveObject()
      if (!activeObj) { setMultiSel(null); return }
      const br = activeObj.getBoundingRect()
      setMultiSel({ side, selTop: br.top, selBottom: br.top + br.height, selLeft: br.left, selWidth: br.width })
    }

    // Converts a MouseEvent to canvas-local pixel coords, accounting for CSS scale on the parent.
    const toCanvasPoint = (fc: fabric.Canvas, e: MouseEvent) => {
      const r = fc.upperCanvasEl.getBoundingClientRect()
      return { x: (e.clientX - r.left) * (PAGE_W / r.width), y: (e.clientY - r.top) * (PAGE_H / r.height) }
    }

    // Must be declared before bind() so event-handler closures can reference it.
    const spreadMirrors = new Map<fabric.FabricImage, fabric.FabricImage>()

    // ── Phantom selection handles: drawn on mirror canvas for spanning objects ─
    let currentSpanSel: { master: fabric.FabricImage; masterCanvas: fabric.Canvas } | null = null

    const PHANTOM_SZ   = 10
    const PHANTOM_BLUE = '#528ED6'

    function drawPhantomSelection(thisCanvas: fabric.Canvas) {
      if (!currentSpanSel) return
      const { master, masterCanvas } = currentSpanSel
      const mirrorCanvas = masterCanvas === lc ? rc : lc
      if (thisCanvas !== mirrorCanvas) return

      const data = (master as unknown as { data?: { type: string; frameX?: number; frameY?: number; frameW?: number; frameH?: number } }).data
      if (!data) return

      const gap     = PAGE_W + SPINE
      const offsetX = masterCanvas === lc ? -gap : gap

      let rl: number, rt: number, rw: number, rh: number
      if (data.type === 'photo') {
        rl = (data.frameX ?? 0) + offsetX
        rt =  data.frameY ?? 0
        rw =  data.frameW ?? 0
        rh =  data.frameH ?? 0
      } else if (data.type === 'freePhoto') {
        const hw = master.getScaledWidth()  / 2
        const hh = master.getScaledHeight() / 2
        rl = (master.left ?? 0) + offsetX - hw
        rt = (master.top  ?? 0)            - hh
        rw = hw * 2
        rh = hh * 2
      } else return

      const ctx = mirrorCanvas.lowerCanvasEl.getContext('2d')
      if (!ctx) return

      const HS = PHANTOM_SZ / 2
      ctx.save()

      ctx.strokeStyle = PHANTOM_BLUE
      ctx.lineWidth   = 1
      ctx.setLineDash([])
      ctx.strokeRect(rl, rt, rw, rh)

      const drawH = (x: number, y: number) => {
        ctx.fillStyle   = '#ffffff'
        ctx.strokeStyle = PHANTOM_BLUE
        ctx.lineWidth   = 1
        ctx.fillRect(x - HS, y - HS, PHANTOM_SZ, PHANTOM_SZ)
        ctx.strokeRect(x - HS, y - HS, PHANTOM_SZ, PHANTOM_SZ)
      }
      const mx = rl + rw / 2
      const my = rt + rh / 2
      const r  = rl + rw
      const b  = rt + rh
      drawH(rl, rt); drawH(mx, rt); drawH(r, rt)
      drawH(rl, my);                drawH(r, my)
      drawH(rl, b);  drawH(mx, b);  drawH(r, b)

      ctx.restore()
    }

    const enterImgPanMode = (img: fabric.FabricImage, fc: fabric.Canvas) => {
      if (isPanMode.current) return
      const pd  = (img as unknown as fabric.FabricObject & { data: {
        frameX: number; frameY: number; frameW: number; frameH: number
        naturalW: number; naturalH: number; coverScale: number; editScale: number
      } }).data

      const scaleXY  = pd.coverScale * (pd.editScale ?? 1)
      const virtW    = pd.frameW / scaleXY
      const virtH    = pd.frameH / scaleXY
      const cropX    = img.cropX ?? 0
      const cropY    = img.cropY ?? 0
      // Convert current cropX/cropY to natural-dims img.left/top so the same source region stays centered
      const initLeft = pd.frameX + pd.frameW / 2 + (pd.naturalW / 2 - cropX - virtW / 2) * scaleXY
      const initTop  = pd.frameY + pd.frameH / 2 + (pd.naturalH / 2 - cropY - virtH / 2) * scaleXY

      isPanMode.current    = true
      panTargetRef.current = img
      panData.current      = null
      fc.discardActiveObject()
      fc.selection     = false
      fc.defaultCursor = 'grab'

      // Ghost: full image at low opacity, no clip — shows the image extent outside the frame
      img.set({
        width:          pd.naturalW,
        height:         pd.naturalH,
        scaleX:         scaleXY,
        scaleY:         scaleXY,
        cropX:          0,
        cropY:          0,
        left:           initLeft,
        top:            initTop,
        opacity:        0.4,
        selectable:     true,
        evented:        true,
        lockUniScaling: true,
      })
      img.clipPath = undefined

      // Clone: same image at full opacity, clipped to frame — shows sharp content inside frame
      const cloneEl = img.getElement() as HTMLImageElement
      const clone = new fabric.FabricImage(cloneEl, {
        originX:        'center',
        originY:        'center',
        left:           initLeft,
        top:            initTop,
        scaleX:         scaleXY,
        scaleY:         scaleXY,
        width:          pd.naturalW,
        height:         pd.naturalH,
        cropX:          0,
        cropY:          0,
        opacity:        1,
        selectable:     false,
        evented:        false,
      })
      clone.clipPath = makeClipRect(pd.frameX, pd.frameY, pd.frameW, pd.frameH)
      fc.add(clone)
      panCloneRef.current = clone

      if (panIndicatorRef.current) fc.remove(panIndicatorRef.current)
      const indicator = new fabric.Rect({
        left: pd.frameX, top: pd.frameY, width: pd.frameW, height: pd.frameH,
        originX: 'left', originY: 'top',
        fill: 'rgba(232, 130, 12, 0.06)', stroke: '#E8820C', strokeWidth: 2,
        strokeUniform: true, selectable: false, evented: false,
      })
      fc.add(indicator)
      panIndicatorRef.current       = indicator
      panIndicatorCanvasRef.current = fc
      fc.setActiveObject(img)
      fc.renderAll()
      setPanModeActive(true)
    }

    const bind = (fc: fabric.Canvas, side: 'left' | 'right') => {
      // ── Primary double-click: Fabric's native event (most reliable in production) ──
      fc.on('mouse:dblclick', (e) => {
        if (isFrameToolRef.current || isPanMode.current) return
        const { target } = e
        if (!target) return
        const data = (target as unknown as fabric.FabricObject & { data?: { type: string } }).data
        if (data?.type === 'photo') {
          lastClickRef.current = null
          enterImgPanMode(target as fabric.FabricImage, fc)
        }
      })

      fc.on('mouse:down', (e) => {
        setActivePage(side)
        onActivePageChangeRef.current(side)
        activeCanvas = fc

        // ── Spread mirror click: redirect selection to original on native canvas ──
        const mirrorData = (e.target as unknown as { data?: { type: string; original?: fabric.FabricImage } } | undefined)?.data
        if (mirrorData?.type === 'spreadMirror' && mirrorData.original) {
          const nativeCanvas = side === 'left' ? rc : lc
          fc.discardActiveObject()
          nativeCanvas.setActiveObject(mirrorData.original)
          nativeCanvas.renderAll()
          activeCanvas = nativeCanvas
          return
        }

        // ── Fallback double-click detection (manual timing, guards against missed dblclick) ──
        if (!isFrameToolRef.current && !isPanMode.current) {
          const { target } = e
          const now = Date.now()
          const last = lastClickRef.current
          if (target && last && last.target === target && now - last.time < 400) {
            lastClickRef.current = null
            const data = (target as unknown as fabric.FabricObject & { data?: { type: string } }).data
            if (data?.type === 'photo') {
              enterImgPanMode(target as fabric.FabricImage, fc)
              return
            }
          }
          if (target) lastClickRef.current = { target, time: now }
          else lastClickRef.current = null
        }

        // ── Frame draw tool ───────────────────────────────────────────────────
        if (isFrameToolRef.current) {
          const ptr     = toCanvasPoint(fc, e.e as MouseEvent)
          const preview = new fabric.Rect({
            left: ptr.x, top: ptr.y, width: 0, height: 0,
            originX: 'left', originY: 'top',
            fill: '#F0EFEB', stroke: '#528ED6', strokeWidth: 1,
            strokeDashArray: [5, 5], strokeUniform: true,
            selectable: false, evented: false,
          })
          fc.add(preview)
          frameDrawRef.current = { canvas: fc, startX: ptr.x, startY: ptr.y, preview }
          fc.renderAll()
          return
        }


        if (isPanMode.current) {
          // Different canvas from where the image lives → exit
          if (panIndicatorCanvasRef.current !== fc) {
            exitImgPanMode()
            return
          }
          // Click on empty canvas or any object other than the pan target → exit
          if (e.target !== (panTargetRef.current as unknown as fabric.FabricObject)) {
            exitImgPanMode()
            return
          }
          // Clicked on the pan target — Fabric handles drag and corner-scale natively
        }
      })

      // ── Mouse move: pan the photo inside its fixed clipPath ───────────────
      fc.on('mouse:move', (e) => {
        if (frameDrawRef.current?.canvas === fc) {
          const { startX, startY, preview } = frameDrawRef.current
          const ptr = toCanvasPoint(fc, e.e as MouseEvent)
          preview.set({
            left:   Math.min(ptr.x, startX),
            top:    Math.min(ptr.y, startY),
            width:  Math.abs(ptr.x - startX),
            height: Math.abs(ptr.y - startY),
          })
          fc.renderAll()
          return
        }
        if (isPanMode.current && panData.current) {
          const ptr = toCanvasPoint(fc, e.e as MouseEvent)
          const { img, startPtr, startImgLeft, startImgTop } = panData.current
          const pd = (img as unknown as fabric.FabricObject & { data: {
            frameX: number; frameY: number; frameW: number; frameH: number
            naturalW: number; naturalH: number; coverScale: number; editScale: number
          } }).data
          const scaleXY   = pd.coverScale * (pd.editScale ?? 1)
          const renderedW = pd.naturalW * scaleXY
          const renderedH = pd.naturalH * scaleXY
          // Image must always fully cover the frame — clamp left/top accordingly
          const minLeft   = pd.frameX + pd.frameW - renderedW / 2
          const maxLeft   = pd.frameX + renderedW / 2
          const minTop    = pd.frameY + pd.frameH - renderedH / 2
          const maxTop    = pd.frameY + renderedH / 2
          const dx        = ptr.x - startPtr.x
          const dy        = ptr.y - startPtr.y
          const newLeft   = Math.max(minLeft, Math.min(startImgLeft + dx, maxLeft))
          const newTop    = Math.max(minTop,  Math.min(startImgTop  + dy, maxTop))
          img.set({ left: newLeft, top: newTop })
          img.setCoords()
          fc.renderAll()
        }
      })

      // ── Mouse up: finalize frame draw or persist panned position ─────────
      fc.on('mouse:up', () => {
        if (frameDrawRef.current?.canvas === fc) {
          const { preview, canvas } = frameDrawRef.current
          const frameX = preview.left   ?? 0
          const frameY = preview.top    ?? 0
          const frameW = preview.width  ?? 0
          const frameH = preview.height ?? 0
          canvas.remove(preview)
          frameDrawRef.current = null
          if (frameW > 10 && frameH > 10) {
            const frame = createFrameAtPx(canvas, frameX, frameY, frameW, frameH)
            canvas.setActiveObject(frame)
            onFrameToolDeactivateRef.current()
          }
          canvas.renderAll()
          return
        }
        if (panData.current) {
          panData.current  = null
          fc.defaultCursor = 'grab'
        }
        setDragOverPage(null)
      })

      const applyTextControls = (obj: fabric.FabricObject | undefined) => {
        if (!obj) return
        if (obj instanceof fabric.Textbox) {
          obj.set({ lockUniScaling: false })
          obj.setControlsVisibility({ mt: false, mb: false })
        }
        const data = (obj as unknown as fabric.FabricObject & { data?: { type: string } }).data
        if (data?.type === 'freePhoto') {
          obj.set({ lockUniScaling: true })
          obj.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false })
        }
      }
      const updateSpanSel = (selObj: fabric.FabricObject | undefined) => {
        const otherFc = side === 'left' ? rc : lc
        const data = (selObj as unknown as { data?: { type: string } } | undefined)?.data
        if (selObj && (data?.type === 'photo' || data?.type === 'freePhoto')
            && spreadMirrors.has(selObj as unknown as fabric.FabricImage)) {
          currentSpanSel = { master: selObj as unknown as fabric.FabricImage, masterCanvas: fc }
        } else {
          currentSpanSel = null
        }
        otherFc.renderAll()
      }

      fc.on('selection:created', (e) => {
        onObjectSelectedRef.current(e.selected?.[0] ?? null)
        updateTextSel(e.selected?.[0], side)
        applyTextControls(e.selected?.[0])
        syncMultiSel(fc, side)
        updateSpanSel(e.selected?.[0])
      })
      fc.on('selection:updated', (e) => {
        onObjectSelectedRef.current(e.selected?.[0] ?? null)
        updateTextSel(e.selected?.[0], side)
        applyTextControls(e.selected?.[0])
        syncMultiSel(fc, side)
        updateSpanSel(e.selected?.[0])
      })
      fc.on('selection:cleared', () => {
        onObjectSelectedRef.current(null)
        setTextSel(null)
        if (!suppressMultiSelRef.current) setMultiSel(null)
        if (currentSpanSel?.masterCanvas === fc) {
          currentSpanSel = null
          const otherFc = side === 'left' ? rc : lc
          otherFc.renderAll()
        }
      })
      fc.on('object:modified', (e) => {
        if (e.target instanceof fabric.Textbox) {
          const br = e.target.getBoundingRect()
          setTextSel({ side, top: br.top, left: br.left, width: br.width })
        }
        syncMultiSel(fc, side)
        const otherFc = side === 'left' ? rc : lc
        if (e.target) syncSpreadMirror(e.target as unknown as fabric.FabricImage, fc, otherFc)
      })
      fc.on('object:removed', (e) => {
        const removed = e.target as unknown as fabric.FabricImage
        const mirror  = spreadMirrors.get(removed)
        if (mirror) {
          const otherFc = side === 'left' ? rc : lc
          otherFc.remove(mirror)
          spreadMirrors.delete(removed)
          otherFc.renderAll()
        }
      })
      fc.on('text:editing:entered', () => {
        const obj = fc.getActiveObject()
        if (obj instanceof fabric.Textbox && onTextEditRef.current) {
          // Exit Fabric's built-in cursor editing and open the modal instead
          ;(obj as unknown as fabric.Textbox).exitEditing()
          fc.renderAll()
          onTextEditRef.current(obj as unknown as fabric.Textbox, side)
          return
        }
        setTextEditing(true)
      })
      fc.on('text:editing:exited',  () => setTextEditing(false))

      // ── Right-click context menu ──────────────────────────────────────────
      fc.on('contextmenu', (e) => {
        const nativeE = e.e as MouseEvent
        nativeE.preventDefault()
        if (isPanMode.current) return
        const { target } = e
        if (!target) return
        const data = (target as unknown as fabric.FabricObject & { data?: { type: string } }).data
        if (!data?.type) return
        setCtxMenu({ x: nativeE.clientX, y: nativeE.clientY, obj: target, fc })
      })

      // ── Photo scaling ────────────────────────────────────────────────────────
      fc.on('object:scaling', (e) => {
        const obj = e.target as unknown as fabric.FabricImage & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number; coverScale: number; editScale: number }
          clipPath?: fabric.Rect
        }
        if (obj?.data?.type !== 'photo') return
        const pd = obj.data!

        // ── Edit mode: scale = zoom image inside fixed frame ──────────────────
        if (isPanMode.current && (obj as unknown) === panTargetRef.current) {
          const newScaleXY   = Math.max(pd.coverScale, obj.scaleX ?? pd.coverScale)
          const newEditScale = newScaleXY / pd.coverScale
          const renderedW    = pd.naturalW * newScaleXY
          const renderedH    = pd.naturalH * newScaleXY
          const minLeft      = pd.frameX + pd.frameW - renderedW / 2
          const maxLeft      = pd.frameX + renderedW / 2
          const minTop       = pd.frameY + pd.frameH - renderedH / 2
          const maxTop       = pd.frameY + renderedH / 2
          const newLeft      = Math.max(minLeft, Math.min(obj.left ?? 0, maxLeft))
          const newTop       = Math.max(minTop,  Math.min(obj.top  ?? 0, maxTop))
          obj.set({ scaleX: newScaleXY, scaleY: newScaleXY, left: newLeft, top: newTop })
          if (panCloneRef.current) {
            panCloneRef.current.set({ scaleX: newScaleXY, scaleY: newScaleXY, left: newLeft, top: newTop })
            panCloneRef.current.setCoords()
          }
          pd.editScale = newEditScale
          return
        }

        // ── Normal mode: resize frame, recompute cover crop ───────────────────
        // invariant: width * scaleX = frameW (holds at any editScale)
        const newFrameW = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const newFrameH = (obj.height ?? 0) * (obj.scaleY ?? 1)

        const newCoverScale = Math.max(newFrameW / pd.naturalW, newFrameH / pd.naturalH)
        const newVirtW      = newFrameW / newCoverScale
        const newVirtH      = newFrameH / newCoverScale
        const newCropX = (pd.naturalW - newVirtW) / 2
        const newCropY = (pd.naturalH - newVirtH) / 2

        const cx = obj.left ?? 0
        const cy = obj.top  ?? 0

        obj.set({
          scaleX: newCoverScale,
          scaleY: newCoverScale,
          width:  newVirtW,
          height: newVirtH,
          cropX:  newCropX,
          cropY:  newCropY,
        })

        const newFrameX = cx - newFrameW / 2
        const newFrameY = cy - newFrameH / 2

        if (obj.clipPath) {
          obj.clipPath.set({ left: newFrameX, top: newFrameY, width: newFrameW, height: newFrameH })
        }

        pd.frameX     = newFrameX
        pd.frameY     = newFrameY
        pd.frameW     = newFrameW
        pd.frameH     = newFrameH
        pd.coverScale = newCoverScale
        pd.editScale  = 1
      })

      // ── Object moving: clamp in edit mode, update clipPath in normal mode ───
      fc.on('object:moving', (e) => {
        const obj = e.target as unknown as fabric.FabricObject & {
          data?: { type: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number; coverScale: number; editScale: number }
          clipPath?: fabric.Rect
        }

        // Edit mode: pan = drag image; clamp so it always covers the frame
        if (isPanMode.current && (obj as unknown) === panTargetRef.current) {
          const pd        = obj.data!
          const scaleXY   = pd.coverScale * (pd.editScale ?? 1)
          const renderedW = pd.naturalW * scaleXY
          const renderedH = pd.naturalH * scaleXY
          const minLeft   = pd.frameX + pd.frameW - renderedW / 2
          const maxLeft   = pd.frameX + renderedW / 2
          const minTop    = pd.frameY + pd.frameH - renderedH / 2
          const maxTop    = pd.frameY + renderedH / 2
          const newLeft   = Math.max(minLeft, Math.min(obj.left ?? 0, maxLeft))
          const newTop    = Math.max(minTop,  Math.min(obj.top  ?? 0, maxTop))
          obj.set({ left: newLeft, top: newTop })
          if (panCloneRef.current) {
            panCloneRef.current.set({ left: newLeft, top: newTop })
            panCloneRef.current.setCoords()
          }
          return
        }
        if (isPanMode.current) return

        if (obj?.data?.type === 'photo') {
          // img.left is always the frame center in the virtual-dims model
          const cx = obj.left ?? 0
          const cy = obj.top  ?? 0
          const pd = obj.data!
          const newFrameX = cx - pd.frameW / 2
          const newFrameY = cy - pd.frameH / 2
          pd.frameX = newFrameX
          pd.frameY = newFrameY
          if (obj.clipPath) obj.clipPath.set({ left: newFrameX, top: newFrameY })
        }

        // Cross-canvas drag highlight
        const cx2 = (e.target as unknown as fabric.FabricObject).getCenterPoint().x
        setDragOverPage(
          side === 'left'
            ? (cx2 > PAGE_W * 0.85 ? 'right' : null)
            : (cx2 < PAGE_W * 0.15 ? 'left'  : null),
        )

        // Sync spread mirror for freePhotos overlapping the page boundary
        const otherFc2 = side === 'left' ? rc : lc
        syncSpreadMirror(e.target as unknown as fabric.FabricImage, fc, otherFc2)
      })

      // ── Scroll to zoom inside frame in edit mode ──────────────────────────
      fc.upperCanvasEl.addEventListener('wheel', (e: WheelEvent) => {
        if (!isPanMode.current || panIndicatorCanvasRef.current !== fc) return
        if (e.ctrlKey) return  // let viewport zoom handle ctrl+scroll
        e.preventDefault()
        e.stopPropagation()

        const img = panTargetRef.current
        if (!img) return
        const pd = (img as unknown as fabric.FabricObject & { data: {
          frameX: number; frameY: number; frameW: number; frameH: number
          naturalW: number; naturalH: number; coverScale: number; editScale: number
        } }).data

        const factor       = e.deltaY < 0 ? 1.1 : 0.9
        const newEditScale = Math.max(1, (pd.editScale ?? 1) * factor)
        const newScaleXY   = pd.coverScale * newEditScale
        const renderedW    = pd.naturalW * newScaleXY
        const renderedH    = pd.naturalH * newScaleXY
        // Clamp current img position to the new rendered bounds
        const minLeft   = pd.frameX + pd.frameW - renderedW / 2
        const maxLeft   = pd.frameX + renderedW / 2
        const minTop    = pd.frameY + pd.frameH - renderedH / 2
        const maxTop    = pd.frameY + renderedH / 2
        const newLeft   = Math.max(minLeft, Math.min(img.left ?? pd.frameX + pd.frameW / 2, maxLeft))
        const newTop    = Math.max(minTop,  Math.min(img.top  ?? pd.frameY + pd.frameH / 2, maxTop))
        img.set({ scaleX: newScaleXY, scaleY: newScaleXY, left: newLeft, top: newTop })
        img.setCoords()
        if (panCloneRef.current) {
          panCloneRef.current.set({ scaleX: newScaleXY, scaleY: newScaleXY, left: newLeft, top: newTop })
          panCloneRef.current.setCoords()
        }
        pd.editScale = newEditScale
        fc.renderAll()
      }, { passive: false })

    }
    bind(lc, 'left')
    bind(rc, 'right')

    // ── Cross-canvas object transfer ─────────────────────────────────────────
    const CANVAS_GAP = PAGE_W + SPINE

    const transferToCanvas = async (
      obj: fabric.FabricObject,
      from: fabric.Canvas,
      to: fabric.Canvas,
      offsetX: number,
    ) => {
      // Reset pan mode if the transferred object was the pan target
      if (isPanMode.current) {
        isPanMode.current    = false
        panData.current      = null
        panTargetRef.current = null
        from.defaultCursor   = 'default'
      }

      const cloned = await obj.clone()
      cloned.set({ left: (cloned.left ?? 0) + offsetX })

      const srcData = (obj as unknown as fabric.FabricObject & { data?: Record<string, unknown> }).data
      if (srcData) {
        const newData = { ...srcData }
        if (newData.type === 'photo') {
          newData.frameX = ((newData.frameX as number) ?? 0) + offsetX
        }
        ;(cloned as unknown as fabric.FabricObject & { data: Record<string, unknown> }).data = newData
      }

      // Update cloned clipPath position to match new canvas offset
      if ((srcData as { type?: string } | undefined)?.type === 'photo') {
        cloned.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
        cloned.set({ borderColor: '#528ED6', borderScaleFactor: 2 })
        if (cloned.clipPath) {
          cloned.clipPath.set({ left: ((cloned.clipPath.left ?? 0) + offsetX) })
        }
      }

      // Remove any spread mirror the transferred object had on the destination canvas
      const xferMirror = spreadMirrors.get(obj as unknown as fabric.FabricImage)
      if (xferMirror) {
        to.remove(xferMirror)
        spreadMirrors.delete(obj as unknown as fabric.FabricImage)
      }

      from.remove(obj)
      from.discardActiveObject()
      from.renderAll()

      to.add(cloned)
      to.setActiveObject(cloned)
      // If the transferred object now spans back to the source canvas, create its mirror
      syncSpreadMirror(cloned as unknown as fabric.FabricImage, to, from)
      to.renderAll()
    }

    // ── Spread mirrors: objects that visually span both pages ────────────────
    function syncSpreadMirror(
      master: fabric.FabricImage,
      masterCanvas: fabric.Canvas,
      otherCanvas:  fabric.Canvas,
    ) {
      const data = (master as unknown as { data?: { type: string; frameX?: number; frameY?: number; frameW?: number; frameH?: number } }).data
      if (data?.type !== 'freePhoto' && data?.type !== 'photo') return

      const offsetX = masterCanvas === lc ? -CANVAS_GAP : CANVAS_GAP
      let mirror = spreadMirrors.get(master)

      if (data.type === 'freePhoto') {
        const hw = master.getScaledWidth() / 2
        const cx = master.left ?? 0
        const overlaps = masterCanvas === lc ? (cx + hw) > PAGE_W : (cx - hw) < 0

        if (!overlaps) {
          if (mirror) { otherCanvas.remove(mirror); spreadMirrors.delete(master); otherCanvas.renderAll() }
          return
        }

        const ml = cx + offsetX
        const mt = master.top ?? 0

        if (mirror) {
          mirror.set({ left: ml, top: mt, scaleX: master.scaleX, scaleY: master.scaleY, angle: master.angle ?? 0 })
          mirror.setCoords()
          otherCanvas.renderAll()
        } else {
          fabric.FabricImage.fromURL(master.getSrc(), { crossOrigin: 'anonymous' }).then((img) => {
            if (!masterCanvas.getObjects().includes(master as unknown as fabric.FabricObject)) return
            img.set({ originX: 'center', originY: 'center', left: ml, top: mt,
              scaleX: master.scaleX ?? 1, scaleY: master.scaleY ?? 1, angle: master.angle ?? 0,
              selectable: false, evented: true })
            ;(img as unknown as { data: { type: string; original: fabric.FabricImage } }).data = { type: 'spreadMirror', original: master }
            spreadMirrors.set(master, img)
            otherCanvas.add(img)
            otherCanvas.sendObjectToBack(img)
            otherCanvas.renderAll()
          })
        }
      } else {
        // photo type: frame may span the spine — show the overflow portion on the other canvas
        const frameX = data.frameX ?? (master.left ?? 0) - (data.frameW ?? 0) / 2
        const frameY = data.frameY ?? 0
        const frameW = data.frameW ?? 0
        const frameH = data.frameH ?? 0
        const overlaps = masterCanvas === lc ? frameX + frameW > PAGE_W : frameX < 0

        if (!overlaps) {
          if (mirror) { otherCanvas.remove(mirror); spreadMirrors.delete(master); otherCanvas.renderAll() }
          return
        }

        const ml = (master.left ?? 0) + offsetX
        const mt = master.top ?? 0
        const mirrorClipX = frameX + offsetX
        const mirrorClipY = frameY

        if (mirror) {
          mirror.set({
            left: ml, top: mt,
            scaleX: master.scaleX ?? 1, scaleY: master.scaleY ?? 1,
            width:  master.width  ?? 0, height: master.height ?? 0,
            cropX:  master.cropX  ?? 0, cropY:  master.cropY  ?? 0,
          })
          if (mirror.clipPath) mirror.clipPath.set({ left: mirrorClipX, top: mirrorClipY, width: frameW, height: frameH })
          mirror.setCoords()
          otherCanvas.renderAll()
        } else {
          fabric.FabricImage.fromURL(master.getSrc(), { crossOrigin: 'anonymous' }).then((img) => {
            if (!masterCanvas.getObjects().includes(master as unknown as fabric.FabricObject)) return
            img.set({
              originX: 'center', originY: 'center',
              left: ml, top: mt,
              scaleX: master.scaleX ?? 1, scaleY: master.scaleY ?? 1,
              width:  master.width  ?? 0, height: master.height ?? 0,
              cropX:  master.cropX  ?? 0, cropY:  master.cropY  ?? 0,
              selectable: false, evented: true,
            })
            img.clipPath = makeClipRect(mirrorClipX, mirrorClipY, frameW, frameH)
            ;(img as unknown as { data: { type: string; original: fabric.FabricImage } }).data = { type: 'spreadMirror', original: master }
            spreadMirrors.set(master, img)
            otherCanvas.add(img)
            otherCanvas.sendObjectToBack(img)
            otherCanvas.renderAll()
          })
        }
      }
    }

    lc.on('object:modified', async (e) => {
      if ((e as unknown as { transform?: { action?: string } }).transform?.action !== 'drag') return
      if (!e.target || isPanMode.current) return
      const cx = (e.target as unknown as fabric.FabricObject).getCenterPoint().x
      if (cx > PAGE_W) await transferToCanvas(e.target, lc, rc, -CANVAS_GAP)
    })
    rc.on('object:modified', async (e) => {
      if ((e as unknown as { transform?: { action?: string } }).transform?.action !== 'drag') return
      if (!e.target || isPanMode.current) return
      const cx = (e.target as unknown as fabric.FabricObject).getCenterPoint().x
      if (cx < 0) await transferToCanvas(e.target, rc, lc, CANVAS_GAP)
    })

    function syncAllMirrors() {
      for (const obj of lc.getObjects()) {
        const d = (obj as unknown as { data?: { type: string } }).data
        if (d?.type === 'photo' || d?.type === 'freePhoto') syncSpreadMirror(obj as unknown as fabric.FabricImage, lc, rc)
      }
      for (const obj of rc.getObjects()) {
        const d = (obj as unknown as { data?: { type: string } }).data
        if (d?.type === 'photo' || d?.type === 'freePhoto') syncSpreadMirror(obj as unknown as fabric.FabricImage, rc, lc)
      }
    }
    onCanvasReadyRef.current(lc, rc, syncAllMirrors)

    // ── Draw phantom handles on mirror canvas after every render ─────────────
    lc.on('after:render', () => drawPhantomSelection(lc))
    rc.on('after:render', () => drawPhantomSelection(rc))

    // Clipboard stores plain serialized data — avoids Fabric clone() quirks in v7
    type ClipboardEntry =
      | { kind: 'photo'; src: string; frameX: number; frameY: number; frameW: number; frameH: number; naturalW: number; naturalH: number; coverScale: number; editScale: number; cropX: number; cropY: number }
      | { kind: 'freePhoto'; src: string; left: number; top: number; scaleX: number; scaleY: number; naturalW: number; naturalH: number }
      | { kind: 'frame'; frameX: number; frameY: number; frameW: number; frameH: number }
      | { kind: 'text';  text: string; left: number; top: number; width: number; fontSize: number; fontFamily: string; fill: string }
    const clipboard = { current: null as ClipboardEntry | null }

    const handleKeyDown = async (e: KeyboardEvent) => {
      // ── Escape: exit image edit mode ─────────────────────────────────────
      if (e.key === 'Escape' && isPanMode.current) {
        exitImgPanMode()
        e.preventDefault()
        return
      }

      // ── Ctrl/Cmd + C: copy ───────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
        // Don't intercept while a textbox is being edited
        if (activeCanvas.getActiveObject() instanceof fabric.Textbox &&
            (activeCanvas.getActiveObject() as unknown as fabric.Textbox).isEditing) return
        e.preventDefault()
        const obj = activeCanvas.getActiveObject()
        if (!obj) return

        const d = (obj as unknown as fabric.FabricObject & { data?: Record<string, unknown> }).data

        if (d?.type === 'photo' && obj instanceof fabric.FabricImage) {
          clipboard.current = {
            kind:       'photo',
            src:        obj.getSrc(),
            frameX:     d.frameX     as number,
            frameY:     d.frameY     as number,
            frameW:     d.frameW     as number,
            frameH:     d.frameH     as number,
            naturalW:   d.naturalW   as number,
            naturalH:   d.naturalH   as number,
            coverScale: (d.coverScale as number) ?? (obj.scaleX ?? 1),
            editScale:  (d.editScale  as number) ?? 1,
            cropX:      obj.cropX ?? 0,
            cropY:      obj.cropY ?? 0,
          }
        } else if (d?.type === 'freePhoto' && obj instanceof fabric.FabricImage) {
          clipboard.current = {
            kind:     'freePhoto',
            src:      obj.getSrc(),
            left:     obj.left    ?? 0,
            top:      obj.top     ?? 0,
            scaleX:   obj.scaleX  ?? 1,
            scaleY:   obj.scaleY  ?? 1,
            naturalW: d.naturalW  as number,
            naturalH: d.naturalH  as number,
          }
        } else if (d?.type === 'frame' && obj instanceof fabric.Rect) {
          clipboard.current = {
            kind:   'frame',
            frameX: obj.left   ?? 0,
            frameY: obj.top    ?? 0,
            frameW: obj.width  ?? 0,
            frameH: obj.height ?? 0,
          }
        } else if (obj instanceof fabric.Textbox) {
          clipboard.current = {
            kind:       'text',
            text:       obj.text       ?? '',
            left:       obj.left       ?? 0,
            top:        obj.top        ?? 0,
            width:      obj.width      ?? 200,
            fontSize:   obj.fontSize   ?? 24,
            fontFamily: obj.fontFamily ?? 'amandine',
            fill:       (obj.fill as string) ?? '#191919',
          }
        }
        return
      }

      // ── Ctrl/Cmd + V: paste ──────────────────────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        if (!clipboard.current) return
        e.preventDefault()
        const cb = clipboard.current
        const OFF = 20

        if (cb.kind === 'photo') {
          const img = await fabric.FabricImage.fromURL(cb.src, { crossOrigin: 'anonymous' })
          const fx       = cb.frameX + OFF
          const fy       = cb.frameY + OFF
          const scaleXY  = cb.coverScale * cb.editScale
          const virtW    = cb.frameW / scaleXY
          const virtH    = cb.frameH / scaleXY
          img.set({
            originX:           'center',
            originY:           'center',
            left:              fx + cb.frameW / 2,
            top:               fy + cb.frameH / 2,
            scaleX:            scaleXY,
            scaleY:            scaleXY,
            width:             virtW,
            height:            virtH,
            cropX:             cb.cropX,
            cropY:             cb.cropY,
            selectable:        true,
            evented:           true,
            borderColor:       '#528ED6',
            borderScaleFactor: 2,
          })
          img.clipPath = new fabric.Rect({
            originX: 'left', originY: 'top',
            left: fx, top: fy, width: cb.frameW, height: cb.frameH,
            absolutePositioned: true,
          })
          img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
          ;(img as unknown as fabric.FabricObject & { data: Record<string, unknown> }).data = {
            type: 'photo', frameX: fx, frameY: fy, frameW: cb.frameW, frameH: cb.frameH,
            naturalW: cb.naturalW, naturalH: cb.naturalH,
            coverScale: cb.coverScale, editScale: cb.editScale,
          }
          activeCanvas.add(img)
          activeCanvas.setActiveObject(img)

        } else if (cb.kind === 'frame') {
          restoreEmptyFrame(activeCanvas, {
            frameX: cb.frameX + OFF,
            frameY: cb.frameY + OFF,
            frameW: cb.frameW,
            frameH: cb.frameH,
          })
          const added = activeCanvas.getObjects().at(-1)
          if (added) activeCanvas.setActiveObject(added)

        } else if (cb.kind === 'text') {
          const textbox = new fabric.Textbox(cb.text, {
            left:       cb.left   + OFF,
            top:        cb.top    + OFF,
            width:      cb.width,
            fontFamily: cb.fontFamily,
            fontSize:   cb.fontSize,
            fill:       cb.fill,
          }) as unknown as fabric.Textbox & { data: { type: string } }
          textbox.data = { type: 'text' }
          activeCanvas.add(textbox)
          activeCanvas.setActiveObject(textbox)
        }

        activeCanvas.renderAll()
        return
      }

      // ── Ctrl/Cmd + Z / Shift+Z: undo / redo ─────────────────────────────
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        const tag = (e.target as HTMLElement).tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA') return
        e.preventDefault()
        if (e.shiftKey) onRedoRef.current?.()
        else            onUndoRef.current?.()
        return
      }

      if (e.key === 'Escape') {
        if (isPanMode.current) {
          isPanMode.current    = false
          panData.current      = null
          panTargetRef.current = null
          setPanModeActive(false)
          ;[lc, rc].forEach(c => { c.selection = true; c.defaultCursor = 'default'; c.renderAll() })
        }
        return
      }

      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      for (const fc of [lc, rc]) {
        // .slice() makes a snapshot — getActiveObjects() returns Fabric's internal
        // mutable array which discardActiveObject() clears in-place
        const selected = fc.getActiveObjects().slice()
        if (selected.length === 0) continue

        if (selected.some(o => o instanceof fabric.Textbox && (o as unknown as fabric.Textbox).isEditing)) return

        type FrameCoords = { frameX: number; frameY: number; frameW: number; frameH: number }
        const framesToRestore: FrameCoords[] = []
        let hasText = false

        for (const obj of selected) {
          if (obj instanceof fabric.Textbox) { hasText = true; continue }
          const data = (obj as unknown as fabric.FabricObject & { data?: { type: string } & FrameCoords }).data
          // Deep-copy coords before discard mutates anything
          if (data?.type === 'photo') framesToRestore.push({ frameX: data.frameX, frameY: data.frameY, frameW: data.frameW, frameH: data.frameH })
        }

        // Discard the ActiveSelection — releases objects back to canvas._objects
        fc.discardActiveObject()

        // Remove each object individually (spread on a potentially-empty ref is unsafe)
        for (const obj of selected) fc.remove(obj)

        if (hasText) setTextSel(null)
        if (framesToRestore.length > 0 && isPanMode.current) {
          isPanMode.current = false; panData.current = null; panTargetRef.current = null; fc.defaultCursor = 'default'
        }
        for (const fd of framesToRestore) restoreEmptyFrame(fc, fd)
        fc.renderAll()
        return
      }
    }
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      lc.dispose()
      rc.dispose()
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close context menu on pointer-down outside the menu ──────────────────
  useEffect(() => {
    if (!ctxMenu) return
    const close = (e: PointerEvent) => {
      if (ctxMenuRef.current?.contains(e.target as Node)) return
      setCtxMenu(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [ctxMenu])

  // ── Drag & drop ───────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>, page: 'left' | 'right') => {
      e.preventDefault()
      setDragOverPage(null)

      const layoutId = e.dataTransfer.getData('application/zeika-layout')
      if (layoutId) {
        onLayoutDropOnPageRef.current(layoutId, page)
        return
      }

      const textureUrl = e.dataTransfer.getData('application/zeika-texture')
      if (textureUrl) {
        const fc = page === 'left' ? leftFabric.current : rightFabric.current
        if (fc) await dropTextureOnPage(fc, textureUrl, PAGE_W, PAGE_H)
        return
      }

      const stickerUrl = e.dataTransfer.getData('application/zeika-sticker')
      if (stickerUrl) {
        const fc = page === 'left' ? leftFabric.current : rightFabric.current
        if (fc) await dropStickerOnPage(fc, stickerUrl, PAGE_W, PAGE_H)
        return
      }

      const photoUrl = e.dataTransfer.getData('text/plain')
      if (!photoUrl) return

      const fc = page === 'left' ? leftFabric.current : rightFabric.current
      if (!fc) return

      const rect  = (e.currentTarget as HTMLDivElement).getBoundingClientRect()
      const x     = (e.clientX - rect.left) / zoomRef.current
      const y     = (e.clientY - rect.top)  / zoomRef.current

      const frame = findFrameAtPoint(fc, x, y)
      if (frame) {
        await dropPhotoOnFrame(fc, frame as unknown as fabric.Rect, photoUrl, PAGE_W, PAGE_H)
        const photoId = e.dataTransfer.getData('application/zeika-photo-id')
        if (photoId) onPhotoDropRef.current(photoId)
        return
      }

      const existingPhoto = findPhotoAtPoint(fc, x, y)
      if (existingPhoto) {
        await replacePhotoInFrame(fc, existingPhoto, photoUrl)
        const photoId = e.dataTransfer.getData('application/zeika-photo-id')
        if (photoId) onPhotoDropRef.current(photoId)
        return
      }

      // No frame and no existing photo — drop as free-floating image
      await dropPhotoFree(fc, photoUrl, x, y)
      const photoId = e.dataTransfer.getData('application/zeika-photo-id')
      if (photoId) onPhotoDropRef.current(photoId)
    },
    [],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent, page: 'left' | 'right') => {
      e.preventDefault()
      setDragOverPage(page)
    },
    [],
  )

  const handleDragLeave = useCallback(() => setDragOverPage(null), [])

  // ── Navigation ────────────────────────────────────────────────────────────
  const { left: leftLabel, right: rightLabel } = spreadLabel(currentSpread, totalSpreads, t.back, t.cover)
  const goLeft      = () => onSpreadChange(Math.max(0, currentSpread - 1))
  const goRight     = () => onSpreadChange(Math.min(totalSpreads - 1, currentSpread + 1))
  const isLastSpread    = currentSpread === totalSpreads - 1
  const isFirstInside   = currentSpread === 1

  // ── Render ────────────────────────────────────────────────────────────────
  const scaledW = SPREAD_W * zoom
  const scaledH = SPREAD_H * zoom

  return (
    <div className={`canvas-outer${rulerMode ? ' canvas-ruler-active' : ''}`} ref={outerRef}>
      {/* ── Scrollable + centered area ── */}
      <div className="canvas-inner" ref={innerRef}>
        <div className="canvas-scroll-pad">
        <div className="canvas-scale-anchor" ref={scaleAnchorRef} style={{ width: scaledW, height: scaledH }}>
          <div
            className="canvas-spread-root"
            ref={spreadRootRef}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left' }}
          >
            {/* Pages row */}
            <div className="canvas-pages-row">

              {/* Left page */}
              <div className="canvas-page-col">
                <div className="canvas-page-num">{leftLabel}</div>
                <div
                  ref={leftPageWrapRef}
                  className={[
                    'canvas-page-wrap',
                    activePage   === 'left' ? 'canvas-page-wrap--active'    : '',
                    dragOverPage === 'left' ? 'canvas-page-wrap--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  onDrop={(e) => handleDrop(e, 'left')}
                  onDragOver={(e) => handleDragOver(e, 'left')}
                  onDragLeave={handleDragLeave}
                >
                  <canvas ref={leftElRef} />
                  <BleedOverlay />
                  {showGrid && <GridOverlay settings={gridSettings} />}
                  {rulerMode && <GuidesOverlay pageW={PAGE_W} pageH={PAGE_H} zoom={zoom} guides={guides} onGuidesChange={onGuidesChange} pageWrapRef={leftPageWrapRef} />}
                  {isLastSpread && (
                    <div className="canvas-logo-overlay" aria-hidden="true">
                      <img src="/LogoZeika.jpg" alt="Zeika Memories" className="canvas-logo-img" />
                    </div>
                  )}
                  {isFirstInside && (
                    <div className="canvas-no-edit-overlay" aria-hidden="true">
                      <span className="canvas-no-edit-label">{t.noEditable}</span>
                    </div>
                  )}
                  {textSel?.side === 'left' && !textEditing && (
                    <button
                      className="canvas-text-delete"
                      style={{ top: textSel.top, left: textSel.left + textSel.width }}
                      onClick={() => {
                        const fc = leftFabric.current
                        if (!fc) return
                        const obj = fc.getActiveObject()
                        if (obj) { fc.remove(obj); fc.renderAll(); setTextSel(null) }
                      }}
                      aria-label={t.deleteText}
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  )}
                  {multiSel?.side === 'left' && (
                    <div className="canvas-align-toolbar" style={{ top: multiSel.selBottom + 8, left: multiSel.selLeft + multiSel.selWidth / 2 }}>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('left')}      aria-label={t.alignLeft}><AlignStartVertical size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('center-h')}  aria-label={t.alignCenterV}><AlignCenterVertical size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('right')}     aria-label={t.alignRight}><AlignEndVertical size={18} strokeWidth={1.5} /></button>
                      <div className="canvas-align-sep" />
                      <button className="canvas-align-btn" onClick={() => applyAlignment('top')}       aria-label={t.alignTop}><AlignVerticalJustifyStart size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('center-v')}  aria-label={t.alignCenterH}><AlignCenterHorizontal size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('bottom')}    aria-label={t.alignBottom}><AlignVerticalJustifyEnd size={18} strokeWidth={1.5} /></button>
                      <div className="canvas-align-sep" />
                      <button className="canvas-align-btn" onClick={() => applyAlignment('dist-v')}   aria-label={t.distributeV}><AlignVerticalSpaceAround size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('dist-h')}   aria-label={t.distributeH}><AlignHorizontalSpaceAround size={18} strokeWidth={1.5} /></button>
                    </div>
                  )}
                </div>
              </div>

              <div className="canvas-spine" />

              {/* Right page */}
              <div className="canvas-page-col">
                <div className="canvas-page-num canvas-page-num--right">{rightLabel}</div>
                <div
                  ref={rightPageWrapRef}
                  className={[
                    'canvas-page-wrap',
                    activePage   === 'right' ? 'canvas-page-wrap--active'    : '',
                    dragOverPage === 'right' ? 'canvas-page-wrap--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  onDrop={(e) => handleDrop(e, 'right')}
                  onDragOver={(e) => handleDragOver(e, 'right')}
                  onDragLeave={handleDragLeave}
                >
                  <canvas ref={rightElRef} />
                  <BleedOverlay />
                  {showGrid && <GridOverlay settings={gridSettings} />}
                  {rulerMode && <GuidesOverlay pageW={PAGE_W} pageH={PAGE_H} zoom={zoom} guides={guides} onGuidesChange={onGuidesChange} pageWrapRef={rightPageWrapRef} />}
                  {isLastSpread && (
                    <div className="canvas-no-edit-overlay" aria-hidden="true">
                      <span className="canvas-no-edit-label">{t.noEditable}</span>
                    </div>
                  )}
                  {textSel?.side === 'right' && !textEditing && (
                    <button
                      className="canvas-text-delete"
                      style={{ top: textSel.top, left: textSel.left + textSel.width }}
                      onClick={() => {
                        const fc = rightFabric.current
                        if (!fc) return
                        const obj = fc.getActiveObject()
                        if (obj) { fc.remove(obj); fc.renderAll(); setTextSel(null) }
                      }}
                      aria-label={t.deleteText}
                    >
                      <X size={9} strokeWidth={2.5} />
                    </button>
                  )}
                  {multiSel?.side === 'right' && (
                    <div className="canvas-align-toolbar" style={{ top: multiSel.selBottom + 8, left: multiSel.selLeft + multiSel.selWidth / 2 }}>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('left')}      aria-label={t.alignLeft}><AlignStartVertical size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('center-h')}  aria-label={t.alignCenterV}><AlignCenterVertical size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('right')}     aria-label={t.alignRight}><AlignEndVertical size={18} strokeWidth={1.5} /></button>
                      <div className="canvas-align-sep" />
                      <button className="canvas-align-btn" onClick={() => applyAlignment('top')}       aria-label={t.alignTop}><AlignVerticalJustifyStart size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('center-v')}  aria-label={t.alignCenterH}><AlignCenterHorizontal size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('bottom')}    aria-label={t.alignBottom}><AlignVerticalJustifyEnd size={18} strokeWidth={1.5} /></button>
                      <div className="canvas-align-sep" />
                      <button className="canvas-align-btn" onClick={() => applyAlignment('dist-v')}   aria-label={t.distributeV}><AlignVerticalSpaceAround size={18} strokeWidth={1.5} /></button>
                      <button className="canvas-align-btn" onClick={() => applyAlignment('dist-h')}   aria-label={t.distributeH}><AlignHorizontalSpaceAround size={18} strokeWidth={1.5} /></button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pan mode banner */}
            {panModeActive && (
              <div className="canvas-pan-banner">{t.editingPhoto}</div>
            )}

            {/* Navigation */}
            <div className="canvas-nav">
              <button className="canvas-nav-arrow" onClick={goLeft}  disabled={currentSpread === 0}               aria-label={t.prevPage}>{'<'}</button>
              <span   className="canvas-nav-label">
                {currentSpread === 0
                  ? t.frontCover
                  : currentSpread === totalSpreads - 1
                  ? t.backCover
                  : `${t.page} ${currentSpread}`}
              </span>
              <button className="canvas-nav-arrow" onClick={goRight} disabled={currentSpread === totalSpreads - 1} aria-label={t.nextPage}>{'>'}</button>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ── Viewport rulers — fixed to canvas-outer edges ── */}
      {rulerMode && <ViewportRulers zoom={zoom} innerRef={innerRef} guides={guides} onGuidesChange={onGuidesChange} />}

      {/* ── Viewport pan overlay — intercepts all pointer events during pan mode ── */}
      {isViewportPanning && (
        <div
          ref={vpOverlayRef}
          className="canvas-vp-overlay"
          onMouseDown={(e) => {
            isVPDragging.current = true
            if (vpOverlayRef.current) vpOverlayRef.current.style.cursor = 'grabbing'
            const inner = innerRef.current
            if (inner) vpDragStart.current = { x: e.clientX, y: e.clientY, sl: inner.scrollLeft, st: inner.scrollTop }
          }}
        />
      )}

      {/* ── Context menu ── */}
      {ctxMenu && (() => {
        const MENU_W = 178
        const MENU_H = 178
        const x = ctxMenu.x + 4 + MENU_W > window.innerWidth  ? ctxMenu.x - MENU_W : ctxMenu.x + 4
        const y = ctxMenu.y + 4 + MENU_H > window.innerHeight ? ctxMenu.y - MENU_H : ctxMenu.y + 4

        const run = (action: () => void) => {
          action()
          ctxMenu.fc.renderAll()
          setCtxMenu(null)
        }

        const deleteObj = () => {
          const { obj, fc } = ctxMenu
          type PhotoData = { type: string; frameX: number; frameY: number; frameW: number; frameH: number }
          const data = (obj as unknown as fabric.FabricObject & { data?: PhotoData }).data
          if (obj instanceof fabric.Textbox) setTextSel(null)
          fc.discardActiveObject()
          fc.remove(obj)
          if (data?.type === 'photo') restoreEmptyFrame(fc, { frameX: data.frameX, frameY: data.frameY, frameW: data.frameW, frameH: data.frameH })
          fc.renderAll()
          setCtxMenu(null)
        }

        return (
          <div
            className="canvas-ctx-menu"
            ref={ctxMenuRef}
            style={{ top: y, left: x }}
          >
            <button className="canvas-ctx-item" onClick={() => run(() => { ctxMenu.fc.bringObjectForward(ctxMenu.obj); ctxMenu.fc.fire('object:modified', { target: ctxMenu.obj }) })}>Bring Forward</button>
            <button className="canvas-ctx-item" onClick={() => run(() => { ctxMenu.fc.sendObjectBackwards(ctxMenu.obj); ctxMenu.fc.fire('object:modified', { target: ctxMenu.obj }) })}>Send Backward</button>
            <button className="canvas-ctx-item" onClick={() => run(() => { ctxMenu.fc.bringObjectToFront(ctxMenu.obj); ctxMenu.fc.fire('object:modified', { target: ctxMenu.obj }) })}>Bring to Front</button>
            <button className="canvas-ctx-item" onClick={() => run(() => { ctxMenu.fc.sendObjectToBack(ctxMenu.obj); ctxMenu.fc.fire('object:modified', { target: ctxMenu.obj }) })}>Send to Back</button>
            <div className="canvas-ctx-sep" />
            <button className="canvas-ctx-item canvas-ctx-item--delete" onClick={deleteObj}>Delete</button>
          </div>
        )
      })()}

      {/* ── Zoom controls ── */}
      <div className="canvas-zoom-badge">
        <button
          className="canvas-zoom-btn"
          onClick={() => {
            const inner   = innerRef.current
            const newZoom = parseFloat(Math.max(ZOOM_MIN, zoomRef.current - 0.1).toFixed(3))
            if (inner) {
              const cx = inner.clientWidth  / 2
              const cy = inner.clientHeight / 2
              const contentX = (cx + inner.scrollLeft - SCROLL_PAD) / zoomRef.current
              const contentY = (cy + inner.scrollTop  - SCROLL_PAD) / zoomRef.current
              applyZoom(newZoom, { x: contentX * newZoom - cx + SCROLL_PAD, y: contentY * newZoom - cy + SCROLL_PAD })
            } else {
              applyZoom(newZoom)
            }
          }}
          aria-label={t.zoomOut}
        >−</button>
        <span ref={badgeTextRef}>{Math.round(zoom * 100)}%</span>
        <button
          className="canvas-zoom-btn"
          onClick={() => {
            const inner   = innerRef.current
            const newZoom = parseFloat(Math.min(ZOOM_MAX, zoomRef.current + 0.1).toFixed(3))
            if (inner) {
              const cx = inner.clientWidth  / 2
              const cy = inner.clientHeight / 2
              const contentX = (cx + inner.scrollLeft - SCROLL_PAD) / zoomRef.current
              const contentY = (cy + inner.scrollTop  - SCROLL_PAD) / zoomRef.current
              applyZoom(newZoom, { x: contentX * newZoom - cx + SCROLL_PAD, y: contentY * newZoom - cy + SCROLL_PAD })
            } else {
              applyZoom(newZoom)
            }
          }}
          aria-label={t.zoomIn}
        >+</button>
      </div>
    </div>
  )
}
