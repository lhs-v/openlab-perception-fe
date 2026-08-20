import { describe, expect, it } from 'vitest'
import { AttractDirector, IDLE_MS, RESUME_MS, WARN_MS } from '@/world/attract-director'

const IDS = ['a', 'b', 'c', 'd']

function make(seed = 1) {
  return new AttractDirector({ ids: IDS, random: mulberry(seed) })
}

/** 결정적 난수 — 테스트가 흔들리지 않게 한다 */
function mulberry(seed: number): () => number {
  let t = seed
  return () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

describe('AttractDirector', () => {
  it('세계를 보여주는 상태로 시작한다', () => {
    expect(make().state).toBe('world')
  })

  it('무입력이 이어지면 하나로 들어간다', () => {
    const director = make()
    expect(director.tick(IDLE_MS - 1)).toBeNull()
    expect(director.state).toBe('world')
    const entered = director.tick(IDLE_MS)
    expect(entered).not.toBeNull()
    expect(IDS).toContain(entered)
    expect(director.state).toBe('scenario')
  })

  it('시나리오 사이에는 세계를 다시 보여준다', () => {
    const director = make()
    director.tick(IDLE_MS)
    director.scenarioEnded(20_000)
    expect(director.state).toBe('world')
    // 끝나자마자 다음으로 넘어가면 지구본을 볼 틈이 없다
    expect(director.tick(20_000 + IDLE_MS - 1)).toBeNull()
    expect(director.tick(20_000 + IDLE_MS)).not.toBeNull()
  })

  it('한 바퀴 도는 동안 같은 것을 두 번 고르지 않는다', () => {
    const director = make()
    const picked: string[] = []
    let now = 0
    for (let i = 0; i < IDS.length; i += 1) {
      now += IDLE_MS
      const id = director.tick(now)
      expect(id, `${i}번째`).not.toBeNull()
      picked.push(id!)
      director.scenarioEnded(now)
    }
    expect([...picked].sort()).toEqual([...IDS].sort())
  })

  it('연속으로 같은 것이 나오지 않는다', () => {
    const director = make(7)
    const picked: string[] = []
    let now = 0
    for (let i = 0; i < IDS.length * 4; i += 1) {
      now += IDLE_MS
      picked.push(director.tick(now)!)
      director.scenarioEnded(now)
    }
    for (let i = 1; i < picked.length; i += 1) {
      expect(picked[i], `${i}번째`).not.toBe(picked[i - 1])
    }
  })

  it('인터랙션이 있으면 자동 진입을 멈춘다', () => {
    const director = make()
    director.interacted(1000)
    expect(director.tick(1000 + IDLE_MS)).toBeNull()
    expect(director.state).toBe('world')
  })

  it('인터랙션 후 유예가 지나면 곧바로 순환을 재개한다', () => {
    const director = make()
    director.interacted(1000)
    expect(director.tick(1000 + RESUME_MS - 1)).toBeNull()
    // 45초를 기다린 뒤 다시 8초를 더 기다리게 하지 않는다
    expect(director.tick(1000 + RESUME_MS)).not.toBeNull()
  })

  it('유예가 끝나갈 때 남은 시간을 알려준다', () => {
    const director = make()
    director.interacted(1000)
    expect(director.countdownMs(1000)).toBeNull()
    expect(director.countdownMs(1000 + RESUME_MS - WARN_MS)).toBe(WARN_MS)
    expect(director.countdownMs(1000 + RESUME_MS - 1)).toBe(1)
  })

  it('사용자가 고르면 그것으로 들어간다', () => {
    const director = make()
    director.enter('c', 500)
    expect(director.state).toBe('scenario')
    expect(director.current).toBe('c')
  })

  it('사용자가 고른 것은 남은 순환에서 빠진다', () => {
    const director = make()
    director.enter('c', 500)
    director.scenarioEnded(500)

    const seen: string[] = []
    let now = 500 + RESUME_MS
    for (let i = 0; i < IDS.length - 1; i += 1) {
      seen.push(director.tick(now)!)
      director.scenarioEnded(now)
      now += IDLE_MS
    }
    expect(seen).not.toContain('c')
  })

  it('목록이 비어 있으면 아무것도 하지 않는다', () => {
    const director = new AttractDirector({ ids: [], random: mulberry(1) })
    expect(director.tick(IDLE_MS * 10)).toBeNull()
    expect(director.state).toBe('world')
  })
})
