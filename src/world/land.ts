import type { LandMask } from './dots'
import { LAND_MASK_BITS, LAND_MASK_HEIGHT, LAND_MASK_WIDTH } from './land-mask.data'

let cached: LandMask | null = null

/**
 * 번들된 육지 마스크를 푼다.
 *
 * 비트를 그대로 두지 않고 0/255 바이트로 펴는 이유는 `sampleMask`가 알파
 * 값을 다루도록 이미 쓰여 있고, 6만 4천 바이트는 이 화면에서 무시할 수 있기
 * 때문이다. 결과는 캐시한다 — 매 프레임 다시 풀 이유가 없다.
 */
export function landMask(): LandMask {
  if (cached) return cached

  const binary = atob(LAND_MASK_BITS)
  const alpha = new Uint8Array(LAND_MASK_WIDTH * LAND_MASK_HEIGHT)
  for (let i = 0; i < alpha.length; i += 1) {
    const byte = binary.charCodeAt(i >> 3)
    alpha[i] = (byte >> (i & 7)) & 1 ? 255 : 0
  }

  cached = { width: LAND_MASK_WIDTH, height: LAND_MASK_HEIGHT, alpha }
  return cached
}
