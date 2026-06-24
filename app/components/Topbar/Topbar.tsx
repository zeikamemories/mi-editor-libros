'use client'

import { useState, useEffect, useRef } from 'react'
import './Topbar.css'
import Image from 'next/image'
import { Info, Share2, ArrowDownToLine, Eye, Copy, Check } from 'lucide-react'
import { useLang } from '../../context/LanguageContext'

interface TopbarProps {
  onPreview?: () => void
  onExportJpg: () => void
  onExportPdf: () => void
  isExporting: boolean
  projectId: string
  onShare?: () => void
  onTourOpen?: () => void
  saveStatus?: 'saving' | 'saved' | 'idle'
  onBack?: () => void
  projectName?: string
  bookSizeLabel?: string
  orderId?: string | null
}

export default function Topbar({ onPreview, onExportJpg, onExportPdf, isExporting, projectId, onShare, onTourOpen, saveStatus, onBack, projectName, bookSizeLabel, orderId }: TopbarProps) {
  const { lang, t, toggleLang } = useLang()

  // ── Info popover ───────────────────────────────────────────────────────────
  const [infoOpen, setInfoOpen] = useState(false)
  const infoRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!infoOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (infoRef.current && !infoRef.current.contains(e.target as Node)) setInfoOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [infoOpen])

  const orderNumber = orderId
    ? `ZK-${new Date().getFullYear()}-${orderId.substring(0, 6).toUpperCase()}`
    : null

  // ── Export dropdown ────────────────────────────────────────────────────────
  const [exportOpen, setExportOpen] = useState(false)
  const exportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!exportOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) setExportOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [exportOpen])

  // ── Share popover ──────────────────────────────────────────────────────────
  const [shareOpen, setShareOpen] = useState(false)
  const [copied,    setCopied]    = useState(false)
  const shareRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!shareOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (shareRef.current && !shareRef.current.contains(e.target as Node)) setShareOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [shareOpen])

  const handleShareClick = () => {
    onShare?.()
    setShareOpen((v) => !v)
  }

  const handleCopy = async () => {
    const url = `${window.location.origin}/preview/${projectId}`
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      const el = document.createElement('textarea')
      el.value = url
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/preview/${projectId}`
    : ''

  const returnPath = typeof window !== 'undefined'
    ? sessionStorage.getItem('zeika_return_path') ?? '/dashboard'
    : '/dashboard'

  return (
    <div className="topbar">
      <button className="topbar-back" title="Volver" onClick={onBack ?? (() => { window.location.href = returnPath })}>←</button>
      <Image
        src="/LogoZeika.png"
        alt="Zeika"
        width={44}
        height={44}
      />

      {saveStatus && saveStatus !== 'idle' && (
        <span className={`topbar-save-status topbar-save-status--${saveStatus}`}>
          {saveStatus === 'saving' ? 'Guardando…' : 'Guardado ✓'}
        </span>
      )}

      <div className="topbar-spacer" />

      <div className="topbar-actions">
        {/* Info popover */}
        <div className="topbar-info-wrap" ref={infoRef}>
          <button
            className={`topbar-action-btn${infoOpen ? ' topbar-action-btn--active' : ''}`}
            onClick={() => setInfoOpen(v => !v)}
          >
            <Info size={20} strokeWidth={1.5} />
            <span className="topbar-label">{t.description}</span>
          </button>
          {infoOpen && (
            <div className="topbar-info-popover">
              <div className="topbar-info-row">
                <span className="topbar-info-key">Nombre</span>
                <span className="topbar-info-val">{projectName || '—'}</span>
              </div>
              {orderNumber && (
                <div className="topbar-info-row">
                  <span className="topbar-info-key">Número</span>
                  <span className="topbar-info-val">{orderNumber}</span>
                </div>
              )}
              {bookSizeLabel && (
                <div className="topbar-info-row">
                  <span className="topbar-info-key">Tamaño</span>
                  <span className="topbar-info-val">{bookSizeLabel}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tour / help button */}
        <button className="topbar-action-btn topbar-help-btn" data-tour-trigger onClick={onTourOpen}>
          <span className="topbar-help-icon">?</span>
          <span className="topbar-label">Ayuda</span>
        </button>

        {/* Share button + popover */}
        <div className="topbar-share-wrap" ref={shareRef}>
          <button
            className={`topbar-action-btn${shareOpen ? ' topbar-action-btn--active' : ''}`}
            onClick={handleShareClick}
          >
            <Share2 size={20} strokeWidth={1.5} />
            <span className="topbar-label">{t.share}</span>
          </button>

          {shareOpen && (
            <div className="topbar-share-popover">
              <p className="topbar-share-label">{t.previewLink}</p>
              <div className="topbar-share-row">
                <input
                  className="topbar-share-input"
                  type="text"
                  value={shareUrl}
                  readOnly
                  onFocus={(e) => e.target.select()}
                />
                <button
                  className={`topbar-share-copy${copied ? ' topbar-share-copy--copied' : ''}`}
                  onClick={handleCopy}
                  aria-label={copied ? t.copied : t.copy}
                >
                  {copied
                    ? <Check size={15} strokeWidth={2.5} />
                    : <Copy size={15} strokeWidth={1.5} />
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Export dropdown */}
        <div className="topbar-export-wrapper" ref={exportRef}>
          <button
            className="topbar-action-btn"
            onClick={() => setExportOpen((v) => !v)}
            disabled={isExporting}
          >
            <ArrowDownToLine size={20} strokeWidth={1.5} />
            <span className="topbar-label">{isExporting ? t.exporting : t.save}</span>
          </button>

          {exportOpen && (
            <div className="topbar-export-dropdown">
              <button
                className="topbar-export-option"
                onClick={() => { setExportOpen(false); onExportJpg() }}
              >
                {t.exportJpg}
              </button>
              <button
                className="topbar-export-option"
                onClick={() => { setExportOpen(false); onExportPdf() }}
              >
                {t.exportPdf}
              </button>
            </div>
          )}
        </div>

        <button className="topbar-action-btn" onClick={onPreview}>
          <Eye size={20} strokeWidth={1.5} />
          <span className="topbar-label">{t.preview}</span>
        </button>
      </div>

      <button className="topbar-lang-toggle" onClick={toggleLang} aria-label={t.toggleLang}>
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      <button className="topbar-btn-primary">{t.reviewAndBuy}</button>
    </div>
  )
}
