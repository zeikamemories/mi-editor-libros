'use client'

import ReviewCarousel from './ReviewCarousel'
import { useReveal } from '../useReveal'
import './QuienesSomos.css'

type TeamMemberData = { name: string; photo: string; extra?: boolean; delay: number }

// El orden de "delay" sigue el orden visual en desktop (Victoria, Azucena, Josefina —
// Josefina y Azucena se reordenan por CSS `order` en ese breakpoint), no el orden del DOM.
const TEAM: TeamMemberData[] = [
  { name: 'Victoria Suarez',      photo: '/fotos/Vicky.jpg',                delay: 0   },
  { name: 'Josefina De Vicentis', photo: '/fotos/jose.jpg',                 delay: 260 },
  { name: 'Azucena Uranga',       photo: '/fotos/azu.jpg', extra: true,     delay: 130 },
]

function TeamMember({ name, photo, extra, delay }: TeamMemberData) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`qs__team-member${extra ? ' qs__team-member--extra' : ''}${visible ? ' qs__team-member--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="qs__team-name">{name}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photo} alt={name} className="qs__team-photo" />
    </div>
  )
}

const VALORES = [
  {
    num:   '[01]',
    title: 'Memoria',
    body:  'Cada historia merece ser recordada. Diseñamos para preservar lo que realmente importa.',
  },
  {
    num:   '[02]',
    title: 'Diseño',
    body:  'Prestamos atención a cada detalle para crear piezas auténticas, cuidadas y con identidad.',
  },
  {
    num:   '[03]',
    title: 'Permanencia',
    body:  'Creamos objetos pensados para durar, acompañar y trascender el paso del tiempo.',
  },
]

function ValorCard({ num, title, body, delay }: { num: string; title: string; body: string; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`qs__valor${visible ? ' qs__valor--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <div className="qs__valor-header">
        <span className="qs__valor-num">{num}</span>
        <h3 className="qs__valor-title">{title}</h3>
      </div>
      <p className="qs__valor-body">{body}</p>
    </div>
  )
}

const REVIEWS = [
  { quote: '"Quedo hermoso la verdad, le va a encantar la sorpresa. Increíble la calidad de todo. Muchísimas gracias por todo"', name: 'Sofi L.' },
  { quote: '"Hola!! Millón de gracias por el libro! Quedó bárbaro y mamá estaba feliz"',                                        name: 'Tere A.' },
  { quote: '"Llego impecable el viernes y se lo deje sorpresa a las 00hs, le ENCANTO y a la familia y amigas también"',         name: 'Santiago G.' },
  { quote: '"Ya tengo el fotolibro en mis manos y verlo me hizo recorrer momentos quizás ya olvidados... gracias más que enormes"', name: 'Lorena Q.' },
  { quote: '"Mil gracias por todo tu laburo con los libros. Son geniales!!! Quedaron bárbaros!! Recuerdo alucinante!!"',        name: 'Isa M.' },
  { quote: '"Excelente todo Maika. El servicio, la calidad, tiempo y precio"',                                                  name: 'Roberto G.' },
]

function Stars() {
  return (
    <div className="qs__stars">
      {[1,2,3,4,5].map(i => <span key={i} className="qs__star">★</span>)}
    </div>
  )
}

function ReviewCard({ quote, name, delay }: { quote: string; name: string; delay: number }) {
  const { ref, visible } = useReveal<HTMLDivElement>()

  return (
    <div
      ref={ref}
      className={`qs__review-card${visible ? ' qs__review-card--visible' : ''}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      <Stars />
      <p className="qs__review-quote">{quote}</p>
      <p className="qs__review-name">{name}</p>
    </div>
  )
}

export default function QuienesSomos() {
  const { ref: founderRef, visible: founderVisible } = useReveal<HTMLDivElement>()

  return (
    <section className="qs" id="quienes-somos">

      {/* ── Label ── */}
      <p className="qs__label">Quiénes somos</p>

      {/* ── Founder ── */}
      <div ref={founderRef} className={`qs__founder${founderVisible ? ' qs__founder--visible' : ''}`}>
        <div className="qs__founder-photo-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/fotos/founder3.jpg" alt="Maika" className="qs__founder-photo" />
        </div>
        <div className="qs__founder-letter">
          <p className="qs__founder-text">
            Hola! Mi nombre es Maika. Desde muy chica disfruto viajar y vivir diferentes experiencias. Soy una persona nostálgica y, de alguna manera siempre termino volviendo a esos recuerdos.
            <br />
            Zeika nace en 2020 a partir de ese deseo: hacer eternos los momentos vividos.
            <br className="qs__break-mobile" />
            {' '}Creo profundamente en las conexiones humanas y en cómo los recuerdos pueden fortalecer estas.
            {' '}Hoy ya somos un equipo que cree en lo mismo y trabaja todos los días para ayudarte a recordar tu historia de la mejor manera posible.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/firma.png" alt="Maika" className="qs__signature" />
        </div>
      </div>

      {/* ── Equipo ── */}
      <div className="qs__equipo">
        <p className="qs__sublabel">Nuestro equipo</p>
        <div className="qs__team-photos">
          {TEAM.map(member => (
            <TeamMember key={member.name} {...member} />
          ))}
        </div>
      </div>

      {/* ── Valores ── */}
      <div className="qs__valores">
        <p className="qs__sublabel">Nuestros valores</p>
        <div className="qs__valores-list">
          {VALORES.map((valor, i) => (
            <ValorCard key={valor.num} {...valor} delay={i * 150} />
          ))}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="qs__reviews">
        <p className="qs__sublabel qs__sublabel--reviews">En palabras de nuestros clientes</p>
        <div className="qs__reviews-grid">
          {REVIEWS.map((r, i) => (
            <ReviewCard key={i} quote={r.quote} name={r.name} delay={i * 120} />
          ))}
        </div>
        {/* Mobile: carousel with 6 dots */}
        <ReviewCarousel />
      </div>

    </section>
  )
}
