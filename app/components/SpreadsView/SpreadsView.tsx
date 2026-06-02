'use client'

import { useState, useRef } from 'react'
import { useLang } from '../../context/LanguageContext'
import './SpreadsView.css'

interface SpreadsViewProps {
  thumbnails: Record<number, { left: string; right: string }>
  totalSpreads: number
  currentSpread: number
  pageW: number
  pageH: number
  onSpreadSelect: (spread: number) => void
  onReorderSpreads: (fromIndex: number, toIndex: number) => void
}

function spreadLabel(
  spread: number,
  totalSpreads: number,
  back: string,
  cover: string,
  interna: string,
): { left: string; right: string } {
  if (spread === 0) return { left: back, right: cover }
  if (spread === 1) return { left: interna, right: '01' }
  if (spread === totalSpreads - 1) {
    const lastLeft = String((totalSpreads - 3) * 2 + 2).padStart(2, '0')
    return { left: lastLeft, right: interna }
  }
  const leftNum  = 2 * (spread - 1)
  const rightNum = leftNum + 1
  return { left: String(leftNum).padStart(2, '0'), right: String(rightNum).padStart(2, '0') }
}

export default function SpreadsView({
  thumbnails,
  totalSpreads,
  currentSpread,
  pageW,
  pageH,
  onSpreadSelect,
  onReorderSpreads,
}: SpreadsViewProps) {
  const pageAspect  = `${pageW} / ${pageH}`
  const isLandscape = pageW > pageH
  const gridColumns = isLandscape ? 3 : 4
  const wrapperWidth = isLandscape ? '88%' : '70%'
  const { t } = useLang()
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)
  // Prevents click from firing after a drag completes
  const hasDraggedRef = useRef(false)

  const handleDragStart = (e: React.DragEvent, i: number) => {
    hasDraggedRef.current = false
    setDraggingIdx(i)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnter = (i: number) => {
    if (draggingIdx === null || draggingIdx === i) return
    setDragOverIdx(i)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, i: number) => {
    e.preventDefault()
    if (draggingIdx === null || draggingIdx === i) return
    hasDraggedRef.current = true
    onReorderSpreads(draggingIdx, i)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  const handleDragEnd = () => {
    hasDraggedRef.current = true
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <div className="spreads-root">

      {/* ── Spreads grid ── */}
      <div className="spreads-scroll">
        <div className="spreads-grid-wrapper" style={{ width: wrapperWidth }}>
          <div className="spreads-grid" style={{ gridTemplateColumns: `repeat(${gridColumns}, 1fr)` }}>
            {Array.from({ length: totalSpreads }, (_, i) => {
              const { left: leftLbl, right: rightLbl } = spreadLabel(i, totalSpreads, t.back, t.cover, t.interna)
              const thumb = thumbnails[i]
              const isActive   = i === currentSpread
              const isDragging = i === draggingIdx
              const isDragOver = i === dragOverIdx && draggingIdx !== null && draggingIdx !== i

              return (
                <div
                  key={i}
                  className={[
                    'spreads-card',
                    isActive   ? 'spreads-card--active'   : '',
                    isDragging ? 'spreads-card--dragging' : '',
                    isDragOver ? 'spreads-card--drag-over' : '',
                  ].filter(Boolean).join(' ')}
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragEnter={() => handleDragEnter(i)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, i)}
                  onDragEnd={handleDragEnd}
                  onClick={() => { if (!hasDraggedRef.current) onSpreadSelect(i); hasDraggedRef.current = false }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && onSpreadSelect(i)}
                  aria-label={`Spread ${leftLbl} – ${rightLbl}`}
                  aria-current={isActive ? 'true' : undefined}
                >
                  <div className="spreads-card-label">
                    <span>{leftLbl}</span>
                    <span>{rightLbl}</span>
                  </div>
                  <div className="spreads-card-pages">
                    {thumb?.left  ? <img className="spreads-card-page" style={{ aspectRatio: pageAspect }} src={thumb.left}  alt={leftLbl}  draggable={false} /> : <div className="spreads-card-page spreads-card-page--blank" style={{ aspectRatio: pageAspect }} />}
                    {thumb?.right ? <img className="spreads-card-page" style={{ aspectRatio: pageAspect }} src={thumb.right} alt={rightLbl} draggable={false} /> : <div className="spreads-card-page spreads-card-page--blank" style={{ aspectRatio: pageAspect }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

    </div>
  )
}
