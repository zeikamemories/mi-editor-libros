import { google } from 'googleapis'

export const ZEIKA_EMAIL = 'zeika.memories@gmail.com'

export function getServiceAccountAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: [
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/documents',
    ],
  })
}

export function buildDocsTemplateRequests(bookName: string, extraText: boolean) {
  const sections = extraText
    ? [
        { title: 'TITULO DE TAPA',           hint: '(Escribi aca el titulo que queres en la tapa)' },
        { title: 'SUBTITULO / TEXTO DE TAPA', hint: '(Opcional - una fecha, un lugar, una frase corta)' },
        { title: 'CARTA / TEXTO 1',           hint: '(Indica en que parte del libro va este texto)' },
        { title: 'CARTA / TEXTO 2',           hint: '' },
        { title: 'CARTA / TEXTO 3',           hint: '' },
        { title: 'NOTAS PARA EL EQUIPO',      hint: '(Cualquier aclaracion sobre el estilo, tono, etc.)' },
      ]
    : [
        { title: 'TITULO DE TAPA',               hint: '(Escribi aca el titulo que queres en la tapa)' },
        { title: 'SUBTITULO / TEXTO DE TAPA',    hint: '(Opcional - una fecha, un lugar, una frase corta)' },
        { title: 'TEXTO EXTRA (dedicatoria, pie de foto, etc.)', hint: '(Opcional)' },
      ]

  const lines: string[] = [
    `TEXTOS PARA EL FOTOLIBRO - ${bookName}`,
    '',
  ]
  for (const s of sections) {
    lines.push('------------------------------')
    lines.push(s.title)
    lines.push('------------------------------')
    if (s.hint) lines.push(s.hint)
    lines.push('')
    lines.push('')
  }

  const text = lines.join('\n')

  return [
    {
      insertText: {
        location: { index: 1 },
        text,
      },
    },
  ]
}
