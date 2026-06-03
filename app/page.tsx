import './components/Landing/Landing.css'
import Navbar    from './components/Landing/Navbar/Navbar'
import Hero      from './components/Landing/Hero/Hero'
import Intro     from './components/Landing/Intro/Intro'
import Productos   from './components/Landing/Productos/Productos'
import ComoHacerlo   from './components/Landing/ComoHacerlo/ComoHacerlo'
import QuienesSomos  from './components/Landing/QuienesSomos/QuienesSomos'
import FAQs          from './components/Landing/FAQs/FAQs'
import Footer        from './components/Landing/Footer/Footer'

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <Hero />
      <Intro />
      <hr className="landing-separator" />
      <Productos />
      <hr className="landing-separator" />
      <ComoHacerlo />
      <QuienesSomos />
      <FAQs />
      <Footer />
    </main>
  )
}
