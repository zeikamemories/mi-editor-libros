import ReviewCarousel from './ReviewCarousel'
import './QuienesSomos.css'

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

export default function QuienesSomos() {
  return (
    <section className="qs" id="quienes-somos">

      {/* ── Label ── */}
      <p className="qs__label">Quiénes somos</p>

      {/* ── Founder ── */}
      <div className="qs__founder">
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
          <div className="qs__team-member">
            <p className="qs__team-name">Victoria Suarez</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fotos/Vicky.jpg" alt="Victoria Suarez" className="qs__team-photo" />
          </div>
          <div className="qs__team-member">
            <p className="qs__team-name">Josefina De Vicentis</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/fotos/jose.jpg" alt="Josefina De Vicentis" className="qs__team-photo" />
          </div>
        </div>
      </div>

      {/* ── Valores ── */}
      <div className="qs__valores">
        <p className="qs__sublabel">Nuestros valores</p>
        <div className="qs__valores-list">
          {VALORES.map(({ num, title, body }) => (
            <div key={num} className="qs__valor">
              <div className="qs__valor-header">
                <span className="qs__valor-num">{num}</span>
                <h3 className="qs__valor-title">{title}</h3>
              </div>
              <p className="qs__valor-body">{body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Reviews ── */}
      <div className="qs__reviews">
        <p className="qs__sublabel qs__sublabel--reviews">En palabras de nuestros clientes</p>
        <div className="qs__reviews-grid">
          {REVIEWS.map((r, i) => (
            <div key={i} className="qs__review-card">
              <Stars />
              <p className="qs__review-quote">{r.quote}</p>
              <p className="qs__review-name">{r.name}</p>
            </div>
          ))}
        </div>
        {/* Mobile: carousel with 6 dots */}
        <ReviewCarousel />
      </div>

    </section>
  )
}
