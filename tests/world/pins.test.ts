import { describe, expect, it } from 'vitest'
import { latLonToVec3 } from '@/world/geo'
import { PIN_COLORS, pinPulse, pinSpecs, type HomeMarker } from '@/world/pins'

const homes: HomeMarker[] = [
  { id: 'a', title: '주방 화재', city: 'Seoul', country: 'KR', lat: 37.5665, lon: 126.978, localTimeLabel: '03:14', severity: 'critical' },
  { id: 'b', title: '택배 도착', city: 'Lisbon', country: 'PT', lat: 38.72, lon: -9.14, localTimeLabel: '14:02', severity: 'normal' },
]

describe('pinSpecs', () => {
  it('핀 위치가 좌표 규약을 그대로 쓴다', () => {
    // 띄운 높이만 다르고 방향은 규약과 같아야 한다. 여기서 어긋나면
    // 지구는 멀쩡한데 핀만 엉뚱한 나라에 박힌다.
    const [pin] = pinSpecs(homes, 1)
    const surface = latLonToVec3(37.5665, 126.978, 1)
    const lifted = Math.hypot(...pin!.position)
    for (let i = 0; i < 3; i += 1) {
      expect(pin!.position[i]! / lifted).toBeCloseTo(surface[i]!, 10)
    }
  })

  it('지표에서 살짝 띄운다', () => {
    // 구 표면에 딱 붙이면 점들에 가려 반쪽이 먹힌다
    const [pin] = pinSpecs(homes, 1)
    expect(Math.hypot(...pin!.position)).toBeGreaterThan(1)
    expect(Math.hypot(...pin!.position)).toBeLessThan(1.1)
  })

  it('심각도에 따라 다른 색을 낸다', () => {
    const [critical, normal] = pinSpecs(homes, 1)
    expect(critical!.color).toBe(PIN_COLORS.critical)
    expect(normal!.color).toBe(PIN_COLORS.normal)
    expect(PIN_COLORS.critical).not.toBe(PIN_COLORS.normal)
  })

  it('입력 순서와 id를 보존한다', () => {
    expect(pinSpecs(homes, 1).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('빈 목록도 받는다', () => {
    expect(pinSpecs([], 1)).toEqual([])
  })
})

describe('pinPulse', () => {
  it('0과 1 사이에 머문다', () => {
    for (let t = 0; t < 6000; t += 137) {
      expect(pinPulse('critical', t)).toBeGreaterThanOrEqual(0)
      expect(pinPulse('critical', t)).toBeLessThanOrEqual(1)
      expect(pinPulse('normal', t)).toBeGreaterThanOrEqual(0)
      expect(pinPulse('normal', t)).toBeLessThanOrEqual(1)
    }
  })

  it('같은 시각이면 같은 값이다', () => {
    expect(pinPulse('critical', 1234)).toBe(pinPulse('critical', 1234))
  })

  it('위급한 쪽이 더 빨리 뛴다', () => {
    // 한 주기 안에 최대치를 몇 번 지나는지로 센다
    const peaks = (severity: 'critical' | 'normal') => {
      let count = 0
      for (let t = 1; t < 12_000; t += 10) {
        const prev = pinPulse(severity, t - 10)
        const here = pinPulse(severity, t)
        const next = pinPulse(severity, t + 10)
        if (here > prev && here >= next) count += 1
      }
      return count
    }
    expect(peaks('critical')).toBeGreaterThan(peaks('normal'))
  })

  it('위급한 쪽이 더 밝게 뛴다', () => {
    let criticalMax = 0
    let normalMax = 0
    for (let t = 0; t < 12_000; t += 17) {
      criticalMax = Math.max(criticalMax, pinPulse('critical', t))
      normalMax = Math.max(normalMax, pinPulse('normal', t))
    }
    expect(criticalMax).toBeGreaterThan(normalMax)
  })
})
