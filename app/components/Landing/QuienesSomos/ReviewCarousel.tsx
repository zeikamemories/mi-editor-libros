'use client'

import { useState, useEffect } from 'react'

const REVIEWS = [
  { quote: '"Excelente todo!! El servicio, la calidad, tiempo y precio... muy bien hecho todo!! Recomiendo 100%"', name: 'Maika S.' },
  { quote: '"Ameeee el libro! Son geniales!! Quedaron bárbaros, recuerdo para toda la vida!"', name: 'Maika S.' },
  { quote: '"Estoy tan emocionada! Verlo me hizo recorrer momentos quizás ya olvidados... gracias más que enormes"', name: 'Maika S.' },
  { quote: '"Excelente todo!! El servicio, la calidad, tiempo y precio... muy bien hecho todo!! Recomiendo 100%"', name: 'Maika S.' },
  { quote: '"Ameeee el libro! Son geniales!! Quedaron bárbaros, recuerdo para toda la vida!"', name: 'Maika S.' },
  { quote: '"Estoy tan emocionada! Verlo me hizo recorrer momentos quizás ya olvidados... gracias más que enormes"', name: 'Maika S.' },
]

function Stars() {
  return (
    <div className="qs__stars">
      {[1,2,3,4,5].map(i => <span key={i} className="qs__star">★</span>)}
    </div>
  )
}

export default function ReviewCarousel() {
  const [active, setActive] = useState(0)
  const r = REVIEWS[active]

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(i => (i + 1) % REVIEWS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="qs__reviews-mobile">
      <div className="qs__review-card">
        <Stars />
        <p className="qs__review-quote">{r.quote}</p>
        <p className="qs__review-name">{r.name}</p>
      </div>
      <div className="qs__dots">
        {REVIEWS.map((_, i) => (
          <button
            key={i}
            className={`qs__dot${i === active ? ' qs__dot--active' : ''}`}
            onClick={() => setActive(i)}
            aria-label={`Reseña ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
