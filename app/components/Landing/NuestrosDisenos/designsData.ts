export type Orientation = 'h' | 'v' | 's'

export type DesignItem = {
  src: string
  orientation: Orientation
  shadow?: boolean
  width: number
  height: number
}

const DIR = '/fotos/buenas-web/'

// Real design covers & spreads from public/fotos/buenas — orientation set from each
// image's actual aspect ratio (h: landscape, v: portrait, s: near-square).
// shadow: true applies the drop-shadow treatment (see .disenos__item--shadow / .catalog__item--shadow).
// width/height: real displayed pixel dimensions (EXIF-rotation-corrected for 2.jpg) — reserves
// layout space before the image loads, so the grid doesn't reflow/shift once it does.
export const DESIGNS: DesignItem[] = [
  { src: DIR + '1.jpg',  orientation: 'v', shadow: true,  width: 2551, height: 3307 },
  { src: DIR + '2.jpg',  orientation: 'h',                width: 6224, height: 4637 },
  { src: DIR + '3.jpg',  orientation: 'v',                width: 4211, height: 5625 },
  { src: DIR + '4.jpg',  orientation: 'h', shadow: true,  width: 4843, height: 3425 },
  { src: DIR + '5.jpg',  orientation: 'v',                width: 4211, height: 5625 },
  { src: DIR + '6.jpg',  orientation: 's', shadow: true,  width: 4236, height: 4253 },
  { src: DIR + '7.JPG',  orientation: 'v',                width: 1440, height: 1800 },
  { src: DIR + '8.jpg',  orientation: 'h', shadow: true,  width: 3307, height: 2598 },
  { src: DIR + '9.jpg',  orientation: 's',                width: 6220, height: 6220 },
  { src: DIR + '10.jpg', orientation: 'v', shadow: true,  width: 2551, height: 3307 },
  { src: DIR + '11.jpg', orientation: 's',                width: 1246, height: 1440 },
  { src: DIR + '12.jpg', orientation: 'v', shadow: true,  width: 2551, height: 3307 },
  { src: DIR + '13.jpg', orientation: 'v',                width: 1080, height: 1350 },
  { src: DIR + '14.jpg', orientation: 'v', shadow: true,  width: 2551, height: 3307 },
  { src: DIR + '15.jpg', orientation: 'v', shadow: true,  width: 3371, height: 4411 },
  { src: DIR + '16.jpg', orientation: 'v', shadow: true,  width: 2598, height: 3307 },
  { src: DIR + '17.jpg', orientation: 'v', shadow: true,  width: 2832, height: 4240 },
  { src: DIR + '18.jpg', orientation: 'v', shadow: true,  width: 3371, height: 4411 },
  { src: DIR + '19.jpg', orientation: 'h', shadow: true,  width: 5370, height: 4197 },
  { src: DIR + '20.jpg', orientation: 'v', shadow: true,  width: 4211, height: 5625 },
  { src: DIR + '21.jpg', orientation: 'v', shadow: true,  width: 2598, height: 3307 },
  { src: DIR + '22.jpg', orientation: 'h', shadow: true,  width: 3307, height: 2598 },
  { src: DIR + '23.jpg', orientation: 'h', shadow: true,  width: 2480, height: 1772 },
  { src: DIR + '24.jpg', orientation: 'v',                width: 4500, height: 5625 },
  { src: DIR + '25.jpg', orientation: 'v', shadow: true,  width: 3371, height: 4411 },
  { src: DIR + '26.jpg', orientation: 'v', shadow: true,  width: 2652, height: 3782 },
  { src: DIR + '27.jpg', orientation: 'v',                width: 4699, height: 6278 },
  { src: DIR + '28.jpg', orientation: 'h', shadow: true,  width: 3307, height: 2598 },
  { src: DIR + '29.jpg', orientation: 'v', shadow: true,  width: 2652, height: 3782 },
  { src: DIR + '30.jpg', orientation: 's', shadow: true,  width: 4500, height: 4500 },
  { src: DIR + '31.jpg', orientation: 'v', shadow: true,  width: 2044, height: 2635 },
  { src: DIR + '32.jpg', orientation: 'h',                width: 2800, height: 1960 },
  { src: DIR + '33.jpg', orientation: 's', shadow: true,  width: 2331, height: 2340 },
  { src: DIR + '34.jpg', orientation: 'v', shadow: true,  width: 3336, height: 4292 },
  { src: DIR + '35.jpg', orientation: 'h', shadow: true,  width: 4588, height: 3572 },
  { src: DIR + '36.jpg', orientation: 'v', shadow: true,  width: 2551, height: 3307 },
  { src: DIR + '37.jpg', orientation: 'v', shadow: true,  width: 3336, height: 4292 },
  { src: DIR + '38.jpg', orientation: 'h', shadow: true,  width: 2480, height: 1772 },
  { src: DIR + '39.jpg', orientation: 'v', shadow: true,  width: 4500, height: 5625 },
]
