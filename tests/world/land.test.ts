import { describe, expect, it } from 'vitest'
import { sampleMask } from '@/world/dots'
import { landMask } from '@/world/land'

describe('landMask', () => {
  it('선언된 크기와 맞는 알파 배열을 낸다', () => {
    const mask = landMask()
    expect(mask.alpha.length).toBe(mask.width * mask.height)
    expect(mask.width).toBeGreaterThan(100)
  })

  it('알려진 내륙 지점을 육지로 읽는다', () => {
    const mask = landMask()
    const places = [
      ['시베리아', 60, 100],
      ['사하라', 25, 10],
      ['아마존', -5, -60],
      ['오스트레일리아 내륙', -25, 133],
      ['캔자스', 38, -98],
      ['서울', 37.5, 127],
    ] as const
    for (const [name, lat, lon] of places) {
      expect(sampleMask(mask, lat, lon), name).toBeGreaterThan(0)
    }
  })

  it('알려진 대양 지점을 바다로 읽는다', () => {
    const mask = landMask()
    const places = [
      ['북태평양', 30, -150],
      ['남태평양', -40, -120],
      ['남인도양', -40, 80],
    ] as const
    for (const [name, lat, lon] of places) {
      expect(sampleMask(mask, lat, lon), name).toBe(0)
    }
  })

  it('육지 비율이 지구와 비슷한 범위다', () => {
    const mask = landMask()
    let land = 0
    for (const a of mask.alpha) if (a > 0) land += 1
    const fraction = land / mask.alpha.length
    // 등경사각 격자는 극지방을 과대표집한다
    expect(fraction).toBeGreaterThan(0.2)
    expect(fraction).toBeLessThan(0.45)
  })

  it('두 번 불러도 같은 객체를 낸다', () => {
    expect(landMask()).toBe(landMask())
  })
})
