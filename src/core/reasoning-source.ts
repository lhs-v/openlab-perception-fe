import type { L1Event, L2Description, L3Context, L4Intent } from './schema'

export type ReasoningSlice = {
  l1: readonly L1Event[]
  l2: readonly L2Description[]
  l3: readonly L3Context[]
  l4: L4Intent | null
}

/**
 * 주어진 시점까지 도달한 추론 산출물을 낸다.
 *
 * 지금은 시나리오 JSON에서 읽지만, 다른 망의 추론 API가 연결되면
 * 이 인터페이스를 구현하는 HttpReasoningSource로 교체한다. 뷰는 바뀌지 않는다.
 *
 * `slice`는 반드시 동기다. 클럭이 초당 60번 부르므로 여기서 네트워크를
 * 기다릴 수 없다. 구현체는 비동기 작업을 전부 `slice` 바깥에서 끝내야 한다 —
 * 생성 시점에 미리 받아두거나(시나리오는 길이가 정해져 있으므로 이쪽이
 * 자연스럽다), 백그라운드 구독으로 내부 버퍼를 채워두고 `slice`는 그 버퍼만
 * 읽는 식이다. 이 제약을 어기면 교체 지점이 성립하지 않는다.
 */
export interface ReasoningSource {
  slice(t: number): ReasoningSlice
  dispose(): void
}
