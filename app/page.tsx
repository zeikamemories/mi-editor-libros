import './components/Landing/Landing.css'
import Navbar    from './components/Landing/Navbar/Navbar'
import Hero      from './components/Landing/Hero/Hero'
import Intro     from './components/Landing/Intro/Intro'
import Productos from './components/Landing/Productos/Productos'

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <Hero />
      <Intro />
      <hr className="landing-separator" />
      <Productos />
      {/* ComoHacerlo, QuienesSomos, FAQs, Footer go here */}
    </main>
  )
}
