// ne_110m_land.geojson을 720x360 격자로 래스터화해 셀당 1비트로 압축한다.
// 1도 격자(360x180)는 해안이 111km 단위로 뭉개져 리스본·뭄바이 같은 해안
// 도시가 바다로 읽힌다. 핀이 자기 나라 옆 바다에 뜨면 그 자리에서 가짜로
// 보이므로 0.5도로 간다. base64가 11KB에서 43KB로 늘 뿐이다.
// 출력은 커밋되므로 이 스크립트는 개발 중에만 돈다.
import { readFileSync, writeFileSync } from 'node:fs'

const WIDTH = 720
const HEIGHT = 360

const source = process.argv[2]
if (!source) {
  console.error('사용법: node scripts/build-land-mask.mjs <ne_110m_land.geojson>')
  process.exit(1)
}

const geo = JSON.parse(readFileSync(source, 'utf8'))

/** 링 안에 점이 있는지 — ray casting */
function inRing(ring, lon, lat) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** 첫 링은 바깥, 나머지는 구멍 */
function inPolygon(rings, lon, lat) {
  if (!inRing(rings[0], lon, lat)) return false
  for (let i = 1; i < rings.length; i += 1) {
    if (inRing(rings[i], lon, lat)) return false
  }
  return true
}

const polygons = []
for (const feature of geo.features) {
  const { type, coordinates } = feature.geometry
  if (type === 'Polygon') polygons.push(coordinates)
  else if (type === 'MultiPolygon') polygons.push(...coordinates)
}

const bytes = new Uint8Array(Math.ceil((WIDTH * HEIGHT) / 8))
let landCells = 0

for (let y = 0; y < HEIGHT; y += 1) {
  // 셀 중심을 쓴다. 모서리를 쓰면 극과 날짜변경선에서 한 줄이 통째로 어긋난다.
  const lat = 90 - (y + 0.5) * (180 / HEIGHT)
  for (let x = 0; x < WIDTH; x += 1) {
    const lon = -180 + (x + 0.5) * (360 / WIDTH)
    if (!polygons.some((rings) => inPolygon(rings, lon, lat))) continue
    const index = y * WIDTH + x
    bytes[index >> 3] |= 1 << (index & 7)
    landCells += 1
  }
}

// 해안을 한 셀 넓힌다. 0.5도 격자로도 뭄바이·홍콩·코펜하겐이 바다 셀에
// 떨어져 육지가 실제보다 야위어 보이고, 해안 도시 핀 옆에 점이 비게 된다.
// 참고한 지구본들(GitHub, Kaspersky)의 육지도 전부 도톰하다.
// 경도는 감싸고(날짜변경선), 위도는 자른다(극).
const dilated = new Uint8Array(bytes.length)
let dilatedCells = 0
const isLand = (x, y) => {
  const index = y * WIDTH + x
  return (bytes[index >> 3] >> (index & 7)) & 1
}
for (let y = 0; y < HEIGHT; y += 1) {
  for (let x = 0; x < WIDTH; x += 1) {
    let near = 0
    for (let dy = -1; dy <= 1 && !near; dy += 1) {
      const ny = y + dy
      if (ny < 0 || ny >= HEIGHT) continue
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = (x + dx + WIDTH) % WIDTH
        if (isLand(nx, ny)) {
          near = 1
          break
        }
      }
    }
    if (!near) continue
    const index = y * WIDTH + x
    dilated[index >> 3] |= 1 << (index & 7)
    dilatedCells += 1
  }
}

const base64 = Buffer.from(dilated).toString('base64')
const percent = ((dilatedCells / (WIDTH * HEIGHT)) * 100).toFixed(1)
const rawPercent = ((landCells / (WIDTH * HEIGHT)) * 100).toFixed(1)

const lines = [
  '// 자동 생성됨 — 손으로 고치지 말 것.',
  '// 출처: Natural Earth ne_110m_land (퍼블릭 도메인, 출처 표시 불요)',
  '// 재생성: node scripts/build-land-mask.mjs data/ne_110m_land.geojson',
  '// 격자 ' + WIDTH + 'x' + HEIGHT + ', 셀당 1비트, 해안 한 셀 팽창, 육지 ' + percent + '%',
  '',
  'export const LAND_MASK_WIDTH = ' + WIDTH,
  'export const LAND_MASK_HEIGHT = ' + HEIGHT,
  'export const LAND_MASK_BITS =',
  "  '" + base64 + "'",
  '',
]

writeFileSync('src/world/land-mask.data.ts', lines.join('\n'), 'utf8')
console.log(
  WIDTH + 'x' + HEIGHT + ', 육지 ' + rawPercent + '% -> 팽창 후 ' + percent +
    '%, base64 ' + base64.length + '자',
)
