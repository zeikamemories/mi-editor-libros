'use client'

import { createContext, useContext, useState } from 'react'
import { translations, Language, Translations } from '../config/translations'

interface LanguageContextType {
  lang:       Language
  t:          Translations
  toggleLang: () => void
}

const LanguageContext = createContext<LanguageContextType | null>(null)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>('es')
  const toggleLang = () => setLang(l => l === 'es' ? 'en' : 'es')
  return (
    <LanguageContext.Provider value={{ lang, t: translations[lang], toggleLang }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLang() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider')
  return ctx
}
