import { describe, expect, it } from 'vitest'
import { QUALITY_TIERS, QualityMonitor } from '@/world/quality'

function feed(monitor: QualityMonitor, fps: number, frames: number): void {
  const step = 1000 / fps
  let now = 0
  for (let i = 0; i < frames; i += 1) {
    now += step
    monitor.frame(now)
  }
}

describe('QualityMonitor', () => {
  it('최고 등급에서 시작한다', () => {
    expect(new QualityMonitor().tier).toBe(0)
  })

  it('충분히 빠르면 등급을 유지한다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 60, 200)
    expect(monitor.tier).toBe(0)
  })

  it('표본이 찰 때까지는 판단하지 않는다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 20, 10)
    expect(monitor.tier).toBe(0)
  })

  it('느리면 한 단계 내려간다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 30, 60)
    expect(monitor.tier).toBe(1)
  })

  it('계속 느리면 계속 내려간다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 20, 400)
    expect(monitor.tier).toBe(QUALITY_TIERS.length - 1)
  })

  it('최저 등급 아래로는 내려가지 않는다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 5, 2000)
    expect(monitor.tier).toBe(QUALITY_TIERS.length - 1)
  })

  it('빨라져도 다시 올라가지 않는다', () => {
    const monitor = new QualityMonitor()
    feed(monitor, 30, 60)
    expect(monitor.tier).toBe(1)
    feed(monitor, 60, 600)
    // 올렸다 내렸다 하면 화면이 눈에 띄게 요동친다
    expect(monitor.tier).toBe(1)
  })

  it('등급이 내려가면 점 수도 줄어든다', () => {
    for (let i = 1; i < QUALITY_TIERS.length; i += 1) {
      expect(QUALITY_TIERS[i]!.dotSamples).toBeLessThan(QUALITY_TIERS[i - 1]!.dotSamples)
    }
  })

  it('시계가 뒤로 가면 그 전 표본을 버린다', () => {
    // 창을 다 못 채운 느린 표본이 남아 있다가 다음 창에 섞이면,
    // 이후 내내 60fps가 나와도 평균이 임계선 아래로 끌려가 헛강등이 난다.
    const monitor = new QualityMonitor()
    feed(monitor, 30, 30)
    monitor.frame(0)
    feed(monitor, 60, 200)
    expect(monitor.tier).toBe(0)
  })

  it('등급이 바뀌면 알린다', () => {
    const seen: number[] = []
    const monitor = new QualityMonitor({ onChange: (tier) => seen.push(tier) })
    feed(monitor, 30, 60)
    expect(seen).toEqual([1])
  })
})
