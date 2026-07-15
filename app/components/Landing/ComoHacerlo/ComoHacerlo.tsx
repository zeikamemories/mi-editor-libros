'use client'

import { Pencil, UploadCloud, type LucideIcon } from 'lucide-react'
import { useReveal } from '../useReveal'
import './ComoHacerlo.css'

type Step = { number: string; title: string; body: string; bg: string; img?: string; Icon?: LucideIcon; large?: boolean }

const STEPS: Step[] = [
  {
    number: '01',
    title:  'Elegir formato',
    body:   'Elegís el producto y la opción que más te guste.',
    Icon:   Pencil,
    bg:     '#e8f3ff',
  },
  {
    number: '02',
    title:  'Cargar el material',
    body:   'Subís tus fotos y nos compartis detalles que necesitamos para el diseño.',
    Icon:   UploadCloud,
    bg:     '#d6e7fb',
    large:  true,
  },
  {
    number: '03',
    title:  'Nosotras diseñamos',
    body:   'Diseñamos tu pieza en menos de 2 días hábiles siguiendo tus indicaciones.',
    img:    '/icons/step3.svg',
    bg:     '#adc9ea',
    large:  true,
  },
  {
    number: '04',
    title:  'Previsualizarlo',
    body:   'Te enviamos una previsualización para revisar cada detalle antes de imprimir.',
    img:    '/icons/step4.svg',
    bg:     '#83b9fb',
  },
  {
    number: '05',
    title:  'Disfrutalo!',
    body:   'Te lo enviamos a cualquier parte de Argentina a través de Andreani.',
    img:    '/icons/step5.svg',
    bg:     '#528ed6',
  },
]

function StepCard({ number, title, body, img, Icon, bg, large, delay }: Step & { delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`como__card${visible ? ' como__card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="como__icon-wrap" style={{ background: bg }}>
        {img
          ? <img src={img} alt={title} className={`como__icon${large ? ' como__icon--large' : ''}`} />
          : Icon && <Icon className={`como__icon${large ? ' como__icon--large' : ''}`} strokeWidth={1.5} color="#191919" />}
      </div>
      <div className="como__content">
        <div className="como__heading">
          <span className="como__number">{number}</span>
          <h3 className="como__title">{title}</h3>
        </div>
        <p className="como__body">{body}</p>
      </div>
    </div>
  )
}

export default function ComoHacerlo() {
  return (
    <section className="como" id="como-hacerlo">
      <p className="como__label">Cómo hacerlo</p>

      <div className="como__cards">
        {STEPS.map((step, i) => (
          <StepCard key={step.number} {...step} delay={i * 180} />
        ))}
      </div>
    </section>
  )
}
