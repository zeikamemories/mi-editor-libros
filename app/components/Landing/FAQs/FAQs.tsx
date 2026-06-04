'use client'

import { useState } from 'react'
import './FAQs.css'

const FAQS = [
  {
    num: '[01]',
    q: '¿Cuánto tarda en estar listo?',
    a: 'Desde el momento en que confirmás el diseño, el libro se imprime en 3 días hábiles aproximadamente.  Para el envío estimamos entre 2 y 7 días hábiles según el destino. Si preferís, también podés retirar tu libro directamente en la fábrica (Concepción Arenal 4501, Chacarita) una vez que esté impreso.',
  },
  {
    num: '[02]',
    q: '¿Cuántas fotos entran?',
    a: 'Nuestros libros tienen entre 12 y 14 páginas base dependiendo del tamaño, y recomendamos 60 fotos para cubrirlas. Se pueden agregar hasta 40 páginas.',
  },
  {
    num: '[03]',
    q: '¿Hacen envíos?',
    a: 'Sí, enviamos a todo el país y también a Uruguay a través de Andreani. Una vez despachado tu libro, te compartimos el número de seguimiento para que puedas rastrearlo en tiempo real.',
  },
  {
    num: '[04]',
    q: '¿Hacen descuentos por cantidad?',
    a: 'Sí. Si pedís tres o más copias del mismo diseño, te hacemos un 20% de descuento desde la tercera unidad. Si los diseños son diferentes, el descuento es del 10% a partir del tercer libro.',
  },
  {
    num: '[05]',
    q: '¿Dónde queda la fábrica?',
    a: 'En Concepción Arenal 4501, Chacarita. Abrimos de lunes a viernes de 10 a 18 hs, podés pasar a retirar tu libro en esos horarios.',
  },
  {
    num: '[06]',
    q: '¿Cómo funciona el pago?',
    a: 'Aceptamos tarjeta de crédito (Visa, Mastercard y más) en 1, 3, 6 o 12 cuotas según tu banco, tarjeta de débito, y transferencia bancaria por CVU/CBU desde cualquier banco o billetera virtual. También podés pagar con saldo de Mercado Pago. El pago se divide en dos momentos: el 50% al confirmar el pedido, y el 50% restante cuando aprobás el diseño final.',
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
