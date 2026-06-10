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
        <div className="intro__gif-placeholder" aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/videos/Desktop-Moments.gif" alt="" className="intro__gif" />
      </div>

      <p className="intro__heading intro__heading--right">
        en recuerdos<span className="intro__mobile-br"><br /></span> eternos.
      </p>

      <div className="intro__body-row">
        <p className="intro__body">
          Diseñamos fotolibros personalizados a partir de tus fotos, viajes e historias. Vos compartís tus recuerdos, nosotras nos encargamos de transformarlos en un libro pensado para durar y revivir esos momentos una y otra vez.
        </p>
      </div>

    </section>
  )
}
