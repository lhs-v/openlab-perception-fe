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
