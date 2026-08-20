import type { ReasoningSlice, ReasoningSource } from './reasoning-source'
import type { L1Event, L2Description, L3Context, Scenario } from './schema'

/** t 오름차순으로 정렬된 배열에서, t 이하인 접두부의 길이를 이진 탐색으로 찾는다. */
function countUpTo(sorted: readonly { t: number }[], t: number): number {
  let low = 0
  let high = sorted.length
  while (low < high) {
    const mid = (low + high) >>> 1
    if (sorted[mid]!.t <= t) low = mid + 1
    else high = mid
  }
  return low
}

export class FixtureReasoningSource implements ReasoningSource {
  #l1: readonly L1Event[]
  #l2: readonly L2Description[]
  #l3: readonly L3Context[]
  #scenario: Scenario

  /** 같은 접두부 길이 조합이면 같은 객체를 돌려주기 위한 캐시 */
  #cacheKey = ''
  #cached: ReasoningSlice | null = null

  constructor(scenario: Scenario) {
    this.#scenario = scenario
    const byTime = <T extends { t: number }>(items: readonly T[]): T[] =>
      [...items].sort((a, b) => a.t - b.t)
    this.#l1 = byTime(scenario.reasoning.l1)
    this.#l2 = byTime(scenario.reasoning.l2)
    this.#l3 = byTime(scenario.reasoning.l3)
  }

  slice(t: number): ReasoningSlice {
    const n1 = countUpTo(this.#l1, t)
    const n2 = countUpTo(this.#l2, t)
    const n3 = countUpTo(this.#l3, t)
    const hasL4 = this.#scenario.reasoning.l4.t <= t

    const key = `${n1}:${n2}:${n3}:${hasL4 ? 1 : 0}`
    if (key === this.#cacheKey && this.#cached) return this.#cached

    const slice: ReasoningSlice = {
      l1: this.#l1.slice(0, n1),
      l2: this.#l2.slice(0, n2),
      l3: this.#l3.slice(0, n3),
      l4: hasL4 ? this.#scenario.reasoning.l4 : null,
    }
    this.#cacheKey = key
    this.#cached = slice
    return slice
  }

  dispose(): void {
    this.#cached = null
    this.#cacheKey = ''
  }
}
