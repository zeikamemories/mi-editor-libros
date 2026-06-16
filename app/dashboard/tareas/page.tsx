'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronDown, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import './tareas.css'

type Estado = 'por_hacer' | 'en_progreso' | 'listo'
type Area = 'fabrica' | 'precios' | 'packaging' | 'influencers' | 'testing' | 'procesos' | 'arranque'

interface TaskRow {
  id: string
  tarea: string
  estado: Estado
  area: Area
  semana: number
  inicio: string | null
  fin: string | null
  notas: string | null
  position: number
}

const ESTADO_LABEL: Record<Estado, string> = {
  por_hacer:   'Por hacer',
  en_progreso: 'En progreso',
  listo:       'Listo',
}
const NEXT_ESTADO: Record<Estado, Estado> = {
  por_hacer:   'en_progreso',
  en_progreso: 'listo',
  listo:       'por_hacer',
}

const AREA_LABEL: Record<Area, string> = {
  fabrica:     'Fábrica',
  precios:     'Precios',
  packaging:   'Packaging',
  influencers: 'Influencers',
  testing:     'Testing',
  procesos:    'Procesos',
  arranque:    'Arranque',
}
const AREA_ORDER: Area[] = ['fabrica', 'precios', 'packaging', 'influencers', 'testing', 'procesos', 'arranque']

const WEEK_LABEL: Record<number, string> = {
  1: 'Semana 1 — 8 al 14 de junio',
  2: 'Semana 2 — 15 al 21 de junio',
  3: 'Semana 3 — 22 al 28 de junio',
  4: 'Semana 4 — 29 de junio al 5 de julio',
  5: 'Semana 5 — 6 al 12 de julio',
  6: 'Semana 6 — 13 al 19 de julio',
  7: 'Semana 7 — 21 al 25 de julio',
  8: 'Semana 8 — 28 de julio al 1 de agosto',
}
const WEEKS = [1, 2, 3, 4, 5, 6, 7, 8]

function currentWeek(): number {
  // Week 1 starts 2026-06-08; used only to decide which accordion opens by default.
  const start = new Date('2026-06-08')
  const diffDays = Math.floor((Date.now() - start.getTime()) / 86400000)
  const week = Math.floor(diffDays / 7) + 1
  return Math.min(Math.max(week, 1), 8)
}

export default function TareasPage() {
  const router = useRouter()

  const [authChecked, setAuthChecked] = useState(false)
  const [loading, setLoading]         = useState(true)
  const [tasks, setTasks]             = useState<TaskRow[]>([])
  const [collapsedWeeks, setCollapsedWeeks] = useState<Set<number>>(
    () => new Set(WEEKS.filter(w => w !== currentWeek()))
  )
  const [editingId, setEditingId]     = useState<string | null>(null)
  const [editingDraft, setEditingDraft] = useState('')
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [newDrafts, setNewDrafts]     = useState<Record<number, string>>({})

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
      }
    })
  }, [router])

  useEffect(() => {
    if (!authChecked) return
    supabase
      .from('tasks')
      .select('*')
      .order('semana', { ascending: true })
      .order('position', { ascending: true })
      .then(({ data, error }) => {
        if (error) { console.error(error); setLoading(false); return }
        setTasks((data ?? []) as TaskRow[])
        setLoading(false)
      })
  }, [authChecked])

  const byWeek = useMemo(() => {
    const map = new Map<number, TaskRow[]>()
    for (const w of WEEKS) map.set(w, [])
    for (const t of tasks) map.get(t.semana)?.push(t)
    return map
  }, [tasks])

  function toggleWeek(w: number) {
    setCollapsedWeeks(prev => {
      const next = new Set(prev)
      if (next.has(w)) next.delete(w); else next.add(w)
      return next
    })
  }

  async function cycleEstado(task: TaskRow) {
    const next = NEXT_ESTADO[task.estado]
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, estado: next } : t))
    const { error } = await supabase.from('tasks').update({ estado: next }).eq('id', task.id)
    if (error) {
      console.error(error)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, estado: task.estado } : t))
    }
  }

  function startEditing(task: TaskRow) {
    setEditingId(task.id)
    setEditingDraft(task.tarea)
  }

  async function commitEditing(task: TaskRow) {
    const trimmed = editingDraft.trim()
    setEditingId(null)
    if (!trimmed || trimmed === task.tarea) return
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, tarea: trimmed } : t))
    const { error } = await supabase.from('tasks').update({ tarea: trimmed }).eq('id', task.id)
    if (error) {
      console.error(error)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, tarea: task.tarea } : t))
    }
  }

  async function changeArea(task: TaskRow, area: Area) {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, area } : t))
    const { error } = await supabase.from('tasks').update({ area }).eq('id', task.id)
    if (error) {
      console.error(error)
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, area: task.area } : t))
    }
  }

  function toggleNotes(id: string) {
    setExpandedNotes(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  async function commitNotes(task: TaskRow, notas: string) {
    const trimmed = notas.trim()
    if (trimmed === (task.notas ?? '')) return
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, notas: trimmed || null } : t))
    const { error } = await supabase.from('tasks').update({ notas: trimmed || null }).eq('id', task.id)
    if (error) console.error(error)
  }

  async function deleteTask(task: TaskRow) {
    if (!window.confirm(`¿Eliminar la tarea "${task.tarea}"?`)) return
    const { error } = await supabase.from('tasks').delete().eq('id', task.id)
    if (error) { console.error(error); return }
    setTasks(prev => prev.filter(t => t.id !== task.id))
  }

  async function addTask(semana: number) {
    const draft = (newDrafts[semana] ?? '').trim()
    if (!draft) return
    const position = byWeek.get(semana)?.length ?? 0
    const { data, error } = await supabase
      .from('tasks')
      .insert({ tarea: draft, semana, estado: 'por_hacer', area: 'fabrica', position })
      .select()
      .single()
    if (error) { console.error(error); return }
    setTasks(prev => [...prev, data as TaskRow])
    setNewDrafts(prev => ({ ...prev, [semana]: '' }))
  }

  if (!authChecked || loading) {
    return <div className="tareas-loading"><div className="tareas-spinner" /></div>
  }

  return (
    <div className="tareas-root">
      <header className="tareas-topbar">
        <Image src="/LogoZeika.png" alt="Zeika" width={32} height={32} />
        <Link href="/dashboard" className="tareas-back-link">‹ Volver</Link>
      </header>

      <main className="tareas-main">
        <h1 className="tareas-title">Tareas del equipo</h1>
        <p className="tareas-subtitle">Roadmap de lanzamiento — 8 semanas hasta el 3 de agosto</p>

        {WEEKS.map(w => {
          const weekTasks = byWeek.get(w) ?? []
          const done = weekTasks.filter(t => t.estado === 'listo').length
          const collapsed = collapsedWeeks.has(w)
          return (
            <section key={w} className="tareas-week">
              <button
                className={`tareas-week-header${collapsed ? ' tareas-week-header--collapsed' : ''}`}
                onClick={() => toggleWeek(w)}
              >
                <ChevronDown size={16} className="tareas-week-chevron" />
                <span className="tareas-week-label">{WEEK_LABEL[w]}</span>
                <span className="tareas-week-count">{done}/{weekTasks.length}</span>
              </button>

              {!collapsed && (
                <div className="tareas-week-body">
                  {weekTasks.map(task => (
                    <div key={task.id} className={`tareas-row${task.estado === 'listo' ? ' tareas-row--listo' : ''}`}>
                      <button
                        className={`tareas-pill tareas-pill--${task.estado.replace('_', '-')}`}
                        onClick={() => cycleEstado(task)}
                        title="Cambiar estado"
                      >
                        {ESTADO_LABEL[task.estado]}
                      </button>

                      {editingId === task.id ? (
                        <input
                          className="tareas-title-input"
                          autoFocus
                          value={editingDraft}
                          onChange={e => setEditingDraft(e.target.value)}
                          onBlur={() => commitEditing(task)}
                          onKeyDown={e => e.key === 'Enter' && commitEditing(task)}
                        />
                      ) : (
                        <span className="tareas-title-text" onClick={() => startEditing(task)}>
                          {task.tarea}
                        </span>
                      )}

                      <select
                        className={`tareas-area-select tareas-area--${task.area}`}
                        value={task.area}
                        onChange={e => changeArea(task, e.target.value as Area)}
                      >
                        {AREA_ORDER.map(a => (
                          <option key={a} value={a}>{AREA_LABEL[a]}</option>
                        ))}
                      </select>

                      <button className="tareas-notes-toggle" onClick={() => toggleNotes(task.id)} title="Notas">
                        {task.notas ? '📝' : '+ nota'}
                      </button>

                      <button className="tareas-delete-btn" onClick={() => deleteTask(task)} title="Eliminar">
                        <Trash2 size={15} />
                      </button>

                      {expandedNotes.has(task.id) && (
                        <textarea
                          className="tareas-notes-input"
                          defaultValue={task.notas ?? ''}
                          placeholder="Agregar una nota..."
                          onBlur={e => commitNotes(task, e.target.value)}
                        />
                      )}
                    </div>
                  ))}

                  <div className="tareas-add-row">
                    <Plus size={14} />
                    <input
                      className="tareas-add-input"
                      placeholder="Agregar tarea"
                      value={newDrafts[w] ?? ''}
                      onChange={e => setNewDrafts(prev => ({ ...prev, [w]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addTask(w)}
                    />
                  </div>
                </div>
              )}
            </section>
          )
        })}
      </main>
    </div>
  )
}
