import './Intro.css'

export default function Intro() {
  return (
    <section className="intro">

      <p className="intro__heading intro__heading--left intro__heading--desktop">
        Transformamos instantes
      </p>

      <p className="intro__heading intro__heading--left intro__heading--mobile">
        Transformamos<br />momentos
      </p>

      <div className="intro__gif-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/videos/gif-moments-2.gif" alt="" className="intro__gif intro__gif--mobile" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/videos/Desktop-Moments.gif" alt="" className="intro__gif intro__gif--desktop" />
      </div>

      <p className="intro__heading intro__heading--right">
        en recuerdos<span className="intro__mobile-br"><br /></span> eternos.
      </p>

      <div className="intro__body-row">
        <p className="intro__body">
          En Zeika creemos en el poder de la memoria y la permanencia. Somos un estudio de diseño que materializa historias e identidades en piezas con significado, pensadas para perdurar en el tiempo.
        </p>
      </div>

    </section>
  )
}
