import './Cotizacion.css'

const WHATSAPP_NUMBER = '5491133521921'
const MESSAGE = 'Hola! Quiero consultar por un proyecto especial (libro editorial, pedido por mayor o vinos para un evento).'

export default function Cotizacion() {
  return (
    <section className="cotizacion" id="cotizacion">
      <div className="cotizacion__content">
        <p className="cotizacion__label">Proyectos a medida</p>
        <p className="cotizacion__title">¿Buscás algo distinto?</p>
        <p className="cotizacion__body">
          Libros editoriales, pedidos por mayor o vinos personalizados para eventos.
          Contanos tu proyecto y armamos una propuesta a medida.
        </p>
        <a
          className="cotizacion__link"
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(MESSAGE)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Escribinos por WhatsApp
        </a>
      </div>
    </section>
  )
}
