import { expect, test } from '@playwright/test'

/** 무입력 8초 뒤 자동 하강. 그 뒤 시나리오 층이 열린다. */
const ENTRY_TIMEOUT = 20_000

test('아무도 만지지 않으면 지구본이 알아서 한 집으로 내려간다', async ({ page }) => {
  await page.goto('/')

  // 처음에는 지구본만 있고 시나리오는 열려 있지 않다
  await expect(page.getByTestId('world')).toBeVisible()
  await expect(page.getByTestId('scenario-layer')).toHaveCount(0)
  await expect(page.getByTestId('world')).toHaveAttribute('data-diving', 'false')

  // 유휴가 쌓이면 하강이 시작된다
  await expect(page.getByTestId('world')).toHaveAttribute('data-diving', 'true', {
    timeout: ENTRY_TIMEOUT,
  })

  // 하강이 끝나면 시나리오가 열린다
  await expect(page.getByTestId('scenario-layer')).toBeVisible({ timeout: ENTRY_TIMEOUT })
  await expect(page.getByTestId('stage')).toBeVisible()
})

test('인계 색이 양쪽에서 같아 이음매가 번쩍이지 않는다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('scenario-layer')).toBeVisible({ timeout: ENTRY_TIMEOUT })

  // 지구본이 잠기는 색과 다음 화면이 시작하는 색이 다르면 그 순간 번쩍인다.
  // 계약은 src/world/handoff.ts의 HANDOFF_COLOR 하나뿐이다.
  const colors = await page.evaluate(() => {
    const read = (selector: string) => {
      const el = document.querySelector(selector)
      return el ? getComputedStyle(el).backgroundColor : null
    }
    return {
      veil: read('[data-testid="handoff-veil"]'),
      arrival: read('[data-testid="scenario-layer"]'),
      world: read('[data-testid="world"]'),
    }
  })

  expect(colors.veil).not.toBeNull()
  expect(colors.arrival).toBe(colors.veil)
  expect(colors.world).toBe(colors.veil)
})

test('사용자가 직접 고르면 그 집으로 내려간다', async ({ page }) => {
  await page.goto('/')

  const pick = page.getByTestId('home-kitchen-fire')
  await expect(pick).toBeVisible()
  await pick.click()

  await expect(page.getByTestId('world')).toHaveAttribute('data-diving', 'true')
  await expect(page.getByTestId('scenario-layer')).toBeVisible({ timeout: ENTRY_TIMEOUT })
})

test('만지면 자동 진입이 멈추고 남은 시간을 알려준다', async ({ page }) => {
  await page.goto('/')

  // 인터랙션은 자동 순환을 45초 유예한다
  await page.getByTestId('world').click({ position: { x: 40, y: 400 } })

  // 유휴 8초가 지나도 들어가지 않는다
  await page.waitForTimeout(11_000)
  await expect(page.getByTestId('scenario-layer')).toHaveCount(0)
  await expect(page.getByTestId('world')).toHaveAttribute('data-diving', 'false')

  // 재개가 가까워지면 예고가 뜬다 — 예고 없이 화면을 뺏지 않는다
  await expect(page.getByTestId('resume-countdown')).toBeVisible({ timeout: 40_000 })
})

test('재생 중에 세계로 나가 다른 집을 고를 수 있다', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('home-kitchen-fire').click()
  await expect(page.getByTestId('stage')).toBeVisible({ timeout: ENTRY_TIMEOUT })

  // 재생이 끝나기 한참 전이다 — 45초짜리 시나리오를 몇 초만 보고 나간다
  await expect(page.getByTestId('exit-scenario')).toBeVisible()
  await page.getByTestId('exit-scenario').click()

  // 시나리오가 닫히고 지구본이 다시 주인공이 된다
  await expect(page.getByTestId('scenario-layer')).toHaveCount(0)
  await expect(page.getByTestId('home-list')).toBeVisible()

  // 스스로 나온 사람을 8초 만에 다른 집으로 끌고 들어가지 않는다
  await page.waitForTimeout(11_000)
  await expect(page.getByTestId('scenario-layer')).toHaveCount(0)

  // 그리고 다른 집을 고를 수 있다
  await page.getByTestId('home-gas-leak').click()
  await expect(page.getByTestId('stage')).toBeVisible({ timeout: ENTRY_TIMEOUT })
  await expect(page.getByTestId('stage')).toContainText('가스 누출')
})

test('지구본에서는 나가기 버튼이 없다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home-list')).toBeVisible()
  await expect(page.getByTestId('exit-scenario')).toHaveCount(0)
})

test('열두 집이 모두 아이콘과 함께 목록에 있다', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByTestId('home-count')).toHaveText('12')

  // 목록의 글자와 지구본 배지가 같아야 목록에서 본 것을 지구에서 찾을 수 있다
  const icons = page.locator('[data-testid^="home-icon-"]')
  await expect(icons).toHaveCount(12)

  const texts = await icons.allTextContents()
  // 아이콘이 없어 점으로 대체된 집이 하나도 없어야 한다
  expect(texts.filter((t) => t.trim() === '•')).toHaveLength(0)
  expect(new Set(texts).size).toBe(12)
})

test('지구본 안쪽에 실제로 육지가 그려진다', async ({ page }) => {
  await page.goto('/')
  // 자동 진입을 막고 첫 프레임이 안정될 때까지 둔다
  await page.getByTestId('world').click({ position: { x: 60, y: 900 } })
  await page.waitForTimeout(2000)

  const seen = await page.evaluate(() => {
    const gl = document.querySelector('[data-testid="globe"] canvas') as HTMLCanvasElement
    const c = document.createElement('canvas')
    c.width = gl.width
    c.height = gl.height
    const ctx = c.getContext('2d')!
    ctx.drawImage(gl, 0, 0)
    const { data } = ctx.getImageData(0, 0, c.width, c.height)

    // 안쪽만 본다. 테두리를 포함하면 헤일로만 남은 상태로도 통과해버린다 —
    // 실제로 그 상태가 한동안 "지구본이 렌더된다" 검사를 통과하고 있었다.
    const cx = Math.round(c.width / 2)
    const cy = Math.round(c.height / 2)
    const r = Math.round(Math.min(c.width, c.height) * 0.28)

    let samples = 0
    let body = 0
    let land = 0

    for (let y = cy - r; y <= cy + r; y += 2) {
      for (let x = cx - r; x <= cx + r; x += 2) {
        if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue
        samples += 1
        const i = (y * c.width + x) * 4
        const red = data[i]!
        const green = data[i + 1]!
        const blue = data[i + 2]!
        const alpha = data[i + 3]!
        if (alpha > 20) body += 1
        // 육지 점은 몸통보다 훨씬 밝은 파랑이다
        if (blue > 120 && blue - red > 40) land += 1
      }
    }

    return { samples, bodyRatio: body / samples, landRatio: land / samples }
  })

  // 몸통이 칠해져 있어야 구체로 읽힌다. 안 칠하면 테두리만 빛나는 구멍이 된다
  expect(seen.bodyRatio).toBeGreaterThan(0.9)
  // 그리고 그 위에 육지가 있어야 지구로 읽힌다
  expect(seen.landRatio).toBeGreaterThan(0.02)
})
