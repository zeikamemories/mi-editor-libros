export type BookSizeId = 'vertical' | 'chico' | 'mediano' | 'grande' | 'cuadrado'
export type BookOrientation = 'portrait' | 'landscape' | 'square'

export type BookSize = {
  id: BookSizeId
  nombre: string
  widthCm: number
  heightCm: number
  widthPx: number
  heightPx: number
  bleedPx: number
  orientation: BookOrientation
}

export const BOOK_SIZES: BookSize[] = [
  { id: 'chico',    nombre: 'Chico Horizontal',  widthCm: 21,   heightCm: 14.8, widthPx: 794,  heightPx: 559,  bleedPx: 11, orientation: 'landscape' },
  { id: 'mediano',  nombre: 'Mediano Horizontal', widthCm: 28,   heightCm: 21.6, widthPx: 1058, heightPx: 816,  bleedPx: 11, orientation: 'landscape' },
  { id: 'grande',   nombre: 'Grande Horizontal',  widthCm: 41,   heightCm: 29,   widthPx: 1550, heightPx: 1096, bleedPx: 11, orientation: 'landscape' },
  { id: 'vertical', nombre: 'Vertical',           widthCm: 21.6, heightCm: 28,   widthPx: 816,  heightPx: 1058, bleedPx: 11, orientation: 'portrait'  },
  { id: 'cuadrado', nombre: 'Cuadrado',           widthCm: 29,   heightCm: 29,   widthPx: 1096, heightPx: 1096, bleedPx: 11, orientation: 'square'   },
]

export function getBookSize(id: string): BookSize {
  return BOOK_SIZES.find(s => s.id === id) ?? BOOK_SIZES.find(s => s.id === 'vertical')!
}

export const BOOK_SIZE = BOOK_SIZES.find(s => s.id === 'vertical')!
