import './components/Landing/Landing.css'
import Navbar      from './components/Landing/Navbar/Navbar'
import Hero        from './components/Landing/Hero/Hero'
import FloatingCta from './components/Landing/Hero/FloatingCta'
import Intro       from './components/Landing/Intro/Intro'
import Productos   from './components/Landing/Productos/Productos'
import Cotizacion  from './components/Landing/Cotizacion/Cotizacion'
import NuestrosDisenos from './components/Landing/NuestrosDisenos/NuestrosDisenos'
import ComoHacerlo   from './components/Landing/ComoHacerlo/ComoHacerlo'
import QuienesSomos  from './components/Landing/QuienesSomos/QuienesSomos'
import FAQs          from './components/Landing/FAQs/FAQs'
import Footer        from './components/Landing/Footer/Footer'
import Reveal        from './components/Landing/Reveal'

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <Hero />
      <FloatingCta />
      <Reveal><Intro /></Reveal>
      <hr className="landing-separator" />
      <Productos />
      <hr className="landing-separator" />
      <Reveal className="reveal--fade"><Cotizacion /></Reveal>
      <hr className="landing-separator" />
      <Reveal><NuestrosDisenos /></Reveal>
      <hr className="landing-separator" />
      <ComoHacerlo />
      <QuienesSomos />
      <Reveal><FAQs /></Reveal>
      <Footer />
    </main>
  )
}
