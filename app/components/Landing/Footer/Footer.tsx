import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">

      {/* ── Blue card (desktop) / full section (mobile) ── */}
      <div className="footer__card">

        {/* Logo circle */}
        <div className="footer__logo-circle">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/LogoZeika.png" alt="Zeika" className="footer__logo" />
        </div>

        {/* Nav links — desktop only */}
        <div className="footer__links">
          <div className="footer__col">
            <p className="footer__col-title">Menú</p>
            <div className="footer__col-items">
              <a href="#productos"    className="footer__link">Productos</a>
              <a href="#como-hacerlo" className="footer__link">Cómo hacerlo</a>
              <a href="#quienes"      className="footer__link">Quienes somos</a>
              <a href="#faqs"         className="footer__link">FAQs</a>
            </div>
          </div>
          <div className="footer__col">
            <p className="footer__col-title">Perfil</p>
            <div className="footer__col-items">
              <a href="#" className="footer__link">Mi cuenta</a>
              <a href="#" className="footer__link">Mis pedidos</a>
              <a href="#" className="footer__link">Favoritos</a>
            </div>
          </div>
          <div className="footer__col">
            <p className="footer__col-title">Contacto</p>
            <div className="footer__col-items">
              <a href="tel:+5411XXXXXXXX" className="footer__link">+54 11 XXXX XXXX</a>
              <a href="mailto:hola@zeika.com.ar" className="footer__link">hola@zeika.com.ar</a>
            </div>
          </div>
        </div>

        {/* Mobile nav links */}
        <div className="footer__mobile-nav">
          <a href="#productos"    className="footer__mobile-link">Productos</a>
          <a href="#como-hacerlo" className="footer__mobile-link">Cómo hacerlo</a>
          <a href="#quienes"      className="footer__mobile-link">Quienes somos</a>
          <a href="#faqs"         className="footer__mobile-link">FAQs</a>
        </div>

        {/* Contact + socials */}
        <div className="footer__contact">
          <p className="footer__contact-title">Contactanos</p>
          <div className="footer__socials">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/social/facebook.svg"  alt="Facebook"  className="footer__social-icon" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/social/twitter.svg"   alt="Twitter"   className="footer__social-icon" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/social/instagram.svg" alt="Instagram" className="footer__social-icon" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icons/social/whatsapp.svg"  alt="WhatsApp"  className="footer__social-icon" />
          </div>
        </div>

        {/* Desktop socials (different position) */}
        <div className="footer__desktop-socials">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/social/facebook.svg"  alt="Facebook"  className="footer__desktop-social-icon" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/social/twitter.svg"   alt="Twitter"   className="footer__desktop-social-icon" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/social/instagram.svg" alt="Instagram" className="footer__desktop-social-icon" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/social/whatsapp.svg"  alt="WhatsApp"  className="footer__desktop-social-icon" />
        </div>
        {/* Legal strip — inside card */}
        <p className="footer__legal">
          © 2025 Zeika. Todos los derechos reservados. Concepción Arenal 4501, Chacarita, Buenos Aires, Argentina.
        </p>
      </div>
    </footer>
  )
}
