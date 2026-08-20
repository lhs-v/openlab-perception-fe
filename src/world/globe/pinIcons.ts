import { CanvasTexture, LinearFilter, SRGBColorSpace } from 'three'

const SIZE = 128
const cache = new Map<string, CanvasTexture>()

/**
 * 핀 위에 띄울 글리프를 텍스처로 굽는다.
 *
 * 이미지 파일을 번들하지 않는 이유는 전시 기계가 완전히 오프라인이기
 * 때문이다. 시스템 글꼴로 그리면 자산이 하나도 늘지 않는다. 대신 그 글꼴에
 * 기대게 되므로, 다른 OS에서는 모양이 달라진다 — 전시 기계가 정해져 있어
 * 받아들일 만한 거래다.
 *
 * 결과는 캐시한다. 같은 글리프를 쓰는 시나리오가 여럿이면 텍스처 하나를
 * 나눠 쓴다.
 */
export function iconTexture(glyph: string): CanvasTexture | null {
  const hit = cache.get(glyph)
  if (hit) return hit

  const canvas = document.createElement('canvas')
  canvas.width = SIZE
  canvas.height = SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const r = 26
  const pad = 6
  const w = SIZE - pad * 2

  // 어두운 알약 바탕. 글리프가 지구 위에서 그대로는 안 읽힌다.
  ctx.beginPath()
  ctx.moveTo(pad + r, pad)
  ctx.arcTo(pad + w, pad, pad + w, pad + w, r)
  ctx.arcTo(pad + w, pad + w, pad, pad + w, r)
  ctx.arcTo(pad, pad + w, pad, pad, r)
  ctx.arcTo(pad, pad, pad + w, pad, r)
  ctx.closePath()
  ctx.fillStyle = 'rgba(6, 8, 13, 0.86)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(120, 150, 185, 0.55)'
  ctx.lineWidth = 3
  ctx.stroke()

  ctx.font = `${Math.round(SIZE * 0.52)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", system-ui, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#dbe4ef'
  ctx.fillText(glyph, SIZE / 2, SIZE / 2 + 2)

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  // 밉맵을 만들면 작게 그려질 때 뭉개진다. 배지는 늘 작게 나온다.
  texture.minFilter = LinearFilter
  texture.magFilter = LinearFilter
  texture.generateMipmaps = false

  cache.set(glyph, texture)
  return texture
}

/** 씬을 버릴 때 함께 버린다. 캐시가 전역이므로 여기서만 비운다. */
export function disposeIconTextures(): void {
  for (const texture of cache.values()) texture.dispose()
  cache.clear()
}
