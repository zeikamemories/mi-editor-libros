import './Hero.css'

export default function Hero() {
  return (
    <section className="hero">
      <video
        className="hero__video hero__video--mobile"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/Animacion-Hero-Mobile.mp4" type="video/mp4" />
      </video>

      <video
        className="hero__video hero__video--desktop"
        autoPlay
        muted
        loop
        playsInline
      >
        <source src="/videos/Animacion-Hero.mp4" type="video/mp4" />
      </video>

      <div className="hero__content">
        <h1 className="hero__title hero__title--desktop">
          Eternizamos momentos<br />
          a través de fotolibros<br />
          personalizados.
        </h1>
        <h1 className="hero__title hero__title--mobile">
          Eternizamos momentos<br />
          a través<br />
          de fotolibros personalizados
        </h1>
      </div>

      <a href="/nuevo" className="hero__cta">
        CONTAR MI HISTORIA
      </a>
    </section>
  )
}
