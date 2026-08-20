import type { CameraId } from '@/core/schema'
import type { PaintContext, Painter } from '../frame-source'
import { drawGrain, drawHeatHaze, drawOverlay, drawScanlines, noise } from './common'

export type PainterOptions = {
  severity: 'critical' | 'normal'
  /** 해당 시점의 위험도 0..1. 화재면 온도·연기에서 파생한다. */
  heatAt: (t: number) => number
}

const LABELS: Record<CameraId, string> = {
  livingroom: 'CAM 01 · LIVINGROOM',
  entry: 'CAM 02 · ENTRY',
  bedroom: 'CAM 03 · BEDROOM',
  rvc: 'CAM 04 · RVC',
}

function fillBase(ctx: CanvasRenderingContext2D, w: number, h: number, color: string): void {
  ctx.fillStyle = color
  ctx.fillRect(0, 0, w, h)
}

function paintLivingroom({ ctx, width: w, height: h, t }: PaintContext, heat: number): void {
  fillBase(ctx, w, h, '#141a22')
  // 바닥 경계
  ctx.strokeStyle = '#2a3644'
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, h * 0.62)
  ctx.lineTo(w, h * 0.58)
  ctx.stroke()
  // 소파
  ctx.fillStyle = '#1e2733'
  ctx.fillRect(w * 0.08, h * 0.5, w * 0.34, h * 0.28)
  // 테이블
  ctx.fillRect(w * 0.52, h * 0.62, w * 0.22, h * 0.1)
  // 천장 조명
  const glow = 0.25 + noise(Math.floor(t / 400)) * 0.06
  ctx.globalAlpha = glow
  ctx.fillStyle = '#ffe6b0'
  ctx.beginPath()
  ctx.ellipse(w * 0.7, h * 0.12, w * 0.18, h * 0.1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  drawHeatHaze(ctx, w, h, t, heat, 0.42)
  drawGrain(ctx, w, h, t, 0.5)
  drawScanlines(ctx, w, h)
  drawOverlay(ctx, w, h, t, LABELS.livingroom)
}

function paintEntry({ ctx, width: w, height: h, t }: PaintContext, heat: number): void {
  fillBase(ctx, w, h, '#101720')
  // 문틈으로 새어 바닥에 퍼지는 현관등. 이게 없으면 베이스 색이 rvc와
  // 거의 같아 20피트 밖에서 두 패널이 구분되지 않는다. 네 시점이 서로
  // 다르게 읽히는 것이 이 데모 논지의 전제다.
  ctx.globalAlpha = 0.14
  ctx.fillStyle = '#ffd9a0'
  ctx.beginPath()
  ctx.moveTo(w * 0.32, h * 0.16)
  ctx.lineTo(w * 0.68, h * 0.16)
  ctx.lineTo(w * 0.82, h)
  ctx.lineTo(w * 0.18, h)
  ctx.closePath()
  ctx.fill()
  ctx.globalAlpha = 1
  // 현관문
  ctx.fillStyle = '#1b2430'
  ctx.fillRect(w * 0.3, h * 0.14, w * 0.4, h * 0.72)
  ctx.strokeStyle = '#334154'
  ctx.lineWidth = 2
  ctx.strokeRect(w * 0.3, h * 0.14, w * 0.4, h * 0.72)
  // 손잡이
  ctx.fillStyle = '#6d7d90'
  ctx.beginPath()
  ctx.arc(w * 0.65, h * 0.5, 3, 0, Math.PI * 2)
  ctx.fill()
  // 신발장
  ctx.fillStyle = '#18202b'
  ctx.fillRect(0, h * 0.6, w * 0.24, h * 0.4)
  drawHeatHaze(ctx, w, h, t, heat, 0.2)
  drawGrain(ctx, w, h, t, 0.6)
  drawScanlines(ctx, w, h)
  drawOverlay(ctx, w, h, t, LABELS.entry)
}

function paintBedroom({ ctx, width: w, height: h, t }: PaintContext, heat: number): void {
  fillBase(ctx, w, h, '#080c12')
  // 야간 적외선 톤
  ctx.globalAlpha = 0.12
  ctx.fillStyle = '#5fe0a8'
  ctx.fillRect(0, 0, w, h)
  ctx.globalAlpha = 1
  // 침대
  ctx.fillStyle = '#141c26'
  ctx.fillRect(w * 0.18, h * 0.52, w * 0.64, h * 0.34)
  // 이불 아래 사람 실루엣 — 미세한 호흡
  const breathe = Math.sin(t / 1400) * 2
  ctx.fillStyle = '#1d2733'
  ctx.beginPath()
  ctx.ellipse(w * 0.45, h * 0.58 + breathe, w * 0.16, h * 0.07, 0, 0, Math.PI * 2)
  ctx.fill()
  drawHeatHaze(ctx, w, h, t, heat, 0.16)
  drawGrain(ctx, w, h, t, 1.4) // 야간이라 노이즈가 강함
  drawScanlines(ctx, w, h)
  drawOverlay(ctx, w, h, t, LABELS.bedroom)
}

function paintRvc({ ctx, width: w, height: h, t }: PaintContext, heat: number): void {
  // 주행 진동 — 바닥 시점이라 흔들림이 크다.
  // save/restore로 감싼다. setTransform으로 항등행렬을 찍으면
  // CanvasFrameSource가 걸어둔 DPR 스케일까지 지워져서, 고해상도 화면에서
  // 이 패널의 오버레이만 절반 크기로 그려진다.
  ctx.save()
  const shakeX = (noise(Math.floor(t / 90)) - 0.5) * 4
  const shakeY = (noise(Math.floor(t / 90) + 7) - 0.5) * 3
  ctx.translate(shakeX, shakeY)

  fillBase(ctx, w, h, '#0b1016')
  // 바닥 근접 시점 — 원근 타일
  ctx.strokeStyle = '#1f2c3a'
  ctx.lineWidth = 1
  const horizon = h * 0.3
  for (let i = 0; i <= 8; i += 1) {
    const x = (w / 8) * i
    ctx.beginPath()
    ctx.moveTo(w / 2 + (x - w / 2) * 0.25, horizon)
    ctx.lineTo(x, h)
    ctx.stroke()
  }
  for (let i = 1; i <= 6; i += 1) {
    const y = horizon + (h - horizon) * (i / 6) ** 1.8
    ctx.beginPath()
    ctx.moveTo(0, y)
    ctx.lineTo(w, y)
    ctx.stroke()
  }
  // 어안 비네팅
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.2, w / 2, h / 2, h * 0.75)
  vignette.addColorStop(0, 'rgba(0,0,0,0)')
  vignette.addColorStop(1, 'rgba(0,0,0,0.85)')
  ctx.fillStyle = vignette
  ctx.fillRect(0, 0, w, h)

  ctx.restore()
  // 바닥면 연무는 rvc에서 가장 짙게 보인다
  drawHeatHaze(ctx, w, h, t, heat, 0.58)
  drawGrain(ctx, w, h, t, 0.8)
  drawScanlines(ctx, w, h)
  drawOverlay(ctx, w, h, t, LABELS.rvc)
}

const PAINTERS: Record<CameraId, (paint: PaintContext, heat: number) => void> = {
  livingroom: paintLivingroom,
  entry: paintEntry,
  bedroom: paintBedroom,
  rvc: paintRvc,
}

export function createPainter(cameraId: CameraId, options: PainterOptions): Painter {
  const paintFn = PAINTERS[cameraId]
  return (paint) => {
    const heat = options.severity === 'critical' ? options.heatAt(paint.t) : 0
    paintFn(paint, Math.min(1, Math.max(0, heat)))
  }
}
