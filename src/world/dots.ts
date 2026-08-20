import { latLonToVec3, type Vec3 } from './geo'

/** 알파 채널만 뽑아둔 육지 마스크. 이미지 디코딩은 호출자의 몫이다. */
export type LandMask = {
  width: number
  height: number
  alpha: Uint8Array
}

export type Dot = {
  position: Vec3
  lat: number
  lon: number
}

export type LandDotOptions = {
  /** 구면에 뿌릴 후보 수. 이 중 육지에 떨어진 것만 남는다 */
  samples: number
  radius: number
  /** 알파가 이 값 이상이면 육지로 본다 */
  threshold: number
}

/** 등경사각 투영으로 마스크를 읽는다. 위경도는 도 단위. */
export function sampleMask(mask: LandMask, lat: number, lon: number): number {
  const u = (lon + 180) / 360
  const v = (90 - lat) / 180
  const x = Math.min(mask.width - 1, Math.max(0, Math.floor(u * mask.width)))
  const y = Math.min(mask.height - 1, Math.max(0, Math.floor(v * mask.height)))
  return mask.alpha[y * mask.width + x] ?? 0
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))
const RAD = 180 / Math.PI

/**
 * 육지 위에만 점을 찍는다.
 *
 * 후보는 피보나치 구면으로 뿌린다 — 위경도 격자로 훑으면 극지방에 점이
 * 몰려서 그린란드가 아프리카보다 촘촘해 보인다.
 */
export function landDots(mask: LandMask, options: LandDotOptions): Dot[] {
  const { samples, radius, threshold } = options
  const dots: Dot[] = []

  for (let i = 0; i < samples; i += 1) {
    const y = samples === 1 ? 0 : 1 - (i / (samples - 1)) * 2
    const ring = Math.sqrt(Math.max(0, 1 - y * y))
    const theta = GOLDEN_ANGLE * i

    const lat = Math.asin(y) * RAD
    const lon = Math.atan2(Math.sin(theta) * ring, Math.cos(theta) * ring) * RAD

    if (sampleMask(mask, lat, lon) < threshold) continue
    dots.push({ position: latLonToVec3(lat, lon, radius), lat, lon })
  }

  return dots
}
