import { describe, expect, it } from 'vitest'
import { AudioEngine } from '@/media/audio-engine'
import type { AudioEvent } from '@/core/schema'

const events: AudioEvent[] = [
  { t: 1000, label: 'a', peak: 0.8 },
  { t: 2000, label: 'b', peak: 0.5 },
]

function stubContext() {
  const started: number[] = []
  const ctx = {
    currentTime: 0,
    destination: {},
    createOscillator: () => ({
      type: '',
      frequency: { setValueAtTime: () => {} },
      connect: () => {},
      start: (at: number) => started.push(at),
      stop: () => {},
    }),
    createGain: () => ({
      gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
      connect: () => {},
    }),
    resume: () => Promise.resolve(),
    close: () => Promise.resolve(),
  } as unknown as AudioContext
  return { ctx, started }
}

describe('AudioEngine', () => {
  it('기본값은 음소거다', () => {
    const engine = new AudioEngine(events)
    expect(engine.muted).toBe(true)
  })

  it('음소거 상태에서는 소리를 내지 않는다', () => {
    const { ctx, started } = stubContext()
    const engine = new AudioEngine(events, { createContext: () => ctx })
    engine.update(3000)
    expect(started).toEqual([])
  })

  it('unmute 후 지나간 이벤트를 재생한다', () => {
    const { ctx, started } = stubContext()
    const engine = new AudioEngine(events, { createContext: () => ctx })
    engine.unmute()
    engine.update(1500)
    expect(started).toHaveLength(1)
  })

  it('같은 이벤트를 두 번 재생하지 않는다', () => {
    const { ctx, started } = stubContext()
    const engine = new AudioEngine(events, { createContext: () => ctx })
    engine.unmute()
    engine.update(1500)
    engine.update(1800)
    expect(started).toHaveLength(1)
  })

  it('되감으면 다시 재생할 수 있다', () => {
    const { ctx, started } = stubContext()
    const engine = new AudioEngine(events, { createContext: () => ctx })
    engine.unmute()
    engine.update(3000)
    expect(started).toHaveLength(2)
    engine.update(0)
    engine.update(3000)
    expect(started).toHaveLength(4)
  })

  it('부분 되감기에서는 이미 지난 이벤트를 다시 울리지 않는다', () => {
    const { ctx, started } = stubContext()
    const engine = new AudioEngine(events, { createContext: () => ctx })
    engine.unmute()
    engine.update(3000)
    expect(started).toHaveLength(2)
    engine.update(1500) // t=1000 이벤트는 여전히 새 위치 뒤에 있다
    engine.update(3000)
    // t=2000만 다시 울려야 한다
    expect(started).toHaveLength(3)
  })

  it('AudioContext를 만들 수 없어도 던지지 않는다', () => {
    const engine = new AudioEngine(events, { createContext: () => null })
    engine.unmute()
    expect(() => engine.update(3000)).not.toThrow()
  })
})
