'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { DESIGNS } from '../components/Landing/NuestrosDisenos/designsData'
import DesignModal from './DesignModal'
import './disenos.css'

// Reading order for a CSS-column masonry grid: the browser fills each column top-to-bottom,
// so "row 1 left to right" actually means "the 1st item of every column, in column order" —
// measured from real DOM positions (not just assumed even chunking) so it tracks whatever the
// browser's column-balancing produced, at the current breakpoint's column count.
function computeVisualOrder(items: (HTMLElement | null)[]): number[] {
  const rects = items
    .map((el, i) => (el ? { i, left: el.getBoundingClientRect().left, top: el.getBoundingClientRect().top } : null))
    .filter((r): r is { i: number; left: number; top: number } => r !== null)

  const columnLefts = Array.from(new Set(rects.map(r => Math.round(r.left)))).sort((a, b) => a - b)
  const columns: number[][] = columnLefts.map(() => [])
  rects.forEach(r => {
    const colIdx = columnLefts.indexOf(Math.round(r.left))
    columns[colIdx].push(r.i)
  })
  columns.forEach(col => col.sort((a, b) => {
    const ta = rects.find(r => r.i === a)!.top
    const tb = rects.find(r => r.i === b)!.top
    return ta - tb
  }))

  const maxLen = Math.max(0, ...columns.map(c => c.length))
  const order: number[] = []
  for (let row = 0; row < maxLen; row++) {
    for (const col of columns) {
      if (col[row] !== undefined) order.push(col[row])
    }
  }
  return order
}

export default function DisenosPage() {
  const [selected, setSelected] = useState<number | null>(null)
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([])
  const [visualOrder, setVisualOrder] = useState<number[]>(() => DESIGNS.map((_, i) => i))

  useLayoutEffect(() => {
    // Next.js client-side navigation can leave the previous page's scroll position painted
    // for a frame before this runs — use useLayoutEffect (before paint) instead of useEffect.
    // Also disable `scroll-behavior: smooth` momentarily: Safari/WebKit sometimes ignores
    // `behavior: 'instant'` when that's set globally, animating instead of jumping.
    const root = document.documentElement
    const prevBehavior = root.style.scrollBehavior
    root.style.scrollBehavior = 'auto'
    window.scrollTo(0, 0)
    root.style.scrollBehavior = prevBehavior
  }, [])

  useEffect(() => {
    const recompute = () => setVisualOrder(computeVisualOrder(itemRefs.current))
    recompute()

    let resizeTimer: ReturnType<typeof setTimeout>
    const onResize = () => {
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(recompute, 150)
    }
    window.addEventListener('resize', onResize)
    return () => {
      clearTimeout(resizeTimer)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  return (
    <main className="disenos-page">
      <div className="disenos-page__inner">
        <div className="disenos-page__header">
          <Link href="/#disenos" className="disenos-page__back">← Volver</Link>
          <p className="disenos-page__title">Nuestros Diseños</p>
        </div>

        <div className="disenos-page__grid">
          {DESIGNS.map((item, i) => (
            <button
              key={i}
              type="button"
              ref={el => { itemRefs.current[i] = el }}
              className={`disenos-page__item${item.shadow ? ' disenos-page__item--shadow' : ''}`}
              onClick={() => setSelected(i)}
            >
              <img
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
                className="disenos-page__img"
              />
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
        <DesignModal
          items={DESIGNS}
          order={visualOrder}
          index={selected}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
        />
      )}
    </main>
  )
}
