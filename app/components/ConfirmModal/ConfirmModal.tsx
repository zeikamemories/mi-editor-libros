'use client'

import { useEffect, useRef } from 'react'
import { Trash2 } from 'lucide-react'
import './ConfirmModal.css'

interface Props {
  title:         string
  message:       string
  confirmLabel?: string
  cancelLabel?:  string
  loading?:      boolean
  onConfirm:     () => void
  onCancel:      () => void
}

export default function ConfirmModal({
  title,
  message,
  confirmLabel = 'Eliminar',
  cancelLabel  = 'Cancelar',
  loading      = false,
  onConfirm,
  onCancel,
}: Props) {
  const overlayRef = useRef<HTMLDivElement>(null)

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current && !loading) onCancel()
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !loading) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onCancel, loading])

  return (
    <div className="confirm-overlay" ref={overlayRef} onClick={handleOverlayClick}>
      <div className="confirm-modal">
        <div className="confirm-icon">
          <Trash2 size={20} strokeWidth={1.5} />
        </div>
        <h2 className="confirm-title">{title}</h2>
        <p className="confirm-message">{message}</p>
        <div className="confirm-actions">
          <button className="confirm-btn confirm-btn--cancel" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </button>
          <button className="confirm-btn confirm-btn--danger" onClick={onConfirm} disabled={loading}>
            {loading ? 'Eliminando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
