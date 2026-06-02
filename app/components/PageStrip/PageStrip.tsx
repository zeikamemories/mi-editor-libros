'use client'

import { useEffect, useRef, useState } from 'react'
import { Plus, X } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import './PageStrip.css'

interface PageStripProps {
  currentSpread: number
  totalContentSpreads: number
  pageW: number
  pageH: number
  onSpreadSelect: (index: number) => void
  onAddSpread: () => void
  onDeleteSpread?: (index: number) => void
  onLayoutDrop?: (spreadIndex: number, layoutId: string) => void
  thumbnails?: Record<number, { left: string; right: string }>
}

type PageInfo  = { label: string; special: boolean; cover?: boolean }
type SpreadDef = { index: number; left: PageInfo; right: PageInfo }

function buildSpreads(total: number, back: string, cover: string, inside: string, outside: string): SpreadDef[] {
  const lastLeftNum = total * 2 + 2   // e.g. 13*2+2 = 28

  const items: SpreadDef[] = [
    { index: 0, left:  { label: back,  special: true, cover: true },
                right: { label: cover, special: true, cover: true } },
    { index: 1, left:  { label: inside, special: true },
                right: { label: '01',   special: false } },
  ]

  for (let i = 0; i < total; i++) {
    const si    = i + 2
    const left  = 2 * (si - 1)
    const right = left + 1
    items.push({
      index: si,
      left:  { label: String(left).padStart(2, '0'),  special: false },
      right: { label: String(right).padStart(2, '0'), special: false },
    })
  }

  items.push({
    index: total + 2,
    left:  { label: String(lastLeftNum).padStart(2, '0'), special: false },
    right: { label: outside, special: true },
  })

  return items
}

export default function PageStrip({
  currentSpread,
  totalContentSpreads,
  pageW,
  pageH,
  onSpreadSelect,
  onAddSpread,
  onDeleteSpread,
  onLayoutDrop,
  thumbnails,
}: PageStripProps) {
  const THUMB_H = 52
  const THUMB_W = Math.round(THUMB_H * (pageW / pageH))
  const { t } = useLang()
  const spreads    = buildSpreads(totalContentSpreads, t.back, t.cover, t.inside, t.outside)
  const activeRef  = useRef<HTMLDivElement>(null)
  const scrollRef  = useRef<HTMLDivElement>(null)
  const prevTotal  = useRef(totalContentSpreads)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [hoverIndex, setHoverIndex]       = useState<number | null>(null)
  const [flashIndex, setFlashIndex]       = useState<number | null>(null)

  useEffect(() => {
    activeRef.current?.scrollIntoView({
      inline: 'nearest', behavior: 'smooth', block: 'nearest',
    })
  }, [currentSpread])

  useEffect(() => {
    if (totalContentSpreads > prevTotal.current) {
      const newIndex = prevTotal.current + 2
      setFlashIndex(newIndex)
      const el = scrollRef.current
      if (el) el.scrollTo({ left: el.scrollWidth, behavior: 'smooth' })
      const timer = setTimeout(() => setFlashIndex(null), 1400)
      prevTotal.current = totalContentSpreads
      return () => clearTimeout(timer)
    }
    prevTotal.current = totalContentSpreads
  }, [totalContentSpreads])

  // A spread is variable (deletable) if it's not one of the 3 fixed ones
  const isVariable = (spreadIndex: number) =>
    spreadIndex >= 2 && spreadIndex <= totalContentSpreads + 1

  const canDelete = totalContentSpreads > 13

  // ── Drag handlers for layout drop ─────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent, spreadIndex: number) => {
    const layoutId = e.dataTransfer.types.includes('application/zeika-layout')
    if (!layoutId) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverIndex(spreadIndex)
  }

  const handleDragLeave = () => setDragOverIndex(null)

  const handleDrop = (e: React.DragEvent, spreadIndex: number) => {
    setDragOverIndex(null)
    const layoutId = e.dataTransfer.getData('application/zeika-layout')
    if (!layoutId || !onLayoutDrop) return
    e.preventDefault()
    onLayoutDrop(spreadIndex, layoutId)
  }

  return (
    <div className="page-strip">

      {/* Fixed left section — always visible */}
      <div className="page-strip-fixed">
        <button
          className="page-strip-add"
          onClick={onAddSpread}
          title={t.addTwoPages}
          aria-label={t.addPages}
        >
          <Plus size={14} strokeWidth={1.5} />
        </button>
      </div>

      {/* Scrollable spreads */}
      <div className="page-strip-scroll" ref={scrollRef}>
        {spreads.map((spread) => {
          const active   = spread.index === currentSpread
          const variable = isVariable(spread.index)
          const dragOver = dragOverIndex === spread.index
          const flash    = flashIndex === spread.index

          return (
            <div
              key={spread.index}
              ref={active ? activeRef : null}
              className={[
                'page-strip-spread',
                active   ? 'page-strip-spread--active'   : '',
                dragOver ? 'page-strip-spread--drag-over' : '',
                flash    ? 'page-strip-spread--flash'     : '',
              ].filter(Boolean).join(' ')}
              onClick={() => onSpreadSelect(spread.index)}
              onMouseEnter={() => setHoverIndex(spread.index)}
              onMouseLeave={() => setHoverIndex(null)}
              onDragOver={(e) => handleDragOver(e, spread.index)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, spread.index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSpreadSelect(spread.index)}
              aria-current={active ? 'true' : undefined}
              aria-label={`${spread.left.label} – ${spread.right.label}`}
            >
              {/* Delete button — only for variable spreads */}
              {variable && canDelete && hoverIndex === spread.index && onDeleteSpread && (
                <button
                  className="page-strip-delete"
                  onClick={(e) => { e.stopPropagation(); onDeleteSpread(spread.index) }}
                  aria-label={t.deleteSpread}
                  title={t.delete}
                >
                  <X size={8} strokeWidth={2.5} />
                </button>
              )}

              {/* Left page */}
              <div className="page-strip-page-wrap">
                <span className={[
                  'page-strip-page-label',
                  spread.left.special ? 'page-strip-page-label--special' : '',
                  spread.left.cover   ? 'page-strip-page-label--cover'   : '',
                ].filter(Boolean).join(' ')}>
                  {spread.left.label}
                </span>
                <div className="page-strip-page-rect" style={{ width: THUMB_W, height: THUMB_H }}>
                  {thumbnails?.[spread.index]?.left && (
                    <img src={thumbnails[spread.index].left} alt="" className="page-strip-thumb" />
                  )}
                </div>
              </div>

              {/* Right page */}
              <div className="page-strip-page-wrap page-strip-page-wrap--right">
                <span className={[
                  'page-strip-page-label',
                  spread.right.special ? 'page-strip-page-label--special' : '',
                  spread.right.cover   ? 'page-strip-page-label--cover'   : '',
                ].filter(Boolean).join(' ')}>
                  {spread.right.label}
                </span>
                <div className="page-strip-page-rect" style={{ width: THUMB_W, height: THUMB_H }}>
                  {thumbnails?.[spread.index]?.right && (
                    <img src={thumbnails[spread.index].right} alt="" className="page-strip-thumb" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
