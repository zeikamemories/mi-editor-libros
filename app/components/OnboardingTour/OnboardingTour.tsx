'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useLang } from '../../context/LanguageContext'
import './OnboardingTour.css'

const STEP_TARGETS = ['.photo-panel', '.layout-panel', '.toolbar', '.page-strip', '.topbar']

interface Rect { x: number; y: number; w: number; h: number }
interface Props { open: boolean; onClose: () => void }

export default function OnboardingTour({ open, onClose }: Props) {
  const { t } = useLang()

  const STEPS = [
    { title: t.tourStep1Title, desc: t.tourStep1Desc, target: STEP_TARGETS[0] },
    { title: t.tourStep2Title, desc: t.tourStep2Desc, target: STEP_TARGETS[1] },
    { title: t.tourStep3Title, desc: t.tourStep3Desc, target: STEP_TARGETS[2] },
    { title: t.tourStep4Title, desc: t.tourStep4Desc, target: STEP_TARGETS[3] },
    { title: t.tourStep5Title, desc: t.tourStep5Desc, target: STEP_TARGETS[4] },
  ]
  const [step,      setStep]      = useState(0)
  const [spot,      setSpot]      = useState<Rect>({ x: 0, y: 0, w: 0, h: 0 })
  const [cardPos,   setCardPos]   = useState<{ top: number; left: number }>({ top: 70, left: 0 })
  const [ready,     setReady]     = useState(false)
  const svgRectRef = useRef<SVGRectElement>(null)

  const measure = useCallback((selector: string): Rect => {
    const el = document.querySelector(selector)
    if (!el) return { x: 0, y: 0, w: 0, h: 0 }
    const r = el.getBoundingClientRect()
    return { x: r.left, y: r.top, w: r.width, h: r.height }
  }, [])

  const calcCardPos = useCallback(() => {
    const btn = document.querySelector('[data-tour-trigger]')
    if (!btn) return { top: 70, left: window.innerWidth / 2 - 195 }
    const r  = btn.getBoundingClientRect()
    const cardW = 390
    let left = r.left + r.width / 2 - cardW / 2
    left = Math.max(12, Math.min(left, window.innerWidth - cardW - 12))
    return { top: r.bottom + 10, left }
  }, [])

  useEffect(() => {
    if (!open) { setReady(false); setStep(0); return }
    const newSpot = measure(STEPS[0].target)
    setSpot(newSpot)
    // Topbar is dynamically imported (ssr:false) so [data-tour-trigger] may not
    // be in the DOM yet when the tour auto-opens on mount. Delay measurement so
    // the button is available, then enable transitions 60ms later.
    const posTimer   = setTimeout(() => setCardPos(calcCardPos()), 200)
    const readyTimer = setTimeout(() => setReady(true), 260)
    return () => { clearTimeout(posTimer); clearTimeout(readyTimer) }
  }, [open, measure, calcCardPos])

  useEffect(() => {
    if (!open || !ready) return
    setSpot(measure(STEPS[step].target))
  }, [step, open, ready, measure])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  if (!open) return null

  const isFirst = step === 0
  const isLast  = step === STEPS.length - 1
  const PAD = 8

  return (
    <div className="tour-root" onClick={handleClose}>
      {/* ── Spotlight overlay ── */}
      <svg
        className="tour-svg"
        onClick={handleClose}
        aria-hidden="true"
      >
        <defs>
          <mask id="tour-mask">
            <rect width="100%" height="100%" fill="white" />
            <rect
              ref={svgRectRef}
              className={ready ? 'tour-spot-rect tour-spot-rect--animated' : 'tour-spot-rect'}
              x={spot.x - PAD}
              y={spot.y - PAD}
              width={spot.w + PAD * 2}
              height={spot.h + PAD * 2}
              rx="6"
              fill="black"
            />
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" mask="url(#tour-mask)" />
      </svg>

      {/* ── Card ── */}
      <div
        className="tour-card"
        style={{ top: cardPos.top, left: cardPos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="tour-title">{STEPS[step].title}</h2>
        <p  className="tour-desc">{STEPS[step].desc}</p>

        <div className="tour-footer">
          <div className="tour-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                className={`tour-dot${i === step ? ' tour-dot--active' : i < step ? ' tour-dot--done' : ''}`}
                onClick={() => setStep(i)}
                aria-label={`Step ${i + 1}`}
              />
            ))}
          </div>

          <div className="tour-nav">
            <button
              className="tour-nav-btn"
              onClick={() => setStep(s => s - 1)}
              aria-label="Back"
              style={{ visibility: isFirst ? 'hidden' : 'visible' }}
            >
              ←
            </button>
            {isLast ? (
              <button className="tour-nav-btn tour-nav-btn--gotit" onClick={handleClose}>
                {t.tourGotIt}
              </button>
            ) : (
              <button className="tour-nav-btn" onClick={() => setStep(s => s + 1)} aria-label="Next">
                →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
