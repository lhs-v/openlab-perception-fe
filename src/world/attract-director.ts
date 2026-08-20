/** 아무도 만지지 않을 때 다음 시나리오로 들어가기까지 */
export const IDLE_MS = 8_000
/** 인터랙션 후 자동 순환을 재개하기까지 */
export const RESUME_MS = 45_000
/** 재개 전 카운트다운을 보여주는 구간 */
export const WARN_MS = 10_000

export type DirectorState = 'world' | 'scenario'

export type AttractDirectorOptions = {
  ids: readonly string[]
  /** 결정적 테스트를 위해 주입 가능 */
  random?: () => number
}

/**
 * 유휴·인터랙션·순환을 관장한다. DOM도 타이머도 모른다 — 호출자가 매 프레임
 * `tick(now)`를 부르고, 반환값이 null이 아니면 그 시나리오로 들어간다.
 *
 * 다음 대상은 셔플백에서 뽑는다. 순수 랜덤이면 같은 집이 연달아 나와서
 * 관객이 "고장났나" 하고 본다.
 */
export class AttractDirector {
  #ids: readonly string[]
  #random: () => number
  #bag: string[] = []
  #state: DirectorState = 'world'
  #current: string | null = null
  #last: string | null = null
  #idleSince = 0
  #interactedAt: number | null = null

  constructor(options: AttractDirectorOptions) {
    this.#ids = options.ids
    this.#random = options.random ?? Math.random
  }

  get state(): DirectorState {
    return this.#state
  }

  get current(): string | null {
    return this.#current
  }

  /** 사용자가 무언가를 만졌다. 자동 진입을 유예한다. */
  interacted(now: number): void {
    this.#interactedAt = now
    this.#idleSince = now
  }

  /** 사용자가 직접 고른 경우. */
  enter(id: string, now: number): void {
    // 가방이 비어 있으면 먼저 채운다. 안 그러면 뺄 것이 없어서,
    // 방금 사용자가 본 집이 곧바로 자동 순환에 다시 나온다.
    if (this.#bag.length === 0) this.#refill()
    this.#take(id)
    this.#state = 'scenario'
    this.#current = id
    this.#last = id
    this.#interactedAt = now
    this.#idleSince = now
  }

  /** 호출자가 시나리오 종료 시각을 넘긴다. 이 시점부터 다시 유휴를 센다. */
  scenarioEnded(now: number): void {
    this.#state = 'world'
    this.#current = null
    this.#idleSince = now
  }

  /**
   * 재개까지 남은 시간. 카운트다운 구간에 들어섰을 때만 값이 나온다.
   * 예고 없이 화면을 뺏지 않기 위한 것이다.
   */
  countdownMs(now: number): number | null {
    if (this.#interactedAt === null) return null
    const remaining = this.#interactedAt + RESUME_MS - now
    if (remaining > WARN_MS || remaining <= 0) return null
    return remaining
  }

  /** 매 프레임 부른다. 들어갈 시나리오 id를 내거나 null. */
  tick(now: number): string | null {
    if (this.#state === 'scenario') return null
    if (this.#ids.length === 0) return null

    if (this.#interactedAt !== null) {
      if (now - this.#interactedAt < RESUME_MS) return null
      this.#interactedAt = null
      // 유예가 곧 유휴였다. 45초를 기다린 사람을 8초 더 기다리게 하지 않는다.
      this.#idleSince = now - IDLE_MS
    }

    if (now - this.#idleSince < IDLE_MS) return null

    const id = this.#draw()
    if (id === null) return null

    this.#state = 'scenario'
    this.#current = id
    this.#last = id
    return id
  }

  #draw(): string | null {
    if (this.#bag.length === 0) this.#refill()
    const id = this.#bag.pop() ?? null
    if (id !== null && id === this.#last && this.#bag.length > 0) {
      // 가방 경계에서 같은 것이 연달아 나오면 하나 건너뛴다
      const swap = this.#bag.pop()!
      this.#bag.push(id)
      return swap
    }
    return id
  }

  #take(id: string): void {
    const at = this.#bag.indexOf(id)
    if (at >= 0) this.#bag.splice(at, 1)
  }

  #refill(): void {
    const next = [...this.#ids]
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(this.#random() * (i + 1))
      ;[next[i], next[j]] = [next[j]!, next[i]!]
    }
    this.#bag = next
  }
}
