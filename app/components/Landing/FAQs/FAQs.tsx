'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './FAQs.css'

const FAQS = [
  {
    num: '[01]',
    q: '¿Cuánto tarda en estar listo?',
    a: 'El libro está listo para ser retirado por fábrica en 5 días hábiles. A eso hay que sumarle el tiempo de envío, que depende de tu dirección, pero se estiman entre 2 y 7 días hábiles para la entrega.',
  },
  {
    num: '[02]',
    q: '¿Cuántas fotos entran?',
    a: 'Sugerimos entre 40 y 200 fotos, pero podés subir las que quieras — nosotras nos encargamos de organizarlas.',
  },
  {
    num: '[03]',
    q: '¿Hacen envíos?',
    a: 'Sí, enviamos a todo Argentina a través de Andreani. Una vez despachado tu libro, te compartimos el número de seguimiento para que puedas rastrearlo en tiempo real.',
  },
  {
    num: '[04]',
    q: '¿Hacen descuentos por cantidad?',
    a: 'Sí. Si pedís tres o más copias del mismo libro, aplicamos un 25% de descuento a partir de la tercera unidad, inclusive.',
  },
  {
    num: '[05]',
    q: '¿Dónde queda la fábrica?',
    a: 'En Concepción Arenal 4501, Chacarita. Abrimos de lunes a viernes de 10 a 18 hs, podés pasar a retirar tu libro en esos horarios.',
  },
  {
    num: '[06]',
    q: '¿Cómo funciona el pago?',
    a: 'Cobramos a través de Mercado Pago, así que podés pagar con tarjeta de crédito o débito, transferencia, o saldo de MP — lo que te resulte más cómodo. El pago se divide en dos: el 50% al confirmar el pedido, y el otro 50% cuando aprobás el diseño final.',
  },
]

export default function FAQs() {
  const [open, setOpen] = useState<number | null>(0)

  function toggle(i: number) {
    setOpen(prev => prev === i ? null : i)
  }

  return (
    <section className="faqs" id="faqs">
      <p className="faqs__label">Preguntas frecuentes</p>

      <div className="faqs__list">
        {FAQS.map(({ num, q, a }, i) => (
          <div key={num} className="faqs__item">
            <button
              className="faqs__question"
              onClick={() => toggle(i)}
              aria-expanded={open === i}
            >
              <span className="faqs__num">{num}</span>
              <span className="faqs__q-text">{q}</span>
              <ChevronDown
                className={`faqs__chevron${open === i ? ' faqs__chevron--open' : ''}`}
                size={20}
                strokeWidth={1.5}
              />
            </button>
            {open === i && (
              <p className="faqs__answer">{a}</p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
