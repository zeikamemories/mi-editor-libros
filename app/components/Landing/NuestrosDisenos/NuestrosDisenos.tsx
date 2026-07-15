import Link from 'next/link'
import { DESIGNS } from './designsData'
import './NuestrosDisenos.css'

// Subset shown in the scrolling carousel — "Ver más" opens the full catalog page with all of them
const CAROUSEL_ITEMS = DESIGNS.slice(0, 14)

export default function NuestrosDisenos() {
  return (
    <section className="disenos" id="disenos">
      <p className="disenos__label">Nuestros Diseños</p>

      <div className="disenos__carousel">
        <div className="disenos__track">
          {[...CAROUSEL_ITEMS, ...CAROUSEL_ITEMS].map((item, i) => (
            <div
              key={i}
              className={`disenos__item disenos__item--${item.orientation}${item.shadow ? ' disenos__item--shadow' : ''}`}
            >
              <img
                src={item.src}
                alt=""
                width={item.width}
                height={item.height}
                loading="lazy"
                decoding="async"
                className="disenos__img"
              />
            </div>
          ))}
        </div>
      </div>

      <Link href="/disenos" className="disenos__ver-mas">
        Ver más
      </Link>
    </section>
  )
}
