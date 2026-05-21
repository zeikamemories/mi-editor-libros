import './components/Landing/Landing.css'
import Navbar from './components/Landing/Navbar/Navbar'
import Hero from './components/Landing/Hero/Hero'

export default function LandingPage() {
  return (
    <main className="landing-page">
      <Navbar />
      <Hero />
      {/* Intro, Productos, etc. go here */}
    </main>
  )
}
