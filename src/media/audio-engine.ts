import type { AudioEvent } from '@/core/schema'

export type AudioEngineOptions = {
  /** 테스트에서 주입한다. null을 내면 무음으로 조용히 동작한다. */
  createContext?: () => AudioContext | null
}

const BEEP_SECONDS = 0.35

export class AudioEngine {
  #events: readonly AudioEvent[]
  #createContext: () => AudioContext | null
  #ctx: AudioContext | null = null
  #muted = true
  #firedUpTo = -1

  constructor(events: readonly AudioEvent[], options: AudioEngineOptions = {}) {
    this.#events = [...events].sort((a, b) => a.t - b.t)
    this.#createContext =
      options.createContext ??
      (() => (typeof AudioContext === 'undefined' ? null : new AudioContext()))
  }

  get muted(): boolean {
    return this.#muted
  }

  /** 브라우저 자동재생 정책상 첫 사용자 인터랙션 이후에만 부를 수 있다. */
  unmute(): void {
    this.#muted = false
    this.#ctx ??= this.#createContext()
    void this.#ctx?.resume()
  }

  mute(): void {
    this.#muted = true
  }

  /** 클럭이 진행할 때마다 부른다. 이전 호출 이후 지나간 이벤트를 한 번씩 낸다. */
  update(t: number): void {
    // 되감기: 새 위치보다 앞선 이벤트는 이미 지나간 것으로 본다.
    // -1로 되돌리면 뒤로 조금만 감아도 새 위치 뒤에 있는 경보음까지
    // 다시 울린다. 처음으로 되감는 경우는 t가 0이라 결과가 같다.
    if (t < this.#firedUpTo) this.#firedUpTo = t
    for (const event of this.#events) {
      if (event.t <= this.#firedUpTo || event.t > t) continue
      this.#fire(event)
    }
    this.#firedUpTo = t
  }

  dispose(): void {
    void this.#ctx?.close()
    this.#ctx = null
  }

  #fire(event: AudioEvent): void {
    if (this.#muted) return
    const ctx = this.#ctx
    if (!ctx) return

    const now = ctx.currentTime
    const oscillator = ctx.createOscillator()
    const gain = ctx.createGain()

    oscillator.type = 'square'
    oscillator.frequency.setValueAtTime(880, now)
    gain.gain.setValueAtTime(Math.max(0.0001, event.peak * 0.15), now)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + BEEP_SECONDS)

    oscillator.connect(gain)
    gain.connect(ctx.destination)
    oscillator.start(now)
    oscillator.stop(now + BEEP_SECONDS)
  }
}
