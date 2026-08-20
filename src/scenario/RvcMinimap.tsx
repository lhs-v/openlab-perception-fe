import type { RvcPathPoint } from '@/core/schema'

export type RvcPose = { x: number; y: number; heading: number }

export function samplePath(path: readonly RvcPathPoint[], t: number): RvcPose | null {
  const first = path[0]
  if (!first) return null

  const last = path[path.length - 1]!
  if (t <= first.t) return { x: first.x, y: first.y, heading: first.heading }
  if (t >= last.t) return { x: last.x, y: last.y, heading: last.heading }

  for (let i = 1; i < path.length; i += 1) {
    const prev = path[i - 1]!
    const next = path[i]!
    if (t > next.t) continue
    const span = next.t - prev.t
    const ratio = span === 0 ? 0 : (t - prev.t) / span
    return {
      x: prev.x + (next.x - prev.x) * ratio,
      y: prev.y + (next.y - prev.y) * ratio,
      heading: prev.heading + (next.heading - prev.heading) * ratio,
    }
  }

  return { x: last.x, y: last.y, heading: last.heading }
}

export default function RvcMinimap({
  path,
  t,
}: {
  path?: readonly RvcPathPoint[]
  t: number
}) {
  const pose = path ? samplePath(path, t) : null
  if (!path || !pose) return null

  // toFixed로 고정해 부동소수 오차가 DOM 속성에 새지 않게 한다.
  const points = path
    .map((point) => `${(point.x * 100).toFixed(1)},${(point.y * 100).toFixed(1)}`)
    .join(' ')

  return (
    <div
      data-testid="rvc-minimap"
      style={{
        width: 84,
        height: 84,
        background: 'rgba(6, 8, 13, 0.82)',
        border: '1px solid var(--line)',
        borderRadius: 3,
      }}
    >
      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
        {/* 평면도 윤곽 — 시나리오 공용 */}
        <rect x={5} y={5} width={90} height={90} fill="none" stroke="var(--line)" strokeWidth={1.5} />
        <line x1={5} y1={45} x2={55} y2={45} stroke="var(--line)" strokeWidth={1} />
        <line x1={55} y1={5} x2={55} y2={95} stroke="var(--line)" strokeWidth={1} />
        {/* 전체 주행 궤적 */}
        <polyline points={points} fill="none" stroke="rgba(78,161,255,0.35)" strokeWidth={1.5} />
        {/* 현재 위치와 진행 방향 */}
        <g
          data-testid="rvc-marker"
          transform={`translate(${(pose.x * 100).toFixed(1)} ${(pose.y * 100).toFixed(1)}) rotate(${pose.heading.toFixed(1)})`}
        >
          <circle r={4} fill="rgba(78, 161, 255, 0.25)" />
          <path d="M0,-3.5 L7,0 L0,3.5 Z" fill="var(--accent)" />
        </g>
      </svg>
    </div>
  )
}
