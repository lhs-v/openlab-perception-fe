import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Clock } from '@/core/clock'

let now = 0
const nowFn = () => now

beforeEach(() => { now = 0 })

describe('Clock', () => {
  it('정지 상태에서는 tick이 시간을 진행시키지 않는다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    now = 500
    clock.tick()
    expect(clock.t).toBe(0)
  })

  it('재생 중에는 경과 실시간만큼 진행한다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    clock.play()
    now = 300
    clock.tick()
    expect(clock.t).toBe(300)
  })

  it('durationMs에서 멈추고 ended가 된다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    clock.play()
    now = 5000
    clock.tick()
    expect(clock.t).toBe(1000)
    expect(clock.ended).toBe(true)
  })

  it('rate를 반영한다', () => {
    const clock = new Clock({ durationMs: 10000, now: nowFn })
    clock.play()
    clock.setRate(2)
    now = 100
    clock.tick()
    expect(clock.t).toBe(200)
  })

  it('일시정지 동안 흐른 실시간을 건너뛴다', () => {
    const clock = new Clock({ durationMs: 10000, now: nowFn })
    clock.play()
    now = 100
    clock.tick()
    clock.pause()
    now = 5000
    clock.tick()
    clock.play()
    now = 5100
    clock.tick()
    expect(clock.t).toBe(200)
  })

  it('seek은 범위 안으로 잘라낸다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    clock.seek(-50)
    expect(clock.t).toBe(0)
    clock.seek(99999)
    expect(clock.t).toBe(1000)
  })

  it('구독자에게 t를 방출한다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    const spy = vi.fn()
    clock.subscribe(spy)
    clock.seek(400)
    expect(spy).toHaveBeenCalledWith(400)
  })

  it('구독 해제 후에는 방출하지 않는다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    const spy = vi.fn()
    const unsubscribe = clock.subscribe(spy)
    unsubscribe()
    clock.seek(400)
    expect(spy).not.toHaveBeenCalled()
  })

  it('t가 바뀌지 않으면 중복 방출하지 않는다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    const spy = vi.fn()
    clock.subscribe(spy)
    clock.seek(400)
    clock.seek(400)
    expect(spy).toHaveBeenCalledTimes(1)
  })

  it('재생 중 seek해도 다음 tick은 seek 이후 경과분만 더한다', () => {
    const clock = new Clock({ durationMs: 10000, now: nowFn })
    clock.play()
    now = 3000
    clock.seek(5000)
    now = 3016
    clock.tick()
    // seek이 기준점을 다시 찍지 않으면 8016이 되어 3초를 도약한다
    expect(clock.t).toBe(5016)
  })

  it('rate가 유한한 양수가 아니면 거부한다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    expect(() => clock.setRate(0)).toThrow(RangeError)
    expect(() => clock.setRate(-1)).toThrow(RangeError)
    // NaN은 <= 0 비교를 통과해버리므로 따로 막아야 한다
    expect(() => clock.setRate(NaN)).toThrow(RangeError)
    expect(() => clock.setRate(Infinity)).toThrow(RangeError)
  })

  it('dispose 후에는 구독자가 비워진다', () => {
    const clock = new Clock({ durationMs: 1000, now: nowFn })
    const spy = vi.fn()
    clock.subscribe(spy)
    clock.dispose()
    clock.seek(400)
    expect(spy).not.toHaveBeenCalled()
  })
})
