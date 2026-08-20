import { describe, expect, it } from 'vitest'
import { type LandMask, landDots, sampleMask } from '@/world/dots'

/** 왼쪽 절반만 육지인 4x2 마스크 */
function halfLandMask(): LandMask {
  const width = 4
  const height = 2
  const alpha = new Uint8Array(width * height)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      alpha[y * width + x] = x < 2 ? 255 : 0
    }
  }
  return { width, height, alpha }
}

describe('sampleMask', () => {
  const mask = halfLandMask()

  it('서반구는 육지, 동반구는 바다로 읽는다', () => {
    expect(sampleMask(mask, 0, -170)).toBe(255)
    expect(sampleMask(mask, 0, 170)).toBe(0)
  })

  it('경도 ±180 경계에서도 범위를 벗어나지 않는다', () => {
    expect(() => sampleMask(mask, 0, -180)).not.toThrow()
    expect(() => sampleMask(mask, 0, 180)).not.toThrow()
  })

  it('위도 ±90 경계에서도 범위를 벗어나지 않는다', () => {
    expect(() => sampleMask(mask, 90, 0)).not.toThrow()
    expect(() => sampleMask(mask, -90, 0)).not.toThrow()
  })
})

describe('landDots', () => {
  const mask = halfLandMask()

  it('바다에 떨어진 후보를 버린다', () => {
    const dots = landDots(mask, { samples: 2000, radius: 1, threshold: 90 })
    // 절반이 바다이므로 후보의 절반 언저리만 남아야 한다
    expect(dots.length).toBeGreaterThan(600)
    expect(dots.length).toBeLessThan(1400)
  })

  it('모든 점이 구면 위에 있다', () => {
    const dots = landDots(mask, { samples: 500, radius: 7, threshold: 90 })
    for (const dot of dots) {
      expect(Math.hypot(...dot.position)).toBeCloseTo(7)
    }
  })

  it('같은 입력이면 같은 결과다', () => {
    const options = { samples: 300, radius: 1, threshold: 90 }
    const a = landDots(mask, options)
    const b = landDots(mask, options)
    expect(a.map((d) => d.position)).toEqual(b.map((d) => d.position))
  })

  it('samples를 늘리면 점도 늘어난다', () => {
    const few = landDots(mask, { samples: 400, radius: 1, threshold: 90 })
    const many = landDots(mask, { samples: 1600, radius: 1, threshold: 90 })
    expect(many.length).toBeGreaterThan(few.length * 2)
  })

  it('임계값을 최대로 올리면 아무것도 남지 않는다', () => {
    expect(landDots(mask, { samples: 500, radius: 1, threshold: 256 })).toEqual([])
  })
})
