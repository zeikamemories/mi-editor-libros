'use client'

import { useRef, useState, useEffect } from 'react'
import { Undo2, Redo2, Shapes, ImageUpscale, Type, Ruler, PaintBucket, Pipette, Grid, Square, Circle, Triangle, Minus, ArrowRight } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import type { GridSettings } from '../Canvas/Canvas'
import type { ShapeKind } from '../Canvas/fabricHelpers'
import './Toolbar.css'

interface ToolbarProps {
  canUndo: boolean
  canRedo: boolean
  rulerMode: boolean
  frameTool: boolean
  textTool:  boolean
  viewMode: 'editor' | 'spreads'
  pageBackground: string
  showGrid: boolean
  gridSettings: GridSettings
  onUndo: () => void
  onRedo: () => void
  onToggleRuler: () => void
  onTextToolToggle: () => void
  onFrameToolToggle: () => void
  onViewModeChange: (mode: 'editor' | 'spreads') => void
  onPageBgChange: (color: string) => void
  onApplyBgToAll: () => void
  onToggleGrid: () => void
  onGridSettingsChange: (s: GridSettings) => void
  onAddShape?: (kind: ShapeKind) => void
  shapeColorPickerOpen?: boolean
  selectedShapeColor?: string
  onShapeColorChange?: (color: string) => void
  onShapeColorPickerClose?: () => void
}

const SHAPE_ICONS: { kind: ShapeKind; Icon: React.ComponentType<{ size: number; strokeWidth: number }> }[] = [
  { kind: 'rect',     Icon: Square    },
  { kind: 'circle',   Icon: Circle    },
  { kind: 'triangle', Icon: Triangle  },
  { kind: 'line',     Icon: Minus     },
  { kind: 'arrow',    Icon: ArrowRight },
]

export default function Toolbar({
  canUndo,
  canRedo,
  rulerMode,
  frameTool,
  textTool,
  viewMode,
  pageBackground,
  showGrid,
  gridSettings,
  onUndo,
  onRedo,
  onToggleRuler,
  onTextToolToggle,
  onFrameToolToggle,
  onViewModeChange,
  onPageBgChange,
  onApplyBgToAll,
  onToggleGrid,
  onGridSettingsChange,
  onAddShape,
  shapeColorPickerOpen,
  selectedShapeColor,
  onShapeColorChange,
  onShapeColorPickerClose,
}: ToolbarProps) {
  const { t } = useLang()

  const SHAPE_OPTIONS = [
    { kind: 'rect'     as ShapeKind, label: t.shapeRect,     Icon: SHAPE_ICONS[0].Icon },
    { kind: 'circle'   as ShapeKind, label: t.shapeCircle,   Icon: SHAPE_ICONS[1].Icon },
    { kind: 'triangle' as ShapeKind, label: t.shapeTriangle, Icon: SHAPE_ICONS[2].Icon },
    { kind: 'line'     as ShapeKind, label: t.shapeLine,     Icon: SHAPE_ICONS[3].Icon },
    { kind: 'arrow'    as ShapeKind, label: t.shapeArrow,    Icon: SHAPE_ICONS[4].Icon },
  ]

  const [paintOpen, setPaintOpen]   = useState(false)
  const paintWrapRef  = useRef<HTMLDivElement>(null)
  const colorInputRef = useRef<HTMLInputElement>(null)

  const [gridOpen, setGridOpen]     = useState(false)
  const gridWrapRef                 = useRef<HTMLDivElement>(null)
  const gridColorRef                = useRef<HTMLInputElement>(null)

  const [shapesOpen, setShapesOpen] = useState(false)
  const shapesWrapRef               = useRef<HTMLDivElement>(null)
  const shapeColorInputRef          = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!paintOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (paintWrapRef.current && !paintWrapRef.current.contains(e.target as Node)) {
        setPaintOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [paintOpen])

  useEffect(() => {
    if (!gridOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (gridWrapRef.current && !gridWrapRef.current.contains(e.target as Node)) {
        setGridOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [gridOpen])

  useEffect(() => {
    if (!shapesOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (shapesWrapRef.current && !shapesWrapRef.current.contains(e.target as Node)) {
        setShapesOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [shapesOpen])

  useEffect(() => {
    if (!shapeColorPickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (shapesWrapRef.current && !shapesWrapRef.current.contains(e.target as Node)) {
        onShapeColorPickerClose?.()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [shapeColorPickerOpen, onShapeColorPickerClose])

  const handleEyedropper = async () => {
    type EyeDropperAPI = { open: () => Promise<{ sRGBHex: string }> }
    const EyeDropperCtor = (window as Window & { EyeDropper?: new () => EyeDropperAPI }).EyeDropper
    if (!EyeDropperCtor) return
    setPaintOpen(false)
    try {
      const result = await new EyeDropperCtor().open()
      onPageBgChange(result.sRGBHex)
    } catch {
      // user cancelled
    }
  }

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        <button
          className="toolbar-btn"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label={t.redo}
        >
          <Redo2 size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.redo}</span>
        </button>

        <button
          className="toolbar-btn"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label={t.undo}
        >
          <Undo2 size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.undo}</span>
        </button>

        {/* Shapes popover */}
        <div className="toolbar-shapes-wrap" ref={shapesWrapRef}>
          <button
            className={`toolbar-btn${shapesOpen ? ' toolbar-btn--active' : ''}`}
            onClick={() => setShapesOpen((v) => !v)}
            aria-label={t.shapes}
          >
            <Shapes size={22} strokeWidth={1.5} />
            <span className="toolbar-tooltip">{t.shapes}</span>
          </button>

          {shapesOpen && (
            <div className="toolbar-shapes-popover">
              {SHAPE_OPTIONS.map(({ kind, label, Icon }) => (
                <button
                  key={kind}
                  className="toolbar-shape-btn"
                  onClick={() => { onAddShape?.(kind); setShapesOpen(false) }}
                >
                  <Icon size={16} strokeWidth={1.5} />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}

          {shapeColorPickerOpen && selectedShapeColor != null && (
            <div className="toolbar-paint-popover toolbar-shape-color-popover">
              <div className="toolbar-paint-row">
                <button
                  className="toolbar-paint-swatch"
                  style={{ background: selectedShapeColor }}
                  onClick={() => shapeColorInputRef.current?.click()}
                  aria-label={t.pickColor}
                />
                <input
                  ref={shapeColorInputRef}
                  type="color"
                  value={selectedShapeColor.startsWith('#') ? selectedShapeColor : '#d0d0d0'}
                  onChange={(e) => onShapeColorChange?.(e.target.value)}
                  className="toolbar-paint-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <span className="toolbar-shape-color-label">{t.color}</span>
              </div>
            </div>
          )}
        </div>

        <button
          className={`toolbar-btn${frameTool ? ' toolbar-btn--active' : ''}`}
          onClick={onFrameToolToggle}
          aria-label={t.photoFrame}
        >
          <ImageUpscale size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.photoFrame}</span>
        </button>

        <button
          className={`toolbar-btn${textTool ? ' toolbar-btn--active' : ''}`}
          onClick={onTextToolToggle}
          aria-label={t.text}
        >
          <Type size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.text}</span>
        </button>

        <button
          className={`toolbar-btn${rulerMode ? ' toolbar-btn--active' : ''}`}
          onClick={onToggleRuler}
          aria-label={t.ruler}
        >
          <Ruler size={22} strokeWidth={1.5} />
          <span className="toolbar-tooltip">{t.ruler}</span>
        </button>

        {/* Grid */}
        <div className="toolbar-grid-wrap" ref={gridWrapRef}>
          <button
            className={`toolbar-btn${showGrid ? ' toolbar-btn--active' : ''}`}
            onClick={() => {
              if (!showGrid) { onToggleGrid(); setGridOpen(true) }
              else if (gridOpen) { setGridOpen(false) }
              else { onToggleGrid() }
            }}
            aria-label={t.grid}
          >
            <Grid size={22} strokeWidth={1.5} />
            <span className="toolbar-tooltip">{t.grid}</span>
          </button>

          {gridOpen && (
            <div className="toolbar-grid-popover">
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">{t.columns}</label>
                <input
                  className="toolbar-grid-number"
                  type="number" min={1} max={50}
                  value={gridSettings.cols}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, cols: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">{t.rows}</label>
                <input
                  className="toolbar-grid-number"
                  type="number" min={1} max={50}
                  value={gridSettings.rows}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, rows: Math.max(1, parseInt(e.target.value) || 1) })}
                />
              </div>
              <div className="toolbar-grid-row">
                <label className="toolbar-grid-label">{t.color}</label>
                <button
                  className="toolbar-paint-swatch toolbar-grid-swatch"
                  style={{ background: gridSettings.color }}
                  onClick={() => gridColorRef.current?.click()}
                  aria-label={t.pickColor}
                />
                <input
                  ref={gridColorRef}
                  type="color"
                  value={gridSettings.color}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, color: e.target.value })}
                  className="toolbar-paint-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />
              </div>
              <div className="toolbar-grid-row toolbar-grid-row--slider">
                <label className="toolbar-grid-label">{t.opacity}</label>
                <input
                  className="toolbar-grid-slider"
                  type="range" min={0} max={100}
                  value={gridSettings.opacity}
                  onChange={(e) => onGridSettingsChange({ ...gridSettings, opacity: parseInt(e.target.value) })}
                />
                <span className="toolbar-grid-pct">{gridSettings.opacity}%</span>
              </div>
              <div className="toolbar-grid-row toolbar-grid-row--thickness">
                <label className="toolbar-grid-label">{t.thickness}</label>
                <div className="toolbar-grid-toggle">
                  <button
                    className={`toolbar-grid-toggle-btn${gridSettings.thickness === 'thin' ? ' toolbar-grid-toggle-btn--active' : ''}`}
                    onClick={() => onGridSettingsChange({ ...gridSettings, thickness: 'thin' })}
                  >{t.thin}</button>
                  <button
                    className={`toolbar-grid-toggle-btn${gridSettings.thickness === 'normal' ? ' toolbar-grid-toggle-btn--active' : ''}`}
                    onClick={() => onGridSettingsChange({ ...gridSettings, thickness: 'normal' })}
                  >{t.normal}</button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Paint bucket */}
        <div className="toolbar-paint-wrap" ref={paintWrapRef}>
          <button
            className={`toolbar-btn${paintOpen ? ' toolbar-btn--active' : ''}`}
            onClick={() => setPaintOpen((v) => !v)}
            aria-label={t.bgColor}
          >
            <PaintBucket size={22} strokeWidth={1.5} />
            <span className="toolbar-tooltip">{t.bgColor}</span>
          </button>

          {paintOpen && (
            <div className="toolbar-paint-popover">
              <div className="toolbar-paint-row">
                <button
                  className="toolbar-paint-swatch"
                  style={{ background: pageBackground }}
                  onClick={() => colorInputRef.current?.click()}
                  aria-label={t.openColorPicker}
                />
                <input
                  ref={colorInputRef}
                  type="color"
                  value={pageBackground.startsWith('#') ? pageBackground : '#ffffff'}
                  onChange={(e) => onPageBgChange(e.target.value)}
                  className="toolbar-paint-input"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  className="toolbar-paint-eyedropper"
                  onClick={handleEyedropper}
                  aria-label={t.eyedropper}
                >
                  <Pipette size={15} strokeWidth={1.5} />
                </button>
              </div>
              <button
                className="toolbar-paint-apply-all"
                onClick={() => { onApplyBgToAll(); setPaintOpen(false) }}
              >
                {t.applyToAll}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar-view-toggle">
        <button
          className={`toolbar-view-btn${viewMode === 'editor' ? ' toolbar-view-btn--active' : ''}`}
          onClick={() => onViewModeChange('editor')}
          aria-label={t.editorView}
        >
          <svg width="17" height="12" viewBox="0 0 17 12" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="16" height="11" rx="1.5" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
        <button
          className={`toolbar-view-btn${viewMode === 'spreads' ? ' toolbar-view-btn--active' : ''}`}
          onClick={() => onViewModeChange('spreads')}
          aria-label={t.spreadsView}
        >
          <svg width="17" height="13" viewBox="0 0 17 13" fill="none" aria-hidden="true">
            <rect x="0.5" y="0.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="9.5" y="0.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="0.5" y="7.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
            <rect x="9.5" y="7.5" width="7" height="5" rx="1" stroke="currentColor" strokeWidth="1"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
