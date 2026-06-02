'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import type { PageData } from '../../components/Canvas/fabricHelpers'
import { getBookSize } from '../../config/bookSize'

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
  const { projectId }                   = useParams<{ projectId: string }>()
  const router                          = useRouter()
  const [project, setProject]           = useState<SavedProject | null>(null)
  const [notFound, setNotFound]         = useState(false)

  useEffect(() => {
    if (!projectId) return
    try {
      const raw = localStorage.getItem(`zeika_project_${projectId}`)
      if (!raw) { setNotFound(true); return }
      setProject(JSON.parse(raw) as SavedProject)
    } catch {
      setNotFound(true)
    }
  }, [projectId])

  if (notFound) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100vh', gap: '16px',
        fontFamily: 'var(--font-body)', color: 'var(--color-black)',
        background: 'var(--color-cream)',
      }}>
        <span style={{ fontSize: '14px' }}>Esta previsualización ya no está disponible.</span>
        <button
          onClick={() => router.push('/dashboard')}
          style={{
            background: 'var(--color-black)', color: '#fff', border: 'none',
            borderRadius: '2px', padding: '8px 20px', cursor: 'pointer',
            fontFamily: 'var(--font-body)', fontSize: '12px', fontWeight: 600,
          }}
        >
          Ir al inicio
        </button>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100vh', fontFamily: 'var(--font-body)', fontSize: '13px',
        color: '#666', background: 'var(--color-cream)',
      }}>
        Cargando...
      </div>
    )
  }

  const size = getBookSize(project.bookSizeId ?? 'vertical')

  return (
    <PreviewModal
      spreadsData={project.spreadsData}
      totalSpreads={project.totalSpreads}
      initialSpread={0}
      pageW={size.widthPx}
      pageH={size.heightPx}
      onClose={() => router.back()}
    />
  )
}
