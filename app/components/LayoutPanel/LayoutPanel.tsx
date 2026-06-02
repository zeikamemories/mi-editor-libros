'use client'

import { useState } from 'react'
import { LAYOUTS } from '../../config/layouts'
import type { Layout } from '../../config/layouts'
import type { BookOrientation } from '../../config/bookSize'
import { useLang } from '../../context/LanguageContext'
import './LayoutPanel.css'

export type { Layout }

interface LayoutPanelProps {
  bookOrientation?: BookOrientation
  selectedPhotoCount: number
  selectedLayoutId: string | null
  onPhotoCountChange: (count: number) => void
  onLayoutSelect: (layout: Layout) => void
  onAddTexture?: (url: string) => void
  onAddSticker?: (url: string) => void
}

const TEXTURES = Array.from({ length: 12 }, (_, i) => `/texturas/text${i + 1}.jpg`)
const FONDOS = ['/fondos/fondo.jpg', ...Array.from({ length: 11 }, (_, i) => `/fondos/fondo${i + 2}.jpg`)]
const STICKERS = Array.from({ length: 13 }, (_, i) => `/stickers/stickersPNG${i + 1}.png`)
const GRAFICOS = Array.from({ length: 7 }, (_, i) => `/ilus/IlusZeika-${i + 14}.png`)

type MainTab = 'layouts' | 'fondos' | 'deco'
type FondosSubTab = 'texturas' | 'fondos'
type DecoSubTab = 'stickers' | 'graficos'

const PHOTO_COUNTS = [1, 2, 3, 4, 5]

function LayoutThumbnail({ layout, aspectRatio }: { layout: Layout; aspectRatio: number }) {
  return (
    <div className="layout-thumb-aspect" style={{ paddingBottom: `${(1 / aspectRatio) * 100}%` }}>
      <div className="layout-thumb-inner">
        {layout.frames.map((frame, i) => (
          <div
            key={i}
            className="layout-thumb-frame"
            style={{
              left:   `${(frame.x * 100).toFixed(4)}%`,
              top:    `${(frame.y * 100).toFixed(4)}%`,
              width:  `${(frame.w * 100).toFixed(4)}%`,
              height: `${(frame.h * 100).toFixed(4)}%`,
            }}
          />
        ))}
      </div>
    </div>
  )
}

const ASPECT_RATIOS: Record<BookOrientation, number> = {
  portrait:  816 / 1058,
  landscape: 1058 / 816,
  square:    1,
}

export default function LayoutPanel({
  bookOrientation = 'portrait',
  selectedPhotoCount,
  selectedLayoutId,
  onPhotoCountChange,
  onLayoutSelect,
  onAddTexture,
  onAddSticker,
}: LayoutPanelProps) {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState<MainTab>('layouts')
  const [fondosSubTab, setFondosSubTab] = useState<FondosSubTab>('texturas')
  const [decoSubTab, setDecoSubTab] = useState<DecoSubTab>('stickers')
  const [displayFilter, setDisplayFilter] = useState<number | 'all'>('all')

  const aspectRatio = ASPECT_RATIOS[bookOrientation]

  const allFiltered = LAYOUTS.filter(
    l => l.orientation === 'any' || l.orientation === bookOrientation
  )
  const layouts = displayFilter === 'all'
    ? allFiltered
    : allFiltered.filter(l => l.photoCount === displayFilter)

  return (
    <aside className="layout-panel">

      {/* ── Main tabs ── */}
      <div className="panel-tabs">
        <button
          className={`panel-tab${activeTab === 'layouts' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('layouts')}
        >
          {t.tabLayouts}
        </button>
        <button
          className={`panel-tab${activeTab === 'fondos' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('fondos')}
        >
          {t.tabFondos}
        </button>
        <button
          className={`panel-tab${activeTab === 'deco' ? ' panel-tab--active' : ''}`}
          onClick={() => setActiveTab('deco')}
        >
          {t.tabDeco}
        </button>
      </div>

      {/* ── Layouts tab ── */}
      {activeTab === 'layouts' && (
        <>
          <div className="layout-count-selector">
            {PHOTO_COUNTS.map((count) => (
              <button
                key={count}
                className={`layout-count-btn${displayFilter === count ? ' layout-count-btn--active' : ''}`}
                onClick={() => { onPhotoCountChange(count); setDisplayFilter(count) }}
                aria-label={`${count} foto${count > 1 ? 's' : ''}`}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="layout-all-row">
            <button
              className={`layout-all-btn${displayFilter === 'all' ? ' layout-all-btn--active' : ''}`}
              onClick={() => setDisplayFilter('all')}
            >
              {t.all}
            </button>
          </div>
          <div className="layout-grid">
            {layouts.map((layout) => (
              <button
                key={layout.id}
                className={`layout-thumb${selectedLayoutId === layout.id ? ' layout-thumb--selected' : ''}`}
                onClick={() => onLayoutSelect(layout)}
                aria-label={layout.nombre}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/zeika-layout', layout.id)
                  e.dataTransfer.effectAllowed = 'copy'
                }}
              >
                <LayoutThumbnail layout={layout} aspectRatio={aspectRatio} />
              </button>
            ))}
          </div>
        </>
      )}

      {/* ── Fondos tab ── */}
      {activeTab === 'fondos' && (
        <>
          <div className="panel-subtabs">
            <button
              className={`panel-subtab${fondosSubTab === 'texturas' ? ' panel-subtab--active' : ''}`}
              onClick={() => setFondosSubTab('texturas')}
            >
              {t.subTabTexturas}
            </button>
            <button
              className={`panel-subtab${fondosSubTab === 'fondos' ? ' panel-subtab--active' : ''}`}
              onClick={() => setFondosSubTab('fondos')}
            >
              {t.tabFondos}
            </button>
          </div>
          <div className="panel-content-grid">
            {fondosSubTab === 'texturas' ? (
              <div className="texture-grid">
                {TEXTURES.map((url) => (
                  <div
                    key={url}
                    className="texture-thumb"
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => onAddTexture?.(url)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddTexture?.(url)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/zeika-texture', url)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <img src={url} alt="" className="texture-img" draggable={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="texture-grid">
                {FONDOS.map((url) => (
                  <div
                    key={url}
                    className="texture-thumb"
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => onAddTexture?.(url)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddTexture?.(url)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/zeika-texture', url)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <img src={url} alt="" className="texture-img" draggable={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Deco tab ── */}
      {activeTab === 'deco' && (
        <>
          <div className="panel-subtabs">
            <button
              className={`panel-subtab${decoSubTab === 'stickers' ? ' panel-subtab--active' : ''}`}
              onClick={() => setDecoSubTab('stickers')}
            >
              {t.subTabStickers}
            </button>
            <button
              className={`panel-subtab${decoSubTab === 'graficos' ? ' panel-subtab--active' : ''}`}
              onClick={() => setDecoSubTab('graficos')}
            >
              {t.subTabGraficos}
            </button>
          </div>
          <div className="panel-content-grid">
            {decoSubTab === 'stickers' ? (
              <div className="texture-grid">
                {STICKERS.map((url) => (
                  <div
                    key={url}
                    className="texture-thumb"
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => onAddSticker?.(url)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddSticker?.(url)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/zeika-sticker', url)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <img src={url} alt="" className="texture-img" draggable={false} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="texture-grid">
                {GRAFICOS.map((url) => (
                  <div
                    key={url}
                    className="texture-thumb"
                    role="button"
                    tabIndex={0}
                    draggable
                    onClick={() => onAddSticker?.(url)}
                    onKeyDown={(e) => e.key === 'Enter' && onAddSticker?.(url)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/zeika-sticker', url)
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                  >
                    <img src={url} alt="" className="texture-img" draggable={false} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

    </aside>
  )
}
