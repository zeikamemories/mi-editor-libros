'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  const searchParams  = useSearchParams()
  const orderId       = searchParams.get('orderId')

  const [project,     setProject]     = useState<SavedProject | null>(null)
  const [notFound,    setNotFound]    = useState(false)
  const [userId,      setUserId]      = useState<string | null>(null)
  const [annotations, setAnnotations] = useState<Annotation[]>([])

  useEffect(() => {
    if (!projectId) return

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null)
    })

    supabase.from('projects').select('spreads, total_spreads, book_size')
      .eq('id', projectId).single()
      .then(({ data, error }) => {
        if (!error && data?.spreads) {
          setProject({
            spreadsData:  data.spreads as Record<number, SpreadData>,
            totalSpreads: data.total_spreads ?? 16,
            bookSizeId:   data.book_size ?? 'vertical',
          })
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

  async function handleSaveChanges() {
    if (!orderId || !userId) return
    const { data: order } = await supabase.from('orders').select('change_requests_used').eq('id', orderId).single()
    const newUsed = ((order?.change_requests_used ?? 0) + 1)
    await supabase.from('orders').update({ change_requests_used: newUsed }).eq('id', orderId)
    await supabase.from('order_notes').insert({
      order_id: orderId, user_id: userId, content: 'Ronda de cambios solicitada', type: 'change_request',
    })
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
    <PreviewModal
      spreadsData={project.spreadsData}
      totalSpreads={project.totalSpreads}
      initialSpread={0}
      pageW={size.widthPx}
      pageH={size.heightPx}
      onClose={() => router.back()}
      annotations={annotations}
      onCommentSave={handleCommentSave}
      onDrawingSave={handleDrawingSave}
      onSaveChanges={orderId && userId ? handleSaveChanges : undefined}
    />
  )
}
