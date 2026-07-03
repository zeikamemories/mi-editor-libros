export type Orientation = 'h' | 'v' | 's'

export type DesignItem = {
  src: string
  orientation: Orientation
}

const DIR = '/fotos/buenas/'

// Real design covers & spreads from public/fotos/buenas — orientation set from each
// image's actual aspect ratio (h: landscape, v: portrait, s: near-square).
export const DESIGNS: DesignItem[] = [
  { src: DIR + encodeURIComponent('Tapa Camila V-09.jpg'),                                orientation: 'h' },
  { src: DIR + encodeURIComponent('dia del padre tapa-10.jpg'),                            orientation: 'v' },
  { src: DIR + encodeURIComponent('wpp business-07.jpg'),                                  orientation: 's' },
  { src: DIR + encodeURIComponent('TAPAS zeikaai-03.jpg'),                                 orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb1.jpg'),                                             orientation: 'h' },
  { src: DIR + encodeURIComponent('feed nue-28.jpg'),                                      orientation: 'v' },
  { src: DIR + encodeURIComponent('Tapa Valen Gibert.jpg'),                                orientation: 'h' },
  { src: DIR + encodeURIComponent('mockups-34.jpg'),                                       orientation: 's' },
  { src: DIR + encodeURIComponent('Tapa Josefina-18.jpg'),                                 orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb7.jpg'),                                             orientation: 'h' },
  { src: DIR + encodeURIComponent('opciones tapas-09.jpg'),                                orientation: 'v' },
  { src: DIR + encodeURIComponent('disenos semana -61.jpg'),                               orientation: 's' },
  { src: DIR + encodeURIComponent('Tapa Delfi Mendez_Mesa de trabajo 54 copia 10.jpg'),     orientation: 'v' },
  { src: DIR + encodeURIComponent('post peru1.jpg'),                                       orientation: 'h' },
  { src: DIR + encodeURIComponent('discos-20.jpg'),                                        orientation: 'v' },
  { src: DIR + encodeURIComponent('opciones tapas-02.jpg'),                                orientation: 's' },
  { src: DIR + encodeURIComponent('Tapa Caro Reymundo (1).jpg'),                           orientation: 'h' },
  { src: DIR + encodeURIComponent('TAPA BULJE FINAL.jpg'),                                 orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb8.jpg'),                                             orientation: 'h' },
  { src: DIR + encodeURIComponent('Tapa Elisa Reynal 2-59.jpg'),                           orientation: 'v' },
  { src: DIR + encodeURIComponent('TAPAS zeikaai-05.jpg'),                                 orientation: 'h' },
  { src: DIR + encodeURIComponent('opciones tapas-10.jpg'),                                orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb2.jpg'),                                             orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb3.jpg'),                                             orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb4.jpg'),                                             orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb5.jpg'),                                             orientation: 'v' },
  { src: DIR + encodeURIComponent('rgb6.jpg'),                                             orientation: 'v' },
  { src: DIR + encodeURIComponent('SEP10-17.jpg'),                                         orientation: 'v' },
  { src: DIR + encodeURIComponent('disenos semana -60.jpg'),                               orientation: 'v' },
  { src: DIR + encodeURIComponent('posts julio-23.jpg'),                                   orientation: 'v' },
  { src: DIR + encodeURIComponent('0FDB9F5E-76D0-4D39-BE5B-FADBDE092BB6.jpg'),             orientation: 's' },
  { src: DIR + encodeURIComponent('DE81E168-8C36-4F6C-A910-9B0A82F5A2F5.JPG'),             orientation: 'v' },
]
