'use client'

import { useState, useEffect } from 'react'
import { useReveal } from '../useReveal'

const REVIEWS = [
  { quote: '"Quedo hermoso la verdad, le va a encantar la sorpresa. Increíble la calidad de todo. Muchísimas gracias por todo"', name: 'Sofi L.' },
  { quote: '"Hola!! Millón de gracias por el libro! Quedó bárbaro y mamá estaba feliz"', name: 'Tere A.' },
  { quote: '"Llego impecable el viernes y se lo deje sorpresa a las 00hs, le ENCANTO y a la familia y amigas también "', name: 'Santiago G.' },
  { quote: '"Ya tengo el fotolibro en mis manos y verlo me hizo recorrer momentos quizás ya olvidados... gracias más que enormes"', name: 'Lorena Q.' },
  { quote: '"Mil gracias por todo tu laburo con los libros. Son geniales!!! Quedaron bárbaros!! Recuerdo alucinante!! "', name: 'Isa M.' },
  { quote: '"Excelente todo Maika. El servicio, la calidad, tiempo y precio"', name: 'Roberto G.' },
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
  const { ref, visible } = useReveal<HTMLDivElement>()

  useEffect(() => {
    const timer = setInterval(() => {
      setActive(i => (i + 1) % REVIEWS.length)
    }, 4000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="qs__reviews-mobile">
      <div ref={ref} className={`qs__review-card${visible ? ' qs__review-card--visible' : ''}`}>
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
