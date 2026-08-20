/** t 기반 결정적 의사난수. Math.random을 쓰면 seek 시 화면이 튄다. */
export function noise(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453
  return x - Math.floor(x)
}

export function drawScanlines(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#000000'
  for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1)
  ctx.globalAlpha = 1
}

export function drawGrain(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  amount: number,
): void {
  const count = Math.floor(width * height * 0.0012 * amount)
  ctx.globalAlpha = 0.35
  ctx.fillStyle = '#ffffff'
  for (let i = 0; i < count; i += 1) {
    const seed = i + Math.floor(t / 80) * 997
    ctx.fillRect(noise(seed) * width, noise(seed + 0.5) * height, 1, 1)
  }
  ctx.globalAlpha = 1
}

export function drawOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  label: string,
): void {
  ctx.font = '11px ui-monospace, monospace'
  ctx.fillStyle = 'rgba(219, 228, 239, 0.85)'
  ctx.textBaseline = 'top'
  ctx.fillText(label, 8, 8)

  const total = Math.floor(t / 1000)
  const mm = String(Math.floor(total / 60)).padStart(2, '0')
  const ss = String(total % 60).padStart(2, '0')
  const cs = String(Math.floor((t % 1000) / 10)).padStart(2, '0')
  ctx.textAlign = 'right'
  ctx.fillText(`${mm}:${ss}.${cs}`, width - 8, 8)
  ctx.textAlign = 'left'

  // REC 인디케이터 — 1초 주기 점멸
  if (Math.floor(t / 500) % 2 === 0) {
    ctx.fillStyle = '#ff5a4e'
    ctx.beginPath()
    ctx.arc(12, height - 14, 4, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.fillStyle = 'rgba(219, 228, 239, 0.7)'
  ctx.fillText('REC', 22, height - 20)
}

/**
 * 화재 등으로 인한 열기·연무를 화면 전체에 얹는다. heat는 0..1.
 *
 * `maxAlpha`는 카메라마다 달라야 한다. 네 패널이 하나의 공유 상한에 클램프되면
 * 절정에서 rvc와 거실이 같은 값으로 포화해 연무가 픽셀 단위로 같아진다.
 * 하필 rvc가 판단을 뒤집는 순간이 절정이므로, 바로 그때 네 번째 카메라가
 * 왜 있는지가 화면에서 사라진다. 상한을 분리해 순서가 항상 유지되게 한다.
 */
export function drawHeatHaze(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  t: number,
  heat: number,
  maxAlpha: number,
): void {
  if (heat <= 0) return
  const flicker = 0.85 + noise(Math.floor(t / 100)) * 0.3
  const orange = Math.min(maxAlpha, heat * maxAlpha * flicker)
  ctx.globalAlpha = orange
  ctx.fillStyle = '#ff7a3c'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = orange * 0.72
  ctx.fillStyle = '#c9c2b8'
  ctx.fillRect(0, 0, width, height)
  ctx.globalAlpha = 1
}
