import { latLonToVec3, type Vec3 } from './geo'

export type Severity = 'critical' | 'normal'

/**
 * 지구본이 한 집에 대해 알아야 하는 전부.
 *
 * 시나리오 전체가 아니라 이것만 받는 이유는, 지구본을 다른 코드베이스로
 * 옮길 때 시나리오 스키마까지 딸려 가지 않게 하려는 것이다. 핀을 세우는 데
 * 카메라도 센서도 추론도 필요 없다.
 */
export type HomeMarker = {
  id: string
  title: string
  city: string
  country: string
  lat: number
  lon: number
  /** 화면에 그대로 찍는 현지 시각. 실제 시계가 아니라 서사의 시각이다 */
  localTimeLabel: string
  severity: Severity
  /** 핀 위에 띄울 한 글자. 없으면 핀만 뜬다 */
  icon?: string
}

export type PinSpec = {
  id: string
  position: Vec3
  color: number
  severity: Severity
  icon?: string
  /** 배지가 떠 있을 자리. 핀보다 더 바깥이다 */
  badgePosition: Vec3
}

export const PIN_COLORS: Record<Severity, number> = {
  critical: 0xff5a4e,
  normal: 0x43d1a0,
}

/** 지표에서 띄우는 높이. 붙이면 지구 점들에 반쪽이 먹힌다. */
const PIN_LIFT = 1.015

/** 배지가 뜨는 높이. 핀 위에 얹혀 보이되 지구에서 떨어져 보이지는 않는다. */
const BADGE_LIFT = 1.085

const PULSE = {
  critical: { periodMs: 1400, peak: 1 },
  normal: { periodMs: 4200, peak: 0.45 },
} as const

export function pinSpecs(homes: readonly HomeMarker[], radius: number): PinSpec[] {
  return homes.map((home) => ({
    id: home.id,
    position: latLonToVec3(home.lat, home.lon, radius * PIN_LIFT),
    badgePosition: latLonToVec3(home.lat, home.lon, radius * BADGE_LIFT),
    color: PIN_COLORS[home.severity],
    severity: home.severity,
    ...(home.icon ? { icon: home.icon } : {}),
  }))
}

/**
 * 맥동 세기 0..1. 시각에서만 나오므로 되감아도 화면이 튀지 않는다.
 *
 * 위급한 쪽이 더 빠르고 더 밝게 뛴다 — 지구본을 훑을 때 어디를 봐야 하는지가
 * 색만이 아니라 움직임으로도 읽혀야 한다.
 */
export function pinPulse(severity: Severity, t: number): number {
  const { periodMs, peak } = PULSE[severity]
  const phase = (t % periodMs) / periodMs
  // 위로 솟았다 천천히 잦아드는 모양. 사인파는 심장박동처럼 안 읽힌다.
  const wave = Math.sin(phase * Math.PI) ** 3
  return wave * peak
}
