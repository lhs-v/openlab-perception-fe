import { act, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Clock } from '@/core/clock'
import { usePlayback } from '@/scenario/usePlayback'
import { scenarioSchema } from '@/core/schema'
import kitchenFire from '../../scenarios/kitchen-fire.json'

const scenario = scenarioSchema.parse(kitchenFire)

function Probe() {
  const { t, phase, slice } = usePlayback(scenario, { autoPlay: false })
  return (
    <div>
      <span data-testid="t">{t}</span>
      <span data-testid="phase">{phase}</span>
      <span data-testid="l1">{slice.l1.length}</span>
      <span data-testid="l4">{slice.l4 ? 'yes' : 'no'}</span>
    </div>
  )
}

describe('usePlayback', () => {
  it('t=0에서 observe이고 아무것도 도달하지 않았다', () => {
    render(<Probe />)
    expect(screen.getByTestId('t')).toHaveTextContent('0')
    expect(screen.getByTestId('phase')).toHaveTextContent('observe')
    expect(screen.getByTestId('l1')).toHaveTextContent('0')
    expect(screen.getByTestId('l4')).toHaveTextContent('no')
  })

  it('언마운트 시 rAF 루프를 취소한다', () => {
    const cancel = vi.fn()
    vi.stubGlobal('requestAnimationFrame', () => 42)
    vi.stubGlobal('cancelAnimationFrame', cancel)

    const { unmount } = render(<Probe />)
    unmount()

    expect(cancel).toHaveBeenCalledWith(42)
    vi.unstubAllGlobals()
  })

  it('autoPlay가 바뀌어도 표시 시간이 0으로 되돌아가지 않는다', () => {
    // rAF를 무동작으로 막아 이 테스트 안에서 시간이 저절로 흐르지 않게 한다
    vi.stubGlobal('requestAnimationFrame', () => 1)
    vi.stubGlobal('cancelAnimationFrame', () => {})

    const holder: { clock: Clock | null } = { clock: null }
    function Toggle({ autoPlay }: { autoPlay: boolean }) {
      const { t, clock } = usePlayback(scenario, { autoPlay })
      holder.clock = clock
      return <span data-testid="t">{t}</span>
    }

    const { rerender } = render(<Toggle autoPlay={false} />)
    act(() => holder.clock!.seek(9000))
    expect(screen.getByTestId('t')).toHaveTextContent('9000')

    // 이펙트가 다시 돌지만 클럭의 위치는 그대로여야 한다
    rerender(<Toggle autoPlay />)
    expect(screen.getByTestId('t')).toHaveTextContent('9000')

    vi.unstubAllGlobals()
  })

  it('언마운트하면 클럭이 정리되어 구독이 전부 끊긴다', () => {
    const holder: { clock: Clock | null } = { clock: null }
    function Capture() {
      const { clock } = usePlayback(scenario, { autoPlay: false })
      holder.clock = clock
      return null
    }

    const { unmount } = render(<Capture />)
    const clock = holder.clock!

    // 훅이 건 구독뿐 아니라 밖에서 건 구독까지 dispose가 비우는지 본다.
    const spy = vi.fn()
    clock.subscribe(spy)
    unmount()
    clock.seek(500)

    expect(spy).not.toHaveBeenCalled()
  })
})
