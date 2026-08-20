import { latLonToVec3 } from './geo'

/** 하강에 걸리는 시간. 이보다 짧으면 도약으로 읽히고, 길면 지루하다. */
export const DIVE_MS = 700

/** 헤일로는 지구보다 이만큼 크다. 프레이밍이 이걸 담아야 잘리지 않는다. */
export const HALO_SCALE = 1.15

/** 카메라 시야각(도). 프레이밍이 거리와 함께 결정되므로 같은 곳에 둔다. */
export const FIELD_OF_VIEW = 38

/**
 * 아무 일도 없을 때의 카메라 거리.
 *
 * 시야각 38도에서 이 거리면 지구가 화면 세로의 약 56%를 차지하고 위아래로
 * 여백이 남는다. 참고한 관제형 지구본들이 대체로 이 정도 여백을 둔다.
 *
 * 3.2에서는 지구가 세로를 91% 채우고 헤일로가 잘려 나갔다. 4.0도 73%로
 * 여전히 과했다 — 특히 지구에 몸통 색이 생긴 뒤로는 같은 크기라도 훨씬
 * 크게 읽힌다. 몸통이 없던 시절의 감각으로 거리를 정하면 안 된다.
 */
export const REST_DISTANCE = 5.2

/** 다 내려왔을 때의 카메라 거리 */
export const NEAR_DISTANCE = 1.35

/**
 * 인계 색이 차오르기 시작하는 진행도.
 *
 * 처음부터 덮으면 하강이 안 보이고 그냥 암전으로 읽힌다. 뒤쪽 28%에서만
 * 차올라야 "내려가다가 그 색에 잠겼다"로 읽힌다.
 */
export const VEIL_FROM = 0.72

export type DiveFrame = {
  /** 지구의 Y축 회전(라디안) */
  spinY: number
  /** 카메라와 원점 사이 거리 */
  distance: number
  /** 인계 색의 불투명도 0..1 */
  veil: number
}

export type DiveInput = {
  lat: number
  lon: number
  fromSpinY: number
  fromDistance: number
  /** 0..1. 범위 밖은 잘라낸다 */
  progress: number
}

/**
 * 이 지점을 카메라 정면(+Z)으로 가져오는 Y축 회전량.
 *
 * `geo.ts`의 규약에 매여 있다 — 거기서 감기 방향이 바뀌면 여기도 뒤집힌다.
 * 그래서 이 함수의 테스트는 각도를 직접 비교하지 않고, 실제로 돌려본 뒤
 * 그 지점이 정면에 오는지를 확인한다.
 */
export function spinToFace(lat: number, lon: number): number {
  const [x, , z] = latLonToVec3(lat, lon, 1)
  return Math.atan2(z, x) - Math.PI / 2
}

const clamp01 = (v: number): number => Math.min(1, Math.max(0, v))

/** 가속했다 감속하는 곡선. 하강이 기계적으로 보이지 않게 한다. */
function easeInOut(p: number): number {
  return p < 0.5 ? 4 * p * p * p : 1 - (-2 * p + 2) ** 3 / 2
}

/** 두 각도의 최단 차이. 한 바퀴 돌아가는 대신 가까운 쪽으로 돈다. */
function shortestDelta(from: number, to: number): number {
  const TAU = Math.PI * 2
  return ((((to - from) % TAU) + TAU + Math.PI) % TAU) - Math.PI
}

export function diveFrame(input: DiveInput): DiveFrame {
  const progress = clamp01(input.progress)
  const eased = easeInOut(progress)

  const target = spinToFace(input.lat, input.lon)
  const spinY = input.fromSpinY + shortestDelta(input.fromSpinY, target) * eased

  const distance = input.fromDistance + (NEAR_DISTANCE - input.fromDistance) * eased

  const veil =
    progress <= VEIL_FROM ? 0 : clamp01((progress - VEIL_FROM) / (1 - VEIL_FROM))

  return { spinY, distance, veil }
}
