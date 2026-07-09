'use client'

import './AgeGateModal.css'

type Props = { onConfirm: () => void; onDecline: () => void }

export default function AgeGateModal({ onConfirm, onDecline }: Props) {
  return (
    <div className="agv-backdrop" onClick={onDecline}>
      <div className="agv" onClick={e => e.stopPropagation()}>
        <div className="agv__header">
          <span className="agv__label">DISCLAIMER</span>
          <button className="agv__close" onClick={onDecline} aria-label="Cerrar">×</button>
        </div>

        <h2 className="agv__title">¿Tenés +18 años?</h2>
        <p className="agv__body">
          Para entrar tenés que ser mayor de edad en tu país de residencia.
        </p>
        <p className="agv__fine">
          Beber con moderación. Prohibida su venta a menores de 18 años.
        </p>

        <div className="agv__actions">
          <button className="agv__btn" onClick={onConfirm}>Sí</button>
          <button className="agv__btn" onClick={onDecline}>No</button>
        </div>
      </div>
    </div>
  )
}
