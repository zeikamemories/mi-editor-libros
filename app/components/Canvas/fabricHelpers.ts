import * as fabric from 'fabric'
import type { Frame, Layout } from '../../config/layouts'

// ─── Tipos internos ─────────────────────────────────────────────────────────

type FrameData = {
  type: 'frame'
  isEmpty: boolean
  frameX: number
  frameY: number
  frameW: number
  frameH: number
  moved?: boolean
}

type PhotoData = {
  type: 'photo'
  frameX: number
  frameY: number
  frameW: number
  frameH: number
  naturalW: number   // intrinsic pixel width of the source image
  naturalH: number   // intrinsic pixel height of the source image
  coverScale: number // Math.max(frameW/naturalW, frameH/naturalH) — base cover scale
  editScale: number  // zoom multiplier inside frame (≥ 1.0); combined with coverScale
  moved?: boolean
}

type TextData = {
  type: 'text'
}

type FreePhotoData = {
  type:    'freePhoto'
  naturalW: number
  naturalH: number
}

export type ShapeKind = 'rect' | 'circle' | 'triangle' | 'line' | 'arrow'

type ShapeData = {
  type:  'shape'
  shape: ShapeKind
}

type TextFrameData = {
  type:   'textFrame'
  id:     string
  frameX: number
  frameY: number
  frameW: number
  frameH: number
}

type FabricObjectWithData = fabric.FabricObject & { data: FrameData | PhotoData | TextData | FreePhotoData | ShapeData | TextFrameData }

// Arrow SVG path — 200 × 40 bounding box, pointing right
const ARROW_PATH = 'M 0 10 L 140 10 L 140 0 L 200 20 L 140 40 L 140 30 L 0 30 Z'

// ─── Utilidades ─────────────────────────────────────────────────────────────

function pctToPx(pct: number, total: number): number {
  return pct * total
}

function isFrameObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'frame'
}

function isPhotoObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'photo'
}

function isTextObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'text'
}

function isFreePhotoObj(obj: fabric.FabricObject): obj is FabricObjectWithData {
  return (obj as FabricObjectWithData).data?.type === 'freePhoto'
}

// Build an absolutePositioned clipPath rect from frame coords.
// absolutePositioned:true means Fabric clips in canvas coordinates,
// so the clip region stays fixed even as the image's left/top changes.
export function makeClipRect(frameX: number, frameY: number, frameW: number, frameH: number): fabric.Rect {
  return new fabric.Rect({
    originX: 'left',
    originY: 'top',
    left:   frameX,
    top:    frameY,
    width:  frameW,
    height: frameH,
    absolutePositioned: true,
  })
}

// ─── 1. createEmptyFrame ────────────────────────────────────────────────────

export function createEmptyFrame(
  canvas: fabric.Canvas,
  frame: Frame,
  pageW: number,
  pageH: number,
): fabric.Rect {
  const frameX = pctToPx(frame.x, pageW)
  const frameY = pctToPx(frame.y, pageH)
  const frameW = pctToPx(frame.w, pageW)
  const frameH = pctToPx(frame.h, pageH)

  const rect = new fabric.Rect({
    left:    frameX,
    top:     frameY,
    width:   frameW,
    height:  frameH,
    originX: 'left',
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,
    selectable:    true,
    evented:       true,
    lockRotation:  true,
  }) as fabric.Rect & { data: FrameData }

  rect.data = {
    type: 'frame',
    isEmpty: true,
    frameX,
    frameY,
    frameW,
    frameH,
  }

  canvas.add(rect)
  return rect
}

// ─── 1b. restoreEmptyFrame ───────────────────────────────────────────────────
// Re-creates the dashed placeholder rect after a photo is deleted.

export function restoreEmptyFrame(
  canvas: fabric.Canvas,
  data: { frameX: number; frameY: number; frameW: number; frameH: number },
): void {
  const rect = new fabric.Rect({
    left:    data.frameX,
    top:     data.frameY,
    width:   data.frameW,
    height:  data.frameH,
    originX: 'left',
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,
    selectable:    true,
    evented:       true,
    lockRotation:  true,
  }) as fabric.Rect & { data: FrameData }

  rect.data = {
    type:    'frame',
    isEmpty: true,
    frameX:  data.frameX,
    frameY:  data.frameY,
    frameW:  data.frameW,
    frameH:  data.frameH,
  }

  canvas.add(rect)
}

// ─── 1c. createFrameAtPx ────────────────────────────────────────────────────
// Creates a user-drawn frame at explicit pixel coords and returns it.

export function createFrameAtPx(
  canvas: fabric.Canvas,
  x: number, y: number, w: number, h: number,
): fabric.Rect {
  const rect = new fabric.Rect({
    left:   x,
    top:    y,
    width:  w,
    height: h,
    originX: 'left',
    originY: 'top',
    fill:         '#F0EFEB',
    stroke:       '#528ED6',
    strokeWidth:  1,
    strokeDashArray: [5, 5],
    strokeUniform:   true,
    selectable:    true,
    evented:       true,
    lockRotation:  true,
  }) as fabric.Rect & { data: FrameData }

  rect.data = { type: 'frame', isEmpty: true, frameX: x, frameY: y, frameW: w, frameH: h }
  canvas.add(rect)
  return rect
}

// ─── 2. applyLayout ─────────────────────────────────────────────────────────

export function applyLayout(
  canvas: fabric.Canvas,
  layout: Layout,
  pageW: number,
  pageH: number,
): void {
  // Remove empty frames and any placed photos; preserve text objects
  const toRemove = canvas.getObjects().filter((o) => isFrameObj(o) || isPhotoObj(o))
  canvas.remove(...toRemove)

  for (const frame of layout.frames) {
    createEmptyFrame(canvas, frame, pageW, pageH)
  }

  canvas.renderAll()
}

// ─── 3. dropPhotoOnFrame ────────────────────────────────────────────────────
// Uses clipPath (absolutePositioned:true) for clipping. The image is centered
// at the frame with virtual dims (width = frameW/scale, height = frameH/scale)
// so selection handles sit exactly at the frame corners.
// Pan mode moves obj.left/top; clipPath stays fixed at the original frame coords.

export async function dropPhotoOnFrame(
  canvas: fabric.Canvas,
  frameObj: fabric.Rect,
  photoSrc: string,
  _pageW: number,
  _pageH: number,
): Promise<void> {
  // Step 1: capture frame coordinates BEFORE removing it.
  const boundingRect = frameObj.getBoundingRect()
  const frameX = boundingRect.left
  const frameY = boundingRect.top
  const frameW = boundingRect.width
  const frameH = boundingRect.height
  const frameMoved = (frameObj as unknown as fabric.Rect & { data?: FrameData }).data?.moved ?? false

  // Step 2: load image
  const img = await fabric.FabricImage.fromURL(photoSrc, {
    crossOrigin: 'anonymous',
  })

  // Step 3: natural image dimensions
  const naturalW = img.width  || img.getScaledWidth()
  const naturalH = img.height || img.getScaledHeight()

  // Step 4: cover scale — image fills the frame on both axes, overflow is clipped
  const coverScale = Math.max(frameW / naturalW, frameH / naturalH)

  // Step 5: virtual window dims — how many source pixels fit in the frame at coverScale.
  // Handles sit at frame corners. cropX/cropY pan the image within this window.
  const virtW = frameW / coverScale
  const virtH = frameH / coverScale

  // Center crop: show the middle portion of the source image
  const cropX = (naturalW - virtW) / 2
  const cropY = (naturalH - virtH) / 2

  img.set({
    originX: 'center',
    originY: 'center',
    left:    frameX + frameW / 2,
    top:     frameY + frameH / 2,
    scaleX:  coverScale,
    scaleY:  coverScale,
    width:   virtW,
    height:  virtH,
    cropX,
    cropY,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
  })

  // Step 6: clip to frame region (absolutePositioned → stays fixed as image pans)
  img.clipPath = makeClipRect(frameX, frameY, frameW, frameH)

  // All 8 resize handles + rotate
  img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })

  ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
    type:    'photo',
    frameX,
    frameY,
    frameW,
    frameH,
    naturalW,
    naturalH,
    coverScale,
    editScale: 1,
    moved: frameMoved || undefined,
  }

  // Remove frame AFTER coordinates captured, then add image
  canvas.remove(frameObj)
  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}

// ─── 4. findFrameAtPoint ────────────────────────────────────────────────────

export function findFrameAtPoint(
  canvas: fabric.Canvas,
  x: number,
  y: number,
): fabric.Rect | null {
  const emptyFrames = canvas.getObjects().filter((obj) => {
    const d = (obj as FabricObjectWithData).data
    return d?.type === 'frame' && d?.isEmpty === true
  }) as fabric.Rect[]

  for (const frame of emptyFrames) {
    const left = frame.left ?? 0
    const top = frame.top ?? 0
    const right = left + (frame.width ?? 0)
    const bottom = top + (frame.height ?? 0)

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return frame
    }
  }

  return null
}

// ─── 4b. findPhotoAtPoint ────────────────────────────────────────────────────

export function findPhotoAtPoint(
  canvas: fabric.Canvas,
  x: number,
  y: number,
): (fabric.FabricImage & { data: PhotoData }) | null {
  const photos = canvas.getObjects().filter(isPhotoObj)

  for (const obj of photos) {
    const pd = (obj as FabricObjectWithData).data as PhotoData
    if (
      x >= pd.frameX && x <= pd.frameX + pd.frameW &&
      y >= pd.frameY && y <= pd.frameY + pd.frameH
    ) {
      return obj as fabric.FabricImage & { data: PhotoData }
    }
  }

  return null
}

// ─── 4c. replacePhotoInFrame ─────────────────────────────────────────────────

export async function replacePhotoInFrame(
  canvas: fabric.Canvas,
  existingPhoto: fabric.FabricImage & { data: PhotoData },
  newPhotoSrc: string,
): Promise<void> {
  const { frameX, frameY, frameW, frameH } = existingPhoto.data

  const img = await fabric.FabricImage.fromURL(newPhotoSrc, { crossOrigin: 'anonymous' })

  const naturalW   = img.width  || img.getScaledWidth()
  const naturalH   = img.height || img.getScaledHeight()
  const coverScale = Math.max(frameW / naturalW, frameH / naturalH)
  const virtW      = frameW / coverScale
  const virtH      = frameH / coverScale
  const cropX      = (naturalW - virtW) / 2
  const cropY      = (naturalH - virtH) / 2

  img.set({
    originX:           'center',
    originY:           'center',
    left:              frameX + frameW / 2,
    top:               frameY + frameH / 2,
    scaleX:            coverScale,
    scaleY:            coverScale,
    width:             virtW,
    height:            virtH,
    cropX,
    cropY,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
  })

  img.clipPath = makeClipRect(frameX, frameY, frameW, frameH)
  img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })

  ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
    type:    'photo',
    frameX,
    frameY,
    frameW,
    frameH,
    naturalW,
    naturalH,
    coverScale,
    editScale: 1,
  }

  canvas.remove(existingPhoto)
  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}

// ─── 4e. dropTextureOnPage ───────────────────────────────────────────────────
// Places a texture as a selectable, moveable image cover-scaled to the page.

export async function dropTextureOnPage(
  canvas: fabric.Canvas,
  url: string,
  pageW: number,
  pageH: number,
): Promise<void> {
  const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

  const naturalW = img.width  || img.getScaledWidth()
  const naturalH = img.height || img.getScaledHeight()
  const scale    = Math.max(pageW / naturalW, pageH / naturalH)

  img.set({
    originX:           'center',
    originY:           'center',
    left:              pageW / 2,
    top:               pageH / 2,
    scaleX:            scale,
    scaleY:            scale,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
    lockUniScaling:    true,
  })
  img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false })

  ;(img as unknown as fabric.FabricObject & { data: FreePhotoData }).data = {
    type:    'freePhoto',
    naturalW,
    naturalH,
  }

  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}

// ─── 4f. dropStickerOnPage ───────────────────────────────────────────────────
// Places a sticker at ~20% of page width, centered, selectable and moveable.

export async function dropStickerOnPage(
  canvas: fabric.Canvas,
  url: string,
  pageW: number,
  pageH: number,
): Promise<void> {
  const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })

  const naturalW = img.width  || img.getScaledWidth()
  const naturalH = img.height || img.getScaledHeight()
  const targetW  = pageW * 0.20
  const scale    = targetW / naturalW

  img.set({
    originX:           'center',
    originY:           'center',
    left:              pageW / 2,
    top:               pageH / 2,
    scaleX:            scale,
    scaleY:            scale,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
    lockUniScaling:    true,
  })

  ;(img as unknown as fabric.FabricObject & { data: FreePhotoData }).data = {
    type:    'freePhoto',
    naturalW,
    naturalH,
  }

  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}

// ─── 4d. dropPhotoFree ───────────────────────────────────────────────────────
// Adds a free-floating image at (x, y) — no frame required.
// Fits within MAX×MAX while preserving aspect ratio.

const FREE_MAX = 400

export async function dropPhotoFree(
  canvas: fabric.Canvas,
  photoSrc: string,
  x: number,
  y: number,
): Promise<void> {
  const img = await fabric.FabricImage.fromURL(photoSrc, { crossOrigin: 'anonymous' })

  const naturalW = img.width  || img.getScaledWidth()
  const naturalH = img.height || img.getScaledHeight()
  const scale    = Math.min(FREE_MAX / naturalW, FREE_MAX / naturalH, 1)

  img.set({
    originX:           'center',
    originY:           'center',
    left:              x,
    top:               y,
    scaleX:            scale,
    scaleY:            scale,
    selectable:        true,
    evented:           true,
    borderColor:       '#528ED6',
    borderScaleFactor: 2,
  })

  img.set({ lockUniScaling: true })
  img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false })

  ;(img as unknown as fabric.FabricObject & { data: FreePhotoData }).data = {
    type:    'freePhoto',
    naturalW,
    naturalH,
  }

  canvas.add(img)
  canvas.setActiveObject(img)
  canvas.renderAll()
}

// ─── 5. addTextBox ──────────────────────────────────────────────────────────

export function addTextBox(
  canvas: fabric.Canvas,
  pageW: number,
  pageH: number,
  placeholder = 'Tu texto aquí',
): fabric.Textbox {
  const W = pageW * 0.22
  const textbox = new fabric.Textbox(placeholder, {
    left: (pageW - W) / 2,
    top: pageH / 2 - 20,
    originX: 'left',
    originY: 'top',
    width: W,
    fontFamily: 'amandine',
    fontSize: 24,
    fill: '#191919',
    textAlign: 'center',
    splitByGrapheme: true,
  }) as fabric.Textbox & { data: TextData }

  textbox.data = { type: 'text' }
  textbox.set({ lockUniScaling: false, lockScalingX: false, lockScalingY: false })
  textbox.setControlsVisibility({ tl: true, tr: true, bl: true, br: true, mt: false, mb: false, ml: true, mr: true, mtr: true })

  canvas.add(textbox)
  canvas.setActiveObject(textbox)
  canvas.renderAll()
  return textbox
}

// ─── 5b. addShape ───────────────────────────────────────────────────────────

export function addShape(
  canvas: fabric.Canvas,
  kind:   ShapeKind,
  pageW:  number,
  pageH:  number,
): void {
  const cx = pageW / 2
  const cy = pageH / 2
  const FILL = '#D0D0D0'
  const base = {
    originX:      'center' as const,
    originY:      'center' as const,
    left:         cx,
    top:          cy,
    strokeUniform: true,
    selectable:   true,
    evented:      true,
  }

  let obj: fabric.FabricObject

  switch (kind) {
    case 'rect':
      obj = new fabric.Rect({ ...base, width: 200, height: 150, fill: FILL, stroke: 'transparent', strokeWidth: 0 })
      break
    case 'circle':
      obj = new fabric.Ellipse({ ...base, rx: 100, ry: 100, fill: FILL, stroke: 'transparent', strokeWidth: 0 })
      break
    case 'triangle':
      obj = new fabric.Triangle({ ...base, width: 180, height: 160, fill: FILL, stroke: 'transparent', strokeWidth: 0 })
      break
    case 'line':
      obj = new fabric.Line([0, 0, 200, 0], { ...base, stroke: '#191919', strokeWidth: 3, fill: 'transparent' })
      break
    case 'arrow':
      obj = new fabric.Path(ARROW_PATH, { ...base, fill: FILL, stroke: 'transparent', strokeWidth: 0 })
      break
  }

  ;(obj as fabric.FabricObject & { data: ShapeData }).data = { type: 'shape', shape: kind }
  canvas.add(obj)
  canvas.setActiveObject(obj)
  canvas.renderAll()
}

// ─── 6. serializePage ───────────────────────────────────────────────────────

// ─── Serialized entry types (one per canvas object kind) ────────────────────
// All entries include a `kind` discriminator so they can live in one ordered
// array that preserves canvas z-order across types.

type FrameEntry = {
  kind:    'frame'
  frameX:  number
  frameY:  number
  frameW:  number
  frameH:  number
}

type PhotoEntry = {
  kind:       'photo'
  frameX:     number
  frameY:     number
  frameW:     number
  frameH:     number
  photo:      string
  coverScale: number
  editScale:  number
  cropX:      number
  cropY:      number
  naturalW:   number
  naturalH:   number
}

type TextEntry = {
  kind:        'text'
  text:        string
  left:        number
  top:         number
  width:       number
  height:      number
  angle:       number
  scaleX:      number
  scaleY:      number
  fontSize:    number
  fontFamily:  string
  fill:        string
  fontWeight?: string
  underline?:  boolean
  textAlign?:  string
  lineHeight?:  number
  charSpacing?: number
}

type FreePhotoEntry = {
  kind:     'freePhoto'
  src:      string
  left:     number
  top:      number
  scaleX:   number
  scaleY:   number
  angle:    number
  naturalW: number
  naturalH: number
}

type ShapeEntry = {
  kind:        'shape'
  shape:       ShapeKind
  left:        number
  top:         number
  width:       number
  height:      number
  scaleX:      number
  scaleY:      number
  angle:       number
  fill:        string
  stroke:      string
  strokeWidth: number
}

type TextFrameEntry = {
  kind:   'textFrame'
  id:     string
  frameX: number
  frameY: number
  frameW: number
  frameH: number
}

type SerializedEntry = FrameEntry | PhotoEntry | TextEntry | FreePhotoEntry | ShapeEntry | TextFrameEntry

export type PageData = {
  background:       string
  backgroundImage?: string
  pageW:            number
  pageH:            number
  // Primary format: all canvas objects in z-order (bottom → top)
  objects?:         SerializedEntry[]
  // Legacy fields — present in data saved before this format; used as fallback
  frames?:     LegacyFrame[]
  texts?:      LegacyText[]
  freePhotos?: LegacyFreePhoto[]
  shapes?:     LegacyShape[]
}

// ─── Legacy types (backward compat only) ────────────────────────────────────

type LegacyFrame = {
  frameX: number; frameY: number; frameW: number; frameH: number
  isEmpty: boolean
  photo?: string; coverScale?: number; editScale?: number
  cropX?: number; cropY?: number; naturalW?: number; naturalH?: number
}
type LegacyText = {
  text: string; left: number; top: number; width: number
  fontSize: number; fontFamily: string; fill: string
  fontWeight?: string; underline?: boolean; textAlign?: string
  lineHeight?: number; charSpacing?: number
}
type LegacyFreePhoto = {
  src: string; left: number; top: number
  scaleX: number; scaleY: number; angle: number
  naturalW: number; naturalH: number
}
type LegacyShape = {
  shape: ShapeKind; left: number; top: number
  width: number; height: number
  scaleX: number; scaleY: number; angle: number
  fill: string; stroke: string; strokeWidth: number
}

export function serializePage(
  canvas: fabric.Canvas,
  pageW: number,
  pageH: number,
): PageData {
  const objects: SerializedEntry[] = []

  for (const obj of canvas.getObjects()) {
    const data = (obj as FabricObjectWithData).data

    if (data?.type === 'frame') {
      const br = obj.getBoundingRect()
      objects.push({
        kind:   'frame',
        frameX: br.left,
        frameY: br.top,
        frameW: br.width,
        frameH: br.height,
      })
    } else if (data?.type === 'textFrame') {
      const tf = data as TextFrameData
      const br = obj.getBoundingRect()
      objects.push({ kind: 'textFrame', id: tf.id, frameX: br.left, frameY: br.top, frameW: br.width, frameH: br.height })
    } else if (data?.type === 'photo' && obj instanceof fabric.FabricImage) {
      const pd = data as PhotoData
      objects.push({
        kind:       'photo',
        frameX:     pd.frameX,
        frameY:     pd.frameY,
        frameW:     pd.frameW,
        frameH:     pd.frameH,
        photo:      obj.getSrc(),
        coverScale: pd.coverScale,
        editScale:  pd.editScale,
        cropX:      obj.cropX ?? 0,
        cropY:      obj.cropY ?? 0,
        naturalW:   pd.naturalW,
        naturalH:   pd.naturalH,
      })
    } else if (data?.type === 'freePhoto' && obj instanceof fabric.FabricImage) {
      const fp = data as FreePhotoData
      objects.push({
        kind:     'freePhoto',
        src:      obj.getSrc(),
        left:     obj.left   ?? 0,
        top:      obj.top    ?? 0,
        scaleX:   obj.scaleX ?? 1,
        scaleY:   obj.scaleY ?? 1,
        angle:    obj.angle  ?? 0,
        naturalW: fp.naturalW,
        naturalH: fp.naturalH,
      })
    } else if (data?.type === 'text' && obj instanceof fabric.Textbox) {
      objects.push({
        kind:        'text',
        text:        obj.text       ?? '',
        left:        obj.left       ?? 0,
        top:         obj.top        ?? 0,
        width:       obj.width      ?? pageW * 0.5,
        height:      (obj as unknown as { data?: { boxH?: number } }).data?.boxH ?? (obj.height ?? 0),
        angle:       obj.angle      ?? 0,
        scaleX:      obj.scaleX     ?? 1,
        scaleY:      obj.scaleY     ?? 1,
        fontSize:    obj.fontSize   ?? 24,
        fontFamily:  obj.fontFamily ?? 'amandine',
        fill:        (obj.fill as string)       ?? '#191919',
        fontWeight:  (obj.fontWeight as string) ?? 'normal',
        underline:   obj.underline  ?? false,
        textAlign:   obj.textAlign  ?? 'left',
        lineHeight:  obj.lineHeight ?? 1.16,
        charSpacing: obj.charSpacing ?? 0,
      })
    } else if (data?.type === 'shape') {
      const sd = data as ShapeData
      const w = sd.shape === 'circle'
        ? 2 * (obj as unknown as fabric.Ellipse).rx
        : (obj.width ?? 100)
      const h = sd.shape === 'circle'
        ? 2 * (obj as unknown as fabric.Ellipse).ry
        : (obj.height ?? 100)
      objects.push({
        kind:        'shape',
        shape:       sd.shape,
        left:        obj.left        ?? 0,
        top:         obj.top         ?? 0,
        width:       w,
        height:      h,
        scaleX:      obj.scaleX      ?? 1,
        scaleY:      obj.scaleY      ?? 1,
        angle:       obj.angle       ?? 0,
        fill:        (obj.fill   as string) ?? '#D0D0D0',
        stroke:      (obj.stroke as string) ?? 'transparent',
        strokeWidth: obj.strokeWidth ?? 0,
      })
    }
  }

  const bgImg = canvas.backgroundImage
  const backgroundImage = bgImg instanceof fabric.FabricImage ? bgImg.getSrc() : undefined

  return {
    background: (canvas.backgroundColor as string) || '#FFFFFF',
    backgroundImage,
    pageW,
    pageH,
    objects,
  }
}

// ─── 6b. setBackgroundTexture ────────────────────────────────────────────────

export async function setBackgroundTexture(
  canvas: fabric.Canvas,
  url: string,
  pageW: number,
  pageH: number,
): Promise<void> {
  const img = await fabric.FabricImage.fromURL(url, { crossOrigin: 'anonymous' })
  const scale = Math.max(pageW / (img.width || 1), pageH / (img.height || 1))
  img.set({ originX: 'left', originY: 'top', left: 0, top: 0, scaleX: scale, scaleY: scale })
  canvas.backgroundImage = img
  canvas.renderAll()
}

// ─── 8. buildPageFromLayout ─────────────────────────────────────────────────
// Builds a PageData snapshot without a live Fabric canvas — used by auto-crear.
// Photos must have natural dimensions so cover-fit scale can be pre-computed.

export type PhotoAssignment = {
  src:      string
  naturalW: number
  naturalH: number
}

export function buildPageFromLayout(
  layout:   Layout,
  photos:   PhotoAssignment[],   // may be shorter than layout.frames (rest become empty)
  pageW:    number,
  pageH:    number,
): PageData {
  const objects: SerializedEntry[] = layout.frames.map((frame, i) => {
    const frameX = frame.x * pageW
    const frameY = frame.y * pageH
    const frameW = frame.w * pageW
    const frameH = frame.h * pageH

    const photo = photos[i]
    if (!photo) return { kind: 'frame' as const, frameX, frameY, frameW, frameH }

    const nW         = photo.naturalW || 1
    const nH         = photo.naturalH || 1
    const coverScale = Math.max(frameW / nW, frameH / nH)
    const virtW      = frameW / coverScale
    const virtH      = frameH / coverScale

    return {
      kind:       'photo' as const,
      frameX,
      frameY,
      frameW,
      frameH,
      photo:      photo.src,
      coverScale,
      editScale:  1,
      cropX:      (nW - virtW) / 2,
      cropY:      (nH - virtH) / 2,
      naturalW:   nW,
      naturalH:   nH,
    }
  })

  return { background: '#FFFFFF', pageW, pageH, objects }
}

// ─── 7b. exportPageAsJpg ────────────────────────────────────────────────────
// adjacentPage: the OTHER page of the spread, and which side it comes from.
// This is needed to render photos/freePhotos that visually span the spine.

export async function exportPageAsJpg(
  pageData: PageData,
  canvasWidth: number,
  canvasHeight: number,
  multiplier: number = 3.125,
  adjacentPage?: { data: PageData; fromSide: 'left' | 'right' },
): Promise<string> {
  const offscreen = new fabric.Canvas(undefined, {
    width: canvasWidth,
    height: canvasHeight,
    backgroundColor: '#ffffff',
  })
  await deserializePage(offscreen, pageData, canvasWidth, canvasHeight)

  // Render spanning objects from the adjacent page (spread mirrors)
  if (adjacentPage) {
    // SPINE = 1px gap between canvas pages (matches Canvas.tsx constant)
    const CANVAS_GAP = canvasWidth + 1
    const { data: adj, fromSide } = adjacentPage
    // offsetX converts adjacent-canvas coords → this-canvas coords
    const offsetX = fromSide === 'left' ? -CANVAS_GAP : CANVAS_GAP
    const entries = adj.objects ?? []

    for (const entry of entries) {
      if (entry.kind === 'photo') {
        // Left adjacent spans right when its frame's right edge exceeds canvasWidth
        // Right adjacent spans left when its frame's left edge is negative
        const spans = fromSide === 'left'
          ? entry.frameX + entry.frameW > canvasWidth
          : entry.frameX < 0
        if (!spans) continue

        const { frameX, frameY, frameW, frameH, coverScale, editScale, cropX, cropY } = entry
        const scaleXY = coverScale * editScale
        const virtW   = frameW / scaleXY
        const virtH   = frameH / scaleXY

        const img = await fabric.FabricImage.fromURL(entry.photo, { crossOrigin: 'anonymous' })
        img.set({
          originX: 'center', originY: 'center',
          left:    frameX + frameW / 2 + offsetX,
          top:     frameY + frameH / 2,
          scaleX:  scaleXY, scaleY: scaleXY,
          width:   virtW,   height: virtH,
          cropX, cropY,
          selectable: false, evented: false,
        })
        img.clipPath = makeClipRect(frameX + offsetX, frameY, frameW, frameH)
        offscreen.add(img)
        offscreen.sendObjectToBack(img)

      } else if (entry.kind === 'freePhoto') {
        // Half-width of the scaled image
        const hw = entry.naturalW * entry.scaleX / 2
        const spans = fromSide === 'left'
          ? entry.left + hw > canvasWidth
          : entry.left - hw < 0
        if (!spans) continue

        const img = await fabric.FabricImage.fromURL(entry.src, { crossOrigin: 'anonymous' })
        img.set({
          originX: 'center', originY: 'center',
          left:    entry.left + offsetX,
          top:     entry.top,
          scaleX:  entry.scaleX, scaleY: entry.scaleY,
          angle:   entry.angle,
          selectable: false, evented: false,
        })
        offscreen.add(img)
        offscreen.sendObjectToBack(img)
      }
    }
    offscreen.renderAll()
  }

  const dataUrl = offscreen.toDataURL({
    format: 'jpeg',
    quality: 1,
    multiplier,
  })
  offscreen.dispose()
  return dataUrl
}

// ─── 7. deserializePage ─────────────────────────────────────────────────────

export async function deserializePage(
  canvas: fabric.Canvas,
  pageData: PageData,
  pageW: number,
  pageH: number,
): Promise<void> {
  canvas.remove(...canvas.getObjects())
  canvas.backgroundColor = pageData.background || '#ffffff'
  canvas.backgroundImage = undefined

  if (pageData.backgroundImage) {
    const bgImg = await fabric.FabricImage.fromURL(pageData.backgroundImage, { crossOrigin: 'anonymous' })
    const scale = Math.max(pageW / (bgImg.width || 1), pageH / (bgImg.height || 1))
    bgImg.set({ originX: 'left', originY: 'top', left: 0, top: 0, scaleX: scale, scaleY: scale })
    canvas.backgroundImage = bgImg
  }

  if (pageData.objects !== undefined) {
    // New format: restore all objects in saved z-order (bottom → top)
    for (const entry of pageData.objects) {
      if (entry.kind === 'frame') {
        const rect = new fabric.Rect({
          left:   entry.frameX,
          top:    entry.frameY,
          width:  entry.frameW,
          height: entry.frameH,
          originX: 'left',
          originY: 'top',
          fill:            '#F0EFEB',
          stroke:          '#528ED6',
          strokeWidth:     1,
          strokeDashArray: [5, 5],
          strokeUniform:   true,
          selectable:      true,
          evented:         true,
          lockRotation:    true,
        }) as fabric.Rect & { data: FrameData }
        rect.data = { type: 'frame', isEmpty: true, frameX: entry.frameX, frameY: entry.frameY, frameW: entry.frameW, frameH: entry.frameH }
        canvas.add(rect)

      } else if (entry.kind === 'textFrame') {
        const rect = new fabric.Rect({
          left:   entry.frameX,
          top:    entry.frameY,
          width:  entry.frameW,
          height: entry.frameH,
          originX: 'left',
          originY: 'top',
          fill:          'transparent',
          stroke:        '#528ED6',
          strokeWidth:   1.5,
          strokeUniform: true,
          selectable:      true,
          evented:         true,
          lockRotation:    true,
        }) as fabric.Rect & { data: TextFrameData }
        rect.data = { type: 'textFrame', id: entry.id ?? Math.random().toString(36).slice(2), frameX: entry.frameX, frameY: entry.frameY, frameW: entry.frameW, frameH: entry.frameH }
        canvas.add(rect)

      } else if (entry.kind === 'photo') {
        const img = await fabric.FabricImage.fromURL(entry.photo, { crossOrigin: 'anonymous' })
        const { frameX, frameY, frameW, frameH, naturalW, naturalH, coverScale, editScale } = entry
        const scaleXY = coverScale * editScale
        const virtW   = frameW / scaleXY
        const virtH   = frameH / scaleXY
        img.set({
          originX: 'center', originY: 'center',
          left:    frameX + frameW / 2,
          top:     frameY + frameH / 2,
          scaleX:  scaleXY, scaleY: scaleXY,
          width:   virtW,   height: virtH,
          cropX:   entry.cropX, cropY: entry.cropY,
          selectable: true, evented: true,
          borderColor: '#528ED6', borderScaleFactor: 2,
        })
        img.clipPath = makeClipRect(frameX, frameY, frameW, frameH)
        img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
        ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
          type: 'photo', frameX, frameY, frameW, frameH, naturalW, naturalH, coverScale, editScale,
        }
        canvas.add(img)

      } else if (entry.kind === 'freePhoto') {
        const img = await fabric.FabricImage.fromURL(entry.src, { crossOrigin: 'anonymous' })
        img.set({
          originX: 'center', originY: 'center',
          left:    entry.left,  top:    entry.top,
          scaleX:  entry.scaleX, scaleY: entry.scaleY,
          angle:   entry.angle,
          selectable: true, evented: true,
          borderColor: '#528ED6', borderScaleFactor: 2,
          lockUniScaling: true,
        })
        img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false })
        ;(img as unknown as fabric.FabricObject & { data: FreePhotoData }).data = {
          type: 'freePhoto', naturalW: entry.naturalW, naturalH: entry.naturalH,
        }
        canvas.add(img)

      } else if (entry.kind === 'text') {
        const textbox = new fabric.Textbox(entry.text, {
          left:            entry.left,
          top:             entry.top,
          originX:         'left',
          originY:         'top',
          width:           entry.width,
          angle:           entry.angle      ?? 0,
          scaleX:          entry.scaleX     ?? 1,
          scaleY:          entry.scaleY     ?? 1,
          fontFamily:      entry.fontFamily,
          fontSize:        entry.fontSize,
          fill:            entry.fill,
          fontWeight:      entry.fontWeight  ?? 'normal',
          underline:       entry.underline   ?? false,
          textAlign:       (entry.textAlign  ?? 'left') as fabric.Textbox['textAlign'],
          lineHeight:      entry.lineHeight  ?? 1.16,
          charSpacing:     entry.charSpacing ?? 0,
          splitByGrapheme: true,
        }) as fabric.Textbox & { data: TextData }
        const savedH = entry.height ?? 0
        const contentH = (textbox as unknown as { height?: number }).height ?? 0
        const boxH = Math.max(contentH, savedH)
        textbox.data = { type: 'text', boxH } as TextData & { boxH: number }
        if (boxH > contentH) {
          ;(textbox as unknown as { height: number }).height = boxH
        }
        textbox.set({ lockUniScaling: false, lockScalingX: false, lockScalingY: false })
        canvas.add(textbox)

      } else if (entry.kind === 'shape') {
        const base = {
          originX: 'center' as const, originY: 'center' as const,
          left:    entry.left,  top:    entry.top,
          scaleX:  entry.scaleX, scaleY: entry.scaleY,
          angle:   entry.angle,
          fill:    entry.fill,  stroke: entry.stroke,
          strokeWidth: entry.strokeWidth,
          strokeUniform: true, selectable: true, evented: true,
        }
        let obj: fabric.FabricObject
        switch (entry.shape) {
          case 'rect':     obj = new fabric.Rect({ ...base, width: entry.width, height: entry.height }); break
          case 'circle':   obj = new fabric.Ellipse({ ...base, rx: entry.width / 2, ry: entry.height / 2 }); break
          case 'triangle': obj = new fabric.Triangle({ ...base, width: entry.width, height: entry.height }); break
          case 'line':     obj = new fabric.Line([0, 0, entry.width, 0], { ...base, fill: 'transparent' }); break
          case 'arrow':    obj = new fabric.Path(ARROW_PATH, { ...base }); break
        }
        ;(obj as fabric.FabricObject & { data: ShapeData }).data = { type: 'shape', shape: entry.shape }
        canvas.add(obj)
      }
    }
  } else {
    // Legacy fallback: restore from separate arrays (data saved before objects format)
    for (const sf of pageData.frames ?? []) {
      if (sf.isEmpty) {
        const rect = new fabric.Rect({
          left:    sf.frameX, top:    sf.frameY,
          width:   sf.frameW, height: sf.frameH,
          originX: 'left',   originY: 'top',
          fill:            '#F0EFEB',
          stroke:          '#528ED6',
          strokeWidth:     1,
          strokeDashArray: [5, 5],
          strokeUniform:   true,
          selectable:      true,
          evented:         true,
          lockRotation:    true,
        }) as fabric.Rect & { data: FrameData }
        rect.data = { type: 'frame', isEmpty: true, frameX: sf.frameX, frameY: sf.frameY, frameW: sf.frameW, frameH: sf.frameH }
        canvas.add(rect)
      } else if (sf.photo) {
        const img = await fabric.FabricImage.fromURL(sf.photo, { crossOrigin: 'anonymous' })
        const naturalW   = sf.naturalW ?? (img.width  || img.getScaledWidth())
        const naturalH   = sf.naturalH ?? (img.height || img.getScaledHeight())
        const coverScale = sf.coverScale ?? Math.max(sf.frameW / naturalW, sf.frameH / naturalH)
        const editScale  = sf.editScale  ?? 1
        const scaleXY    = coverScale * editScale
        const virtW      = sf.frameW / scaleXY
        const virtH      = sf.frameH / scaleXY
        const cropX      = sf.cropX ?? (naturalW - virtW) / 2
        const cropY      = sf.cropY ?? (naturalH - virtH) / 2
        img.set({
          originX: 'center', originY: 'center',
          left:    sf.frameX + sf.frameW / 2,
          top:     sf.frameY + sf.frameH / 2,
          scaleX:  scaleXY, scaleY: scaleXY,
          width:   virtW,   height: virtH,
          cropX,   cropY,
          selectable: true, evented: true,
          borderColor: '#528ED6', borderScaleFactor: 2,
        })
        img.clipPath = makeClipRect(sf.frameX, sf.frameY, sf.frameW, sf.frameH)
        img.setControlsVisibility({ mt: true, mb: true, ml: true, mr: true, tl: true, tr: true, bl: true, br: true, mtr: true })
        ;(img as unknown as fabric.FabricObject & { data: PhotoData }).data = {
          type: 'photo', frameX: sf.frameX, frameY: sf.frameY, frameW: sf.frameW, frameH: sf.frameH,
          naturalW, naturalH, coverScale, editScale,
        }
        canvas.add(img)
      }
    }

    for (const fp of pageData.freePhotos ?? []) {
      const img = await fabric.FabricImage.fromURL(fp.src, { crossOrigin: 'anonymous' })
      img.set({
        originX: 'center', originY: 'center',
        left: fp.left, top: fp.top,
        scaleX: fp.scaleX, scaleY: fp.scaleY, angle: fp.angle,
        selectable: true, evented: true,
        borderColor: '#528ED6', borderScaleFactor: 2,
        lockUniScaling: true,
      })
      img.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false })
      ;(img as unknown as fabric.FabricObject & { data: FreePhotoData }).data = {
        type: 'freePhoto', naturalW: fp.naturalW, naturalH: fp.naturalH,
      }
      canvas.add(img)
    }

    for (const st of pageData.texts ?? []) {
      const textbox = new fabric.Textbox(st.text, {
        left:            st.left,
        top:             st.top,
        width:           st.width,
        fontFamily:      st.fontFamily,
        fontSize:        st.fontSize,
        fill:            st.fill,
        fontWeight:      st.fontWeight  ?? 'normal',
        underline:       st.underline   ?? false,
        textAlign:       (st.textAlign  ?? 'left') as fabric.Textbox['textAlign'],
        lineHeight:      st.lineHeight  ?? 1.16,
        charSpacing:     st.charSpacing ?? 0,
        splitByGrapheme: true,
      }) as fabric.Textbox & { data: TextData }
      textbox.data = { type: 'text' }
      textbox.set({ lockUniScaling: false })
      textbox.setControlsVisibility({ mt: false, mb: false })
      canvas.add(textbox)
    }

    for (const ss of pageData.shapes ?? []) {
      const base = {
        originX: 'center' as const, originY: 'center' as const,
        left:    ss.left,  top:    ss.top,
        scaleX:  ss.scaleX, scaleY: ss.scaleY,
        angle:   ss.angle,
        fill:    ss.fill,  stroke: ss.stroke,
        strokeWidth: ss.strokeWidth,
        strokeUniform: true, selectable: true, evented: true,
      }
      let obj: fabric.FabricObject
      switch (ss.shape) {
        case 'rect':     obj = new fabric.Rect({ ...base, width: ss.width, height: ss.height }); break
        case 'circle':   obj = new fabric.Ellipse({ ...base, rx: ss.width / 2, ry: ss.height / 2 }); break
        case 'triangle': obj = new fabric.Triangle({ ...base, width: ss.width, height: ss.height }); break
        case 'line':     obj = new fabric.Line([0, 0, ss.width, 0], { ...base, fill: 'transparent' }); break
        case 'arrow':    obj = new fabric.Path(ARROW_PATH, { ...base }); break
      }
      ;(obj as fabric.FabricObject & { data: ShapeData }).data = { type: 'shape', shape: ss.shape }
      canvas.add(obj)
    }
  }

  canvas.renderAll()
}
