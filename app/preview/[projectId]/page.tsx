'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'
import type { PageData } from '../../components/Canvas/fabricHelpers'
import { getBookSize } from '../../config/bookSize'
import './preview.css'

type SpreadData = { left: PageData; right: PageData }

interface SavedProject {
  spreadsData:  Record<number, SpreadData>
  totalSpreads: number
  bookSizeId?:  string
}

interface Annotation {
  id: string
  type: 'comment' | 'drawing'
  page_number: number
  content: string
  created_at: string
}

const PreviewModal = dynamic(
  () => import('../../components/PreviewModal/PreviewModal'),
  { ssr: false },
)

const COLORS = ['#e74c3c', '#2980b9', '#27ae60', '#f39c12', '#191919']

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router        = useRouter()

  const [project,    setProject]    = useState<SavedProject | null>(null)
  const [notFound,   setNotFound]   = useState(false)
  const [userId,     setUserId]     = useState<string | null>(null)

  // Annotation state
  const [mode,          setMode]          = useState<'view' | 'comment' | 'draw'>('view')
  const [annotations,   setAnnotations]   = useState<Annotation[]>([])
  const [currentPage,   setCurrentPage]   = useState(1)
  const [commentText,   setCommentText]   = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const [drawColor,     setDrawColor]     = useState('#e74c3c')
  const [drawSize,      setDrawSize]      = useState(3)
  const [isDrawing,     setIsDrawing]     = useState(false)

  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const lastPos    = useRef<{ x: number; y: number } | null>(null)

  // Load project from Supabase first, localStorage fallback
  useEffect(() => {
    if (!projectId) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })

    // Try Supabase
    supabase.from('projects').select('spreads, total_spreads, book_size')
      .eq('id', projectId).single()
      .then(({ data, error }) => {
        if (!error && data?.spreads) {
          setProject({
            spreadsData:  data.spreads as Record<number, SpreadData>,
            totalSpreads: data.total_spreads ?? 16,
            bookSizeId:   data.book_size ?? 'vertical',
          })
          // Load annotations
          supabase.from('preview_annotations')
            .select('id, type, page_number, content, created_at')
            .eq('project_id', projectId)
            .order('created_at')
            .then(({ data: ann }) => setAnnotations((ann ?? []) as Annotation[]))
          return
        }
        // Fallback to localStorage
        try {
          const raw = localStorage.getItem(`zeika_project_${projectId}`)
          if (!raw) { setNotFound(true); return }
          setProject(JSON.parse(raw) as SavedProject)
        } catch {
          setNotFound(true)
        }
      })
  }, [projectId])

  // ── Drawing ────────────────────────────────────────────────────────────────

  function getPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top)  * (canvasRef.current!.height / rect.height),
    }
  }

  function onPointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (mode !== 'draw') return
    e.currentTarget.setPointerCapture(e.pointerId)
    const pos = getPos(e)
    lastPos.current = pos
    setIsDrawing(true)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, drawSize / 2, 0, Math.PI * 2)
    ctx.fillStyle = drawColor
    ctx.fill()
  }

  function onPointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!isDrawing || mode !== 'draw' || !lastPos.current) return
    const pos = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = drawColor
    ctx.lineWidth   = drawSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function onPointerUp() {
    setIsDrawing(false)
    lastPos.current = null
  }

  function clearCanvas() {
    const c = canvasRef.current
    if (!c) return
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
  }

  async function saveDrawing() {
    if (!projectId || !canvasRef.current) return
    const content = canvasRef.current.toDataURL('image/png')
    const { data } = await supabase.from('preview_annotations').insert({
      project_id:  projectId,
      user_id:     userId,
      type:        'drawing',
      page_number: currentPage,
      content,
    }).select().single()
    if (data) {
      setAnnotations(prev => [...prev, data as Annotation])
      clearCanvas()
      setMode('view')
    }
  }

  async function saveComment() {
    if (!commentText.trim() || !projectId) return
    setSavingComment(true)
    const { data } = await supabase.from('preview_annotations').insert({
      project_id:  projectId,
      user_id:     userId,
      type:        'comment',
      page_number: currentPage,
      content:     commentText.trim(),
    }).select().single()
    if (data) {
      setAnnotations(prev => [...prev, data as Annotation])
      setCommentText('')
      setMode('view')
    }
    setSavingComment(false)
  }

  const pageAnnotations = annotations.filter(a => a.page_number === currentPage)
  const pageComments    = pageAnnotations.filter(a => a.type === 'comment')

  if (notFound) return (
    <div className="preview-notfound">
      <span>Esta previsualización ya no está disponible.</span>
      <button onClick={() => router.push('/')}>Ir al inicio</button>
    </div>
  )

  if (!project) return (
    <div className="preview-loading"><div className="preview-spinner" /></div>
  )

  const size = getBookSize(project.bookSizeId ?? 'vertical')

  return (
    <div className="preview-annotate-root">
      {/* Book preview */}
      <div className={`preview-book-wrap ${mode === 'draw' ? 'preview-book-wrap--drawing' : ''}`}>
        <PreviewModal
          spreadsData={project.spreadsData}
          totalSpreads={project.totalSpreads}
          initialSpread={0}
          pageW={size.widthPx}
          pageH={size.heightPx}
          onClose={() => router.back()}
          onPageChange={setCurrentPage}
        />

        {/* Drawing canvas overlay — only visible in draw mode */}
        {mode === 'draw' && (
          <canvas
            ref={canvasRef}
            className="preview-draw-canvas"
            width={size.widthPx * 2}
            height={size.heightPx}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
          />
        )}
      </div>

      {/* Annotation toolbar */}
      <div className="preview-toolbar">
        <div className="preview-toolbar-top">
          <span className="preview-toolbar-title">Página {currentPage}</span>
          <div className="preview-toolbar-modes">
            <button
              className={`preview-mode-btn ${mode === 'comment' ? 'preview-mode-btn--active' : ''}`}
              onClick={() => setMode(mode === 'comment' ? 'view' : 'comment')}
            >
              💬 Comentar
            </button>
            <button
              className={`preview-mode-btn ${mode === 'draw' ? 'preview-mode-btn--active' : ''}`}
              onClick={() => setMode(mode === 'draw' ? 'view' : 'draw')}
            >
              ✏️ Dibujar
            </button>
          </div>
        </div>

        {/* Comment mode */}
        {mode === 'comment' && (
          <div className="preview-comment-panel">
            <textarea
              className="preview-comment-input"
              placeholder="Escribí tu comentario sobre esta página..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              autoFocus
            />
            <button className="preview-save-btn" onClick={saveComment} disabled={!commentText.trim() || savingComment}>
              {savingComment ? 'Guardando...' : 'Guardar comentario'}
            </button>
          </div>
        )}

        {/* Draw mode */}
        {mode === 'draw' && (
          <div className="preview-draw-panel">
            <div className="preview-color-row">
              {COLORS.map(c => (
                <button
                  key={c}
                  className={`preview-color-dot ${drawColor === c ? 'preview-color-dot--active' : ''}`}
                  style={{ background: c }}
                  onClick={() => setDrawColor(c)}
                />
              ))}
            </div>
            <div className="preview-size-row">
              {[2, 4, 8].map(s => (
                <button
                  key={s}
                  className={`preview-size-btn ${drawSize === s ? 'preview-size-btn--active' : ''}`}
                  onClick={() => setDrawSize(s)}
                >
                  <span style={{ width: s * 2.5, height: s * 2.5, borderRadius: '50%', background: drawColor, display: 'block' }} />
                </button>
              ))}
            </div>
            <div className="preview-draw-actions">
              <button className="preview-clear-btn" onClick={clearCanvas}>Limpiar</button>
              <button className="preview-save-btn" onClick={saveDrawing}>Guardar dibujo</button>
            </div>
          </div>
        )}

        {/* Comments for this page */}
        {pageComments.length > 0 && (
          <div className="preview-comments-list">
            <span className="preview-comments-label">Comentarios en página {currentPage}</span>
            {pageComments.map(c => (
              <div key={c.id} className="preview-comment-item">
                <p className="preview-comment-text">{c.content}</p>
                <span className="preview-comment-date">
                  {new Date(c.created_at).toLocaleDateString('es-AR')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
