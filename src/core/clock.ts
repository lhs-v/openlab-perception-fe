export type ClockOptions = {
  durationMs: number
  /** 실시간 소스. 테스트에서 주입한다. 기본은 performance.now */
  now?: () => number
}

export type ClockListener = (t: number) => void

export class Clock {
  readonly durationMs: number

  #now: () => number
  #t = 0
  #rate = 1
  #playing = false
  #lastNow = 0
  #listeners = new Set<ClockListener>()

  constructor(options: ClockOptions) {
    this.durationMs = options.durationMs
    this.#now = options.now ?? (() => performance.now())
  }

  get t(): number {
    return this.#t
  }

  get playing(): boolean {
    return this.#playing
  }

  get ended(): boolean {
    return this.#t >= this.durationMs
  }

  get rate(): number {
    return this.#rate
  }

  play(): void {
    if (this.#playing) return
    this.#playing = true
    // 기준점을 지금으로 다시 찍는다. 이게 없으면 일시정지 동안 흐른 실시간이
    // 재개 순간 한꺼번에 반영되어 화면이 튄다. #playing이 true가 되는 경로는
    // 여기뿐이므로 이 한 줄이 그 불변식을 혼자 책임진다.
    this.#lastNow = this.#now()
  }

  pause(): void {
    this.#playing = false
  }

  setRate(rate: number): void {
    // NaN <= 0 은 false다. 유한성부터 보지 않으면 NaN이 그대로 들어와
    // 다음 tick에서 t가 NaN이 되고, #set의 조기 반환도 NaN === NaN이
    // false라 못 막는다. 예외 없이 클럭이 영구히 죽는다.
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new RangeError(`rate는 유한한 양수여야 한다: ${rate}`)
    }
    this.#rate = rate
  }

  seek(t: number): void {
    this.#set(t)
    // play()와 같은 이유로 기준점을 다시 찍는다. 재생 중에 seek하면
    // 다음 tick이 seek 이전 구간까지 얹어서 크게 도약한다.
    this.#lastNow = this.#now()
  }

  /** 외부 구동. 앱에서는 rAF가, 테스트에서는 직접 호출한다. */
  tick(): void {
    if (!this.#playing) return
    const current = this.#now()
    const elapsed = (current - this.#lastNow) * this.#rate
    this.#lastNow = current
    this.#set(this.#t + elapsed)
    if (this.ended) this.#playing = false
  }

  subscribe(listener: ClockListener): () => void {
    this.#listeners.add(listener)
    return () => {
      this.#listeners.delete(listener)
    }
  }

  dispose(): void {
    this.#playing = false
    this.#listeners.clear()
  }

  #set(next: number): void {
    const clamped = Math.min(Math.max(next, 0), this.durationMs)
    if (clamped === this.#t) return
    this.#t = clamped
    for (const listener of this.#listeners) listener(clamped)
  }
}
