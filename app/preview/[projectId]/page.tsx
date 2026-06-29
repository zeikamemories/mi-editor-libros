'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { supabase } from '../../lib/supabase'
import type { PageData } from '../../components/Canvas/fabricHelpers'
import type { Annotation } from '../../components/PreviewModal/PreviewModal'
import { getBookSize } from '../../config/bookSize'
import './preview.css'

type SpreadData = { left: PageData; right: PageData }

interface SavedProject {
  spreadsData:  Record<number, SpreadData>
  totalSpreads: number
  bookSizeId?:  string
}

const PreviewModal = dynamic(
  () => import('../../components/PreviewModal/PreviewModal'),
  { ssr: false },
)

export default function PreviewPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const router        = useRouter()
  const [project,       setProject]       = useState<SavedProject | null>(null)
  const [notFound,      setNotFound]      = useState(false)
  const [userId,        setUserId]        = useState<string | null>(null)
  const [isOwner,       setIsOwner]       = useState(false)
  const [annotations,   setAnnotations]   = useState<Annotation[]>([])
  const [showRotateHint, setShowRotateHint] = useState(false)
  const [hintDismissed,  setHintDismissed]  = useState(false)

  useEffect(() => {
    if (!projectId) return

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const uid = session?.user?.id ?? null
      setUserId(uid)

      // Fetch project — also get order_id to check ownership
      const { data, error } = await supabase
        .from('projects')
        .select('spreads, total_spreads, book_size, order_id')
        .eq('id', projectId)
        .single()

      if (!error && data?.spreads) {
        setProject({
          spreadsData:  data.spreads as Record<number, SpreadData>,
          totalSpreads: data.total_spreads ?? 16,
          bookSizeId:   data.book_size ?? 'vertical',
        })

        // Check if the logged-in user owns this project's order
        if (uid && data.order_id) {
          const { data: order } = await supabase
            .from('orders')
            .select('user_id')
            .eq('id', data.order_id)
            .single()
          setIsOwner(order?.user_id === uid)
        }

        const { data: ann } = await supabase
          .from('preview_annotations')
          .select('id, type, page_number, content, created_at')
          .eq('project_id', projectId)
          .order('created_at')
        setAnnotations((ann ?? []) as Annotation[])
        return
      }

      // Fallback to localStorage (no auth, no ownership)
      try {
        const raw = localStorage.getItem(`zeika_project_${projectId}`)
        if (!raw) { setNotFound(true); return }
        setProject(JSON.parse(raw) as SavedProject)
      } catch {
        setNotFound(true)
      }
    })
  }, [projectId])

  useEffect(() => {
    const isMobile = () => window.innerWidth <= 900
    const isPortrait = () => window.innerHeight > window.innerWidth

    function check() {
      if (isMobile() && isPortrait() && !hintDismissed) {
        setShowRotateHint(true)
      } else {
        setShowRotateHint(false)
      }
    }

    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [hintDismissed])

  async function handleCommentSave(text: string, page: number): Promise<Annotation | null> {
    const { data } = await supabase.from('preview_annotations').insert({
      project_id:  projectId,
      user_id:     userId,
      type:        'comment',
      page_number: page,
      content:     text,
    }).select().single()
    return data as Annotation | null
  }

  async function handleCommentUpdate(id: string, content: string): Promise<boolean> {
    const { error } = await supabase.from('preview_annotations').update({ content }).eq('id', id)
    return !error
  }

  async function handleCommentDelete(id: string): Promise<void> {
    await supabase.from('preview_annotations').delete().eq('id', id)
  }

  async function handleDrawingDelete(ids: string[]): Promise<void> {
    await supabase.from('preview_annotations').delete().in('id', ids)
  }

  async function handleDrawingSave(svgContent: string, page: number): Promise<Annotation | null> {
    const { data, error } = await supabase.from('preview_annotations').insert({
      project_id:  projectId,
      user_id:     userId,
      type:        'drawing',
      page_number: page,
      content:     svgContent,  // SVG string — small, transparent, no Cloudinary needed
    }).select().single()
    if (error) console.error('Drawing save failed:', error.message, error.code)
    return data as Annotation | null
  }

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
    <>
    {showRotateHint && (
      <div className="preview-rotate-overlay">
        <div className="preview-rotate-content">
          <div className="preview-rotate-icon">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Phone portrait */}
              <rect x="8" y="14" width="26" height="42" rx="4" stroke="white" strokeWidth="2.5" strokeOpacity="0.5"/>
              <rect x="12" y="20" width="18" height="28" rx="1" fill="white" fillOpacity="0.15"/>
              <circle cx="21" cy="52" r="2" fill="white" fillOpacity="0.5"/>
              {/* Arrow */}
              <path d="M38 36 Q52 20 60 30" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 3"/>
              <path d="M57 27 L60 30 L56 32" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              {/* Phone landscape */}
              <rect x="46" y="38" width="26" height="16" rx="3" stroke="white" strokeWidth="2.5"/>
              <rect x="50" y="41" width="18" height="10" rx="1" fill="white" fillOpacity="0.15"/>
              <circle cx="70" cy="46" r="1.5" fill="white"/>
            </svg>
          </div>
          <p className="preview-rotate-text">
            Rotá el celular para<br />visualizar el libro
          </p>
          <button
            className="preview-rotate-btn"
            onClick={() => { setHintDismissed(true); setShowRotateHint(false) }}
          >
            Continuar así
          </button>
        </div>
      </div>
    )}

    <PreviewModal
      spreadsData={project.spreadsData}
      totalSpreads={project.totalSpreads}
      initialSpread={0}
      pageW={size.widthPx}
      pageH={size.heightPx}
      onClose={() => router.back()}
      annotations={annotations}
      // Annotation tools only available to the project owner (the client who ordered)
      onCommentSave={isOwner ? handleCommentSave : undefined}
      onCommentUpdate={isOwner ? handleCommentUpdate : undefined}
      onCommentDelete={isOwner ? handleCommentDelete : undefined}
      onDrawingSave={isOwner ? handleDrawingSave : undefined}
      onDrawingDelete={isOwner ? handleDrawingDelete : undefined}
    />
    </>
  )
}
