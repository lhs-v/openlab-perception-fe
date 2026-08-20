import { describe, expect, it } from 'vitest'
import { angularDistance, latLonToVec3 } from '@/world/geo'

const R = 100

describe('latLonToVec3', () => {
  it('북극은 +Y 축이다', () => {
    const [x, y, z] = latLonToVec3(90, 0, R)
    expect(x).toBeCloseTo(0)
    expect(y).toBeCloseTo(R)
    expect(z).toBeCloseTo(0)
  })

  it('남극은 -Y 축이다', () => {
    const [, y] = latLonToVec3(-90, 0, R)
    expect(y).toBeCloseTo(-R)
  })

  it('적도 위의 점은 y가 0이고 반지름을 유지한다', () => {
    for (const lon of [-180, -90, 0, 90, 179]) {
      const [x, y, z] = latLonToVec3(0, lon, R)
      expect(y).toBeCloseTo(0)
      expect(Math.hypot(x, z)).toBeCloseTo(R)
    }
  })

  it('경도 180도 차이는 정확히 반대편이다', () => {
    const a = latLonToVec3(37.5, 127, R)
    const b = latLonToVec3(-37.5, -53, R)
    expect(a[0]).toBeCloseTo(-b[0])
    expect(a[1]).toBeCloseTo(-b[1])
    expect(a[2]).toBeCloseTo(-b[2])
  })

  it('반지름을 곱한 만큼 커진다', () => {
    const [x, y, z] = latLonToVec3(30, 45, 2)
    expect(Math.hypot(x, y, z)).toBeCloseTo(2)
  })

  it('경도가 커지면 -Z 쪽으로 돈다', () => {
    // 감기 방향을 실제 좌표로 못 박는다. 이게 없으면 Z의 부호만 뒤집어도
    // 위 테스트가 전부 통과한다 — 부호 반전은 극·반지름·대척점·각거리를
    // 모두 보존하기 때문이다. 옮겨 간 코드베이스에서 지구가 거울상이 되어도
    // 아무도 모르게 된다.
    const [x0, , z0] = latLonToVec3(0, 0, R)
    expect(x0).toBeCloseTo(R)
    expect(z0).toBeCloseTo(0)

    const [x90, , z90] = latLonToVec3(0, 90, R)
    expect(x90).toBeCloseTo(0)
    expect(z90).toBeCloseTo(-R)

    const [, , zWest] = latLonToVec3(0, -90, R)
    expect(zWest).toBeCloseTo(R)
  })
})

describe('angularDistance', () => {
  it('같은 점은 0이다', () => {
    expect(angularDistance(37.5, 127, 37.5, 127)).toBeCloseTo(0)
  })

  it('대척점은 파이다', () => {
    expect(angularDistance(0, 0, 0, 180)).toBeCloseTo(Math.PI)
  })

  it('적도에서 경도 90도는 파이의 절반이다', () => {
    expect(angularDistance(0, 0, 0, 90)).toBeCloseTo(Math.PI / 2)
  })
})
