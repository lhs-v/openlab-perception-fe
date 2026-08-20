import { describe, expect, it } from 'vitest'
import { sampleTrack, trackExtent } from '@/core/sensor-track'

const track = [
  { t: 0, v: 20 },
  { t: 1000, v: 30 },
  { t: 3000, v: 10 },
]

describe('sampleTrack', () => {
  it('점 위에서는 그 값을 낸다', () => {
    expect(sampleTrack(track, 1000)).toBe(30)
  })

  it('점 사이를 선형 보간한다', () => {
    expect(sampleTrack(track, 500)).toBe(25)
    expect(sampleTrack(track, 2000)).toBe(20)
  })

  it('시작 이전은 첫 값으로 고정한다', () => {
    expect(sampleTrack(track, -500)).toBe(20)
  })

  it('끝 이후는 마지막 값으로 고정한다', () => {
    expect(sampleTrack(track, 99999)).toBe(10)
  })

  it('점이 하나뿐이면 항상 그 값을 낸다', () => {
    expect(sampleTrack([{ t: 500, v: 7 }], 0)).toBe(7)
    expect(sampleTrack([{ t: 500, v: 7 }], 9999)).toBe(7)
  })

  it('빈 트랙은 거부한다', () => {
    expect(() => sampleTrack([], 0)).toThrow(/비어 있/)
  })

  it('같은 t를 두 번 적으면 램프가 아니라 계단이 된다', () => {
    // 문이 열리는 것 같은 순간 변화를 적는 자연스러운 방법이다.
    // 남은 시나리오들이 이 패턴에 의존하므로 동작을 못 박아 둔다.
    const step = [
      { t: 0, v: 0 },
      { t: 5000, v: 0 },
      { t: 5000, v: 1 },
      { t: 9000, v: 1 },
    ]
    expect(sampleTrack(step, 4999)).toBe(0)
    // 겹친 시각에서는 앞의 점이 이긴다
    expect(sampleTrack(step, 5000)).toBe(0)
    expect(sampleTrack(step, 5001)).toBe(1)
  })
})

describe('trackExtent', () => {
  it('최소값과 최대값을 낸다', () => {
    expect(trackExtent(track)).toEqual({ min: 10, max: 30 })
  })

  it('평평한 트랙에서도 max가 min보다 크도록 벌린다', () => {
    const extent = trackExtent([{ t: 0, v: 5 }, { t: 10, v: 5 }])
    expect(extent.max).toBeGreaterThan(extent.min)
  })
})
