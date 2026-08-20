/**
 * 위경도와 3D 좌표 사이의 유일한 변환 지점.
 *
 * 규약 — 여기서 벗어나면 핀이 엉뚱한 곳에 박힌다:
 *   · 위도·경도는 **도(degree)** 단위다. 라디안이 아니다.
 *   · +Y가 북극이다. three.js의 기본 up 벡터와 같다.
 *   · 경도가 커지는 방향이 +Z 쪽으로 돈다.
 *   · 반환은 세 원소 배열이다. three.js Vector3를 쓰지 않는 이유는
 *     이 모듈이 three.js를 모르게 두어 순수 테스트가 가능하도록 하기 위함이다.
 *
 * 이 규약은 tests/world/geo.test.ts가 못 박고 있다. 옮겨 간 코드베이스에서
 * 핀 위치가 틀어지면 그 테스트부터 돌려볼 것.
 */
export type Vec3 = readonly [number, number, number]

const DEG = Math.PI / 180

export function latLonToVec3(lat: number, lon: number, radius: number): Vec3 {
  const phi = (90 - lat) * DEG
  const theta = (lon + 180) * DEG
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ]
}

/** 두 지점 사이의 중심각(라디안). 호의 고도를 정하는 데 쓴다. */
export function angularDistance(
  latA: number,
  lonA: number,
  latB: number,
  lonB: number,
): number {
  const a = latLonToVec3(latA, lonA, 1)
  const b = latLonToVec3(latB, lonB, 1)
  const dot = a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  return Math.acos(Math.min(1, Math.max(-1, dot)))
}
