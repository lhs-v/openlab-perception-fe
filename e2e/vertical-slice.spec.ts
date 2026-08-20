import { expect, test } from '@playwright/test'

test('kitchen-fire가 observe에서 verdict까지 도달한다', async ({ page }) => {
  await page.goto('/')

  const stage = page.getByTestId('stage')
  await expect(stage).toHaveAttribute('data-phase', 'observe')

  // L3 최초 등장 21초
  await expect(stage).toHaveAttribute('data-phase', 'converge', { timeout: 30_000 })
  await expect(page.getByText('L3 · COMPOSITE CONTEXT')).toBeVisible()

  // L4 27초
  await expect(stage).toHaveAttribute('data-phase', 'verdict', { timeout: 30_000 })
  await expect(page.getByTestId('verdict')).toContainText('INTERVENE')

  // refs 연결선이 실제로 그려졌는지
  // 6 L1→L2 + 7 L2→L3 + 2 L3→L4. 앵커 이름이 어긋난 레이어가 있으면
  // 그 층의 선만 조용히 빠지므로 총합을 못 박는다.
  const edgeCount = await page.locator('[data-edge]').count()
  expect(edgeCount).toBe(15)
})

test('콘솔 오류 없이 재생된다', async ({ page }) => {
  const errors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })
  page.on('pageerror', (error) => errors.push(error.message))

  await page.goto('/')
  await expect(page.getByTestId('stage')).toHaveAttribute('data-phase', 'verdict', {
    timeout: 40_000,
  })
  expect(errors).toEqual([])
})

test('연결선이 단계 전환 뒤에도 앵커에 붙어 있다', async ({ page }) => {
  await page.goto('/')

  const stage = page.getByTestId('stage')
  await expect(stage).toHaveAttribute('data-phase', 'verdict', { timeout: 40_000 })
  // 700ms 레이아웃 전환이 끝나고도 남도록 기다린다
  await page.waitForTimeout(1500)

  // 그려진 경로의 양 끝을 실제 앵커의 중심과 대조한다. 단계 전환은 무대
  // 안쪽 컬럼 비율만 바꾸므로 바깥 ResizeObserver로는 잡히지 않는다 —
  // 다시 재지 않으면 여기서 100px 넘는 어긋남이 나온다.
  const maxDrift = await page.evaluate(() => {
    const base = document.querySelector('[data-testid="stage"]')!.getBoundingClientRect()
    const centre = (el: Element) => {
      const r = el.getBoundingClientRect()
      return { x: r.left + r.width / 2 - base.left, y: r.top + r.height / 2 - base.top }
    }
    let worst = 0
    for (const path of document.querySelectorAll('[data-edge]')) {
      const [from, to] = path.getAttribute('data-edge')!.split('->')
      const m = path
        .getAttribute('d')!
        .match(/^M([-\d.]+),([-\d.]+) C[-\d.]+,[-\d.]+ [-\d.]+,[-\d.]+ ([-\d.]+),([-\d.]+)$/)
      const fromEl = document.querySelector(`[data-node-id="${from}"]`)
      const toEl = document.querySelector(`[data-node-id="${to}"]`)
      if (!m || !fromEl || !toEl) continue
      const a = centre(fromEl)
      const b = centre(toEl)
      worst = Math.max(
        worst,
        Math.hypot(Number(m[1]) - a.x, Number(m[2]) - a.y),
        Math.hypot(Number(m[3]) - b.x, Number(m[4]) - b.y),
      )
    }
    return worst
  })

  expect(maxDrift).toBeLessThan(4)
})

test('지구본이 실제로 렌더된다', async ({ page }) => {
  await page.goto('/')

  const canvas = page.locator('[data-testid="globe"] canvas')
  await expect(canvas).toBeVisible()

  // three.js가 setSize로 캔버스의 실제 픽셀 크기를 잡는다. 0이면 씬이
  // 만들어지지 않았거나 컨테이너 크기를 못 읽은 것이다.
  await expect
    .poll(async () => canvas.evaluate((el: HTMLCanvasElement) => el.width), { timeout: 10_000 })
    .toBeGreaterThan(0)

  const size = await canvas.evaluate((el: HTMLCanvasElement) => ({
    w: el.width,
    h: el.height,
  }))
  expect(size.h).toBeGreaterThan(0)

  // WebGL 컨텍스트가 살아 있는지 — 잃어버리면 지구본만 조용히 사라진다
  const contextLost = await canvas.evaluate((el: HTMLCanvasElement) => {
    const gl = el.getContext('webgl2') ?? el.getContext('webgl')
    return gl ? (gl as WebGLRenderingContext).isContextLost() : 'no-context'
  })
  expect(contextLost).toBe(false)
})
