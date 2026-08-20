import { describe, expect, it } from 'vitest'
import { latLonToVec3 } from '@/world/geo'
import {
  DIVE_MS,
  FIELD_OF_VIEW,
  HALO_SCALE,
  NEAR_DISTANCE,
  REST_DISTANCE,
  VEIL_FROM,
  diveFrame,
  spinToFace,
} from '@/world/dive'

/** 지구를 Y축으로 돌린 뒤의 좌표 */
function rotateY(v: readonly [number, number, number], theta: number) {
  const [x, y, z] = v
  return [x * Math.cos(theta) + z * Math.sin(theta), y, -x * Math.sin(theta) + z * Math.cos(theta)] as const
}

describe('spinToFace', () => {
  it('그만큼 돌리면 해당 지점이 카메라 쪽(+Z)으로 온다', () => {
    for (const [lat, lon] of [[37.5, 127], [0, 0], [-33.9, 18.4], [51.5, -0.1]] as const) {
      const rotated = rotateY(latLonToVec3(lat, lon, 1), spinToFace(lat, lon))
      // 정면이면 x가 0에 가깝고 z가 양수 최대
      expect(Math.abs(rotated[0]), `${lat},${lon}`).toBeLessThan(1e-9)
      expect(rotated[2], `${lat},${lon}`).toBeGreaterThan(0)
    }
  })
})

describe('diveFrame', () => {
  const home = { lat: 37.5665, lon: 126.978 }

  it('시작 프레임은 있던 자리 그대로다', () => {
    const frame = diveFrame({ ...home, fromSpinY: 1.23, fromDistance: 3.2, progress: 0 })
    expect(frame.spinY).toBeCloseTo(1.23)
    expect(frame.distance).toBeCloseTo(3.2)
    expect(frame.veil).toBe(0)
  })

  it('끝 프레임은 핀이 정면이고 가장 가깝고 완전히 덮인다', () => {
    const frame = diveFrame({ ...home, fromSpinY: 1.23, fromDistance: 3.2, progress: 1 })
    const rotated = rotateY(latLonToVec3(home.lat, home.lon, 1), frame.spinY)
    expect(Math.abs(rotated[0])).toBeLessThan(1e-9)
    expect(rotated[2]).toBeGreaterThan(0)
    expect(frame.distance).toBeCloseTo(NEAR_DISTANCE)
    expect(frame.veil).toBe(1)
  })

  it('거리가 단조 감소한다', () => {
    let previous = Infinity
    for (let p = 0; p <= 1; p += 0.02) {
      const { distance } = diveFrame({ ...home, fromSpinY: 0, fromDistance: 3.2, progress: p })
      expect(distance).toBeLessThanOrEqual(previous + 1e-9)
      previous = distance
    }
  })

  it('인계 색은 하강 후반에만 오른다', () => {
    // 처음부터 덮이면 하강이 안 보이고 그냥 암전으로 읽힌다
    expect(diveFrame({ ...home, fromSpinY: 0, fromDistance: 3.2, progress: VEIL_FROM - 0.01 }).veil).toBe(0)
    const late = diveFrame({ ...home, fromSpinY: 0, fromDistance: 3.2, progress: (VEIL_FROM + 1) / 2 })
    expect(late.veil).toBeGreaterThan(0)
    expect(late.veil).toBeLessThan(1)
  })

  it('가까운 쪽으로 돈다', () => {
    // 목표가 살짝 뒤면 거의 한 바퀴 도는 대신 조금만 되돌아야 한다
    const target = spinToFace(home.lat, home.lon)
    const from = target + 0.2
    const mid = diveFrame({ ...home, fromSpinY: from, fromDistance: 3.2, progress: 0.5 }).spinY
    expect(Math.abs(mid - from)).toBeLessThan(0.2)
  })

  it('한 바퀴 차이 나는 시작점에서도 짧은 길로 간다', () => {
    const target = spinToFace(home.lat, home.lon)
    const from = target - 2 * Math.PI + 0.1
    const frames = [0.25, 0.5, 0.75].map(
      (p) => diveFrame({ ...home, fromSpinY: from, fromDistance: 3.2, progress: p }).spinY,
    )
    for (const spin of frames) {
      expect(Math.abs(spin - from)).toBeLessThan(Math.PI)
    }
  })

  it('구간 밖 진행도를 잘라낸다', () => {
    expect(diveFrame({ ...home, fromSpinY: 0, fromDistance: 3.2, progress: -1 }).veil).toBe(0)
    expect(diveFrame({ ...home, fromSpinY: 0, fromDistance: 3.2, progress: 9 }).veil).toBe(1)
  })

  it('하강 길이는 사람이 따라올 수 있는 범위다', () => {
    expect(DIVE_MS).toBeGreaterThanOrEqual(500)
    expect(DIVE_MS).toBeLessThanOrEqual(1200)
  })
})

describe('프레이밍', () => {
  /** 지구 중심 평면에서 화면 세로 절반이 덮는 거리 */
  const halfHeight = (distance: number) =>
    distance * Math.tan(((FIELD_OF_VIEW / 2) * Math.PI) / 180)

  it('안식 거리에서 헤일로까지 화면에 들어온다', () => {
    // 3.2에서는 세로 절반이 1.10이라 1.15배 헤일로가 잘려 나갔다
    expect(halfHeight(REST_DISTANCE)).toBeGreaterThan(HALO_SCALE * 1.1)
  })

  it('안식 거리에서 지구가 세로를 다 채우지 않는다', () => {
    // 꽉 차면 확대된 것으로 읽히고 HUD가 놓일 자리도 없다
    expect(1 / halfHeight(REST_DISTANCE)).toBeLessThan(0.75)
  })

  it('다 내려오면 지구가 화면을 넘긴다', () => {
    // 하강 끝은 그 지역이 화면을 가득 채운 상태여야 인계가 자연스럽다
    expect(1 / halfHeight(NEAR_DISTANCE)).toBeGreaterThan(1)
  })

  it('카메라가 지구 표면 안으로 들어가지 않는다', () => {
    expect(NEAR_DISTANCE).toBeGreaterThan(1)
  })
})
