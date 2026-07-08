'use client'

import { useState, useEffect, useRef } from 'react'
import {
  X, AlignLeft, AlignCenter, AlignRight, AlignJustify,
  CirclePlus, CircleMinus, ChevronDown,
} from 'lucide-react'
import { useLang } from '../../context/LanguageContext'
import './TextModal.css'

// ─── Font options ────────────────────────────────────────────────────────────

export const TEXT_FONTS = [
  { label: 'Amandine',              value: 'amandine' },
  { label: 'Costumed Hero',         value: 'CostumedHero' },
  { label: 'Overused Grotesk',      value: 'OverusedGrotesk' },
  { label: 'Helvetica Neue',        value: 'helvetica-neue-lt-pro' },
  { label: 'Times New Roman',       value: 'Times New Roman' },
  { label: 'Adobe Garamond Pro',    value: 'adobe-garamond-pro' },
  { label: 'Century Old Style',     value: 'century-old-style-std' },
  { label: 'Geller Headline',       value: 'geller-headline' },
  { label: 'Handwriting Tiffany',   value: 'adobe-handwriting-tiffany' },
  { label: 'Bauer Bodoni',          value: 'BauerBodoni' },
  { label: 'Handwriting Ernie',     value: 'adobe-handwriting-ernie' },
  { label: 'Handwriting Frank',     value: 'adobe-handwriting-frank' },
] as const

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TextOpts {
  text:        string
  fontFamily:  string
  bold:        boolean
  underline:   boolean
  textAlign:   string
  fontSize:    number
  fill:        string
  lineHeight:  number
  charSpacing: number
}

interface Props {
  initialText:         string
  initialFont:         string
  initialBold:         boolean
  initialUnderline:    boolean
  initialAlign:        string
  initialSize:         number
  initialColor:        string
  initialLineHeight:   number
  initialCharSpacing:  number
  onConfirm: (opts: TextOpts) => void
  onCancel:  () => void
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TextModal({
  initialText, initialFont, initialBold, initialUnderline,
  initialAlign, initialSize, initialColor,
  initialLineHeight, initialCharSpacing,
  onConfirm, onCancel,
}: Props) {
  const [text,        setText]        = useState(initialText)
  const [fontFamily,  setFontFamily]  = useState(initialFont || TEXT_FONTS[0].value)
  const [bold,        setBold]        = useState(initialBold)
  const [underline,   setUnderline]   = useState(initialUnderline)
  const [textAlign,   setTextAlign]   = useState(initialAlign || 'left')
  const [fontSize,    setFontSize]    = useState(initialSize  || 24)
  const [fill,        setFill]        = useState(initialColor || '#191919')
  const [lineHeight,  setLineHeight]  = useState(initialLineHeight  ?? 1.16)
  const [charSpacing, setCharSpacing] = useState(initialCharSpacing ?? 0)

  const { t } = useLang()
  const [fontPickerOpen, setFontPickerOpen] = useState(false)
  const [hoveredFont,    setHoveredFont]    = useState<string | null>(null)
  const colorInputRef  = useRef<HTMLInputElement>(null)
  const textareaRef    = useRef<HTMLTextAreaElement>(null)
  const fontPickerRef  = useRef<HTMLDivElement>(null)

  useEffect(() => {
    textareaRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!fontPickerOpen) return
    const onPointerDown = (e: PointerEvent) => {
      if (fontPickerRef.current && !fontPickerRef.current.contains(e.target as Node)) {
        setFontPickerOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [fontPickerOpen])

  const alignments = [
    { value: 'left',    Icon: AlignLeft,    label: t.left },
    { value: 'center',  Icon: AlignCenter,  label: t.center },
    { value: 'right',   Icon: AlignRight,   label: t.right },
    { value: 'justify', Icon: AlignJustify, label: t.justified },
  ]

  const lhDisplay = lineHeight.toFixed(2)
  const csDisplay = charSpacing

  return (
    <div className="tm-overlay" onClick={onCancel}>
      <div className="tm" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="tm-header">
          <span className="tm-title">{t.enterText}</span>
          <button className="tm-close" onClick={onCancel} aria-label={t.close}>
            <X size={13} strokeWidth={1.8} />
          </button>
        </div>

        <div className="tm-rule" />

        {/* Toolbar row 1 — font / B-U / alignment / size / color */}
        <div className="tm-toolbar">

          {/* Font picker */}
          <div className="tm-font-picker" ref={fontPickerRef}>
            <button
              className="tm-font-btn"
              style={{ fontFamily }}
              onClick={() => setFontPickerOpen((v) => !v)}
              type="button"
            >
              <span>{TEXT_FONTS.find((f) => f.value === fontFamily)?.label ?? fontFamily}</span>
              <ChevronDown size={10} strokeWidth={2} />
            </button>
            {fontPickerOpen && (
              <div className="tm-font-list" onMouseLeave={() => setHoveredFont(null)}>
                {TEXT_FONTS.map((f) => (
                  <button
                    key={f.value}
                    className={`tm-font-option${fontFamily === f.value ? ' tm-font-option--active' : ''}`}
                    style={{ fontFamily: f.value }}
                    onMouseEnter={() => setHoveredFont(f.value)}
                    onClick={() => { setFontFamily(f.value); setFontPickerOpen(false) }}
                    type="button"
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="tm-sep" />

          {/* B / U */}
          <button
            className={`tm-fmt${bold ? ' tm-fmt--on' : ''}`}
            onClick={() => setBold((v) => !v)}
            aria-label={t.bold}
          >
            <b>B</b>
          </button>
          <button
            className={`tm-fmt${underline ? ' tm-fmt--on' : ''}`}
            onClick={() => setUnderline((v) => !v)}
            aria-label={t.underline}
          >
            <u>U</u>
          </button>

          <div className="tm-sep" />

          {/* Alignment */}
          {alignments.map(({ value, Icon, label }) => (
            <button
              key={value}
              className={`tm-fmt${textAlign === value ? ' tm-fmt--on' : ''}`}
              onClick={() => setTextAlign(value)}
              aria-label={label}
            >
              <Icon size={11} strokeWidth={1.5} />
            </button>
          ))}

          <div className="tm-sep" />

          {/* Font size */}
          <button
            className="tm-fmt"
            onClick={() => setFontSize((v) => Math.max(6, v - 1))}
            aria-label={t.decreaseSize}
          >
            <CircleMinus size={11} strokeWidth={1.5} />
          </button>
          <span className="tm-size">{fontSize}</span>
          <button
            className="tm-fmt"
            onClick={() => setFontSize((v) => Math.min(200, v + 1))}
            aria-label={t.increaseSize}
          >
            <CirclePlus size={11} strokeWidth={1.5} />
          </button>

          <div className="tm-sep" />

          {/* Color */}
          <span className="tm-color-label">{t.color}</span>
          <button
            className="tm-color-swatch"
            style={{ background: fill }}
            onClick={() => colorInputRef.current?.click()}
            aria-label={t.textColor}
          />
          <input
            ref={colorInputRef}
            type="color"
            value={fill}
            onChange={(e) => setFill(e.target.value)}
            className="tm-color-input"
            aria-hidden="true"
            tabIndex={-1}
          />
        </div>

        {/* Toolbar row 2 — line height / letter spacing */}
        <div className="tm-toolbar tm-toolbar--row2">

          {/* Line height */}
          <span className="tm-detail-label">{t.lineHeight}</span>
          <button
            className="tm-fmt"
            onClick={() => setLineHeight((v) => Math.max(0.8, parseFloat((v - 0.1).toFixed(2))))}
            aria-label={t.decreaseLH}
          >
            <CircleMinus size={11} strokeWidth={1.5} />
          </button>
          <span className="tm-detail-value">{lhDisplay}</span>
          <button
            className="tm-fmt"
            onClick={() => setLineHeight((v) => Math.min(3.0, parseFloat((v + 0.1).toFixed(2))))}
            aria-label={t.increaseLH}
          >
            <CirclePlus size={11} strokeWidth={1.5} />
          </button>

          <div className="tm-sep" />

          {/* Letter spacing */}
          <span className="tm-detail-label">{t.spacing}</span>
          <button
            className="tm-fmt"
            onClick={() => setCharSpacing((v) => Math.max(-200, v - 10))}
            aria-label={t.decreaseSpacing}
          >
            <CircleMinus size={11} strokeWidth={1.5} />
          </button>
          <span className="tm-detail-value">{csDisplay}</span>
          <button
            className="tm-fmt"
            onClick={() => setCharSpacing((v) => Math.min(500, v + 10))}
            aria-label={t.increaseSpacing}
          >
            <CirclePlus size={11} strokeWidth={1.5} />
          </button>

        </div>

        <div className="tm-rule" />

        {/* Textarea — live preview of formatting */}
        <textarea
          ref={textareaRef}
          className="tm-body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t.textPlaceholder}
          style={{
            fontFamily:     hoveredFont ?? fontFamily,
            fontWeight:     bold ? 'bold' : 'normal',
            textDecoration: underline ? 'underline' : 'none',
            textAlign:      textAlign as React.CSSProperties['textAlign'],
            fontSize:       `${Math.min(Math.max(fontSize, 10), 36)}px`,
            color:          fill,
            lineHeight:     lineHeight,
            letterSpacing:  `${charSpacing / 1000}em`,
          }}
        />

        {/* Footer */}
        <div className="tm-footer">
          <button className="tm-action" onClick={onCancel}>{t.cancel}</button>
          <button
            className="tm-action tm-action--ok"
            onClick={() => onConfirm({
              text, fontFamily, bold, underline, textAlign, fontSize, fill,
              lineHeight, charSpacing,
            })}
          >
            OK
          </button>
        </div>

      </div>
    </div>
  )
}
