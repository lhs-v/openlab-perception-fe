export type QualityTier = {
  /** 구면에 뿌릴 후보 점 수 */
  dotSamples: number
  /** devicePixelRatio 상한 */
  maxPixelRatio: number
  /** 동시에 살아 있을 수 있는 개입 호의 수 */
  maxArcs: number
}

/**
 * 등급은 내려가기만 한다. 회복 로직을 넣으면 경계 근처에서 등급이 오르내리며
 * 점 수가 계속 바뀌고, 그게 화면에서 그대로 보인다.
 */
export const QUALITY_TIERS: readonly QualityTier[] = [
  { dotSamples: 48000, maxPixelRatio: 2, maxArcs: 12 },
  { dotSamples: 30000, maxPixelRatio: 1.5, maxArcs: 8 },
  { dotSamples: 18000, maxPixelRatio: 1, maxArcs: 5 },
  { dotSamples: 10000, maxPixelRatio: 1, maxArcs: 3 },
]

const WINDOW_FRAMES = 50
const FLOOR_FPS = 55.5

export type QualityMonitorOptions = {
  onChange?: (tier: number) => void
}

export class QualityMonitor {
  #tier = 0
  #lastNow: number | null = null
  #samples: number[] = []
  #onChange: ((tier: number) => void) | undefined

  constructor(options: QualityMonitorOptions = {}) {
    this.#onChange = options.onChange
  }

  get tier(): number {
    return this.#tier
  }

  get settings(): QualityTier {
    return QUALITY_TIERS[this.#tier]!
  }

  /** 매 프레임 현재 시각(ms)을 넘긴다. */
  frame(now: number): void {
    if (this.#lastNow !== null) {
      const delta = now - this.#lastNow
      if (delta > 0) {
        this.#samples.push(1000 / delta)
      } else {
        // 시계가 거꾸로 가거나 멈췄다 — 새 측정 구간으로 본다. 이전 구간의
        // 표본이 남아 있으면 다음 평균에 섞여 들어가 잘못된 강등을 부른다.
        this.#samples = []
      }
    }
    this.#lastNow = now

    if (this.#samples.length < WINDOW_FRAMES) return

    const mean = this.#samples.reduce((a, b) => a + b, 0) / this.#samples.length
    this.#samples = []

    if (mean >= FLOOR_FPS) return
    if (this.#tier >= QUALITY_TIERS.length - 1) return

    this.#tier += 1
    this.#onChange?.(this.#tier)
  }
}
