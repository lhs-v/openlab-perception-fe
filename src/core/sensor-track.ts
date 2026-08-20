export type TrackPoint = { t: number; v: number }

/**
 * 트랙 위 임의 시점의 값. 점 사이는 선형 보간하고 양 끝은 고정한다.
 *
 * 같은 t를 연달아 적으면 계단이 된다 — 겹친 시각에서는 앞의 점이 이기고,
 * 그 다음 밀리초부터 뒤의 값이 나온다. 문 개폐처럼 순간적인 변화를 적는
 * 방법이다. (아래 `span === 0` 분기는 방어용이며 실제로는 도달하지 않는다.
 * 루프가 언제나 앞쪽 쌍에서 먼저 멈추기 때문이다.)
 */
export function sampleTrack(track: readonly TrackPoint[], t: number): number {
  const first = track[0]
  if (!first) throw new Error('센서 트랙이 비어 있다')

  const last = track[track.length - 1]!
  if (t <= first.t) return first.v
  if (t >= last.t) return last.v

  for (let i = 1; i < track.length; i += 1) {
    const prev = track[i - 1]!
    const next = track[i]!
    if (t > next.t) continue
    const span = next.t - prev.t
    if (span === 0) return next.v
    const ratio = (t - prev.t) / span
    return prev.v + (next.v - prev.v) * ratio
  }

  return last.v
}

/** 스파크라인 y축 범위. 평평한 트랙도 그려지도록 최소 폭을 보장한다. */
export function trackExtent(track: readonly TrackPoint[]): { min: number; max: number } {
  const first = track[0]
  if (!first) throw new Error('센서 트랙이 비어 있다')

  let min = first.v
  let max = first.v
  for (const point of track) {
    if (point.v < min) min = point.v
    if (point.v > max) max = point.v
  }
  if (min === max) return { min: min - 0.5, max: max + 0.5 }
  return { min, max }
}
