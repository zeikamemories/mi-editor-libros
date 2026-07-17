'use client'

import './VinoMockupFrame.css'

type Props = {
  src: string | null
  className?: string
}

/**
 * Compone el diseño final de la etiqueta sobre la botella en blanco de
 * `/fotos/MockupVino.jpg` (donde dice "tu diseño acá"). Solo lectura — el
 * diseño lo sube el equipo desde el panel de admin (no hay reposicionamiento
 * interactivo como en CardPhotoFrame, la etiqueta cubre toda el área fija).
 * Sin diseño, se ve la botella en blanco tal cual.
 */
export default function VinoMockupFrame({ src, className }: Props) {
  return (
    <div className={`vino-mockup-frame${className ? ` ${className}` : ''}`}>
      <div className="vino-mockup-frame__mockup">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/fotos/MockupVino.jpg" alt="" className="vino-mockup-frame__mockup-bg" draggable={false} />
        {src && (
          <div className="vino-mockup-frame__viewport">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt="" draggable={false} className="vino-mockup-frame__img" />
          </div>
        )}
      </div>
    </div>
  )
}
