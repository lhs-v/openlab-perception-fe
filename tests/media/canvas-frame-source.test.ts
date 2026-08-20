import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { CanvasFrameSource } from '@/media/canvas-frame-source'
import type { PaintContext } from '@/media/frame-source'

describe('CanvasFrameSource', () => {
  it('mount 시 캔버스를 컨테이너에 붙인다', () => {
    const host = document.createElement('div')
    const source = new CanvasFrameSource(vi.fn())
    source.mount(host)
    expect(host.querySelector('canvas')).not.toBeNull()
    source.dispose()
  })

  it('seek 시 주어진 t로 페인터를 부른다', () => {
    const host = document.createElement('div')
    const painter = vi.fn()
    const source = new CanvasFrameSource(painter)
    source.mount(host)
    source.seek(1234)
    expect(painter).toHaveBeenCalled()
    const arg = painter.mock.calls.at(-1)![0] as PaintContext
    expect(arg.t).toBe(1234)
    source.dispose()
  })

  it('mount 전 seek는 페인터를 부르지 않는다', () => {
    const painter = vi.fn()
    const source = new CanvasFrameSource(painter)
    source.seek(100)
    expect(painter).not.toHaveBeenCalled()
  })

  it('dispose 시 캔버스를 제거하고 이후 seek를 무시한다', () => {
    const host = document.createElement('div')
    const painter = vi.fn()
    const source = new CanvasFrameSource(painter)
    source.mount(host)
    source.dispose()
    expect(host.querySelector('canvas')).toBeNull()
    source.seek(500)
    expect(painter).not.toHaveBeenCalled()
  })

  it('페인터가 던져도 seek가 전파하지 않는다', () => {
    const host = document.createElement('div')
    const source = new CanvasFrameSource(() => {
      throw new Error('boom')
    })
    source.mount(host)
    expect(() => source.seek(1)).not.toThrow()
    source.dispose()
  })
})

// jsdom에는 ResizeObserver가 없다. 그런데 Task 16의 무대는 단계가 바뀔 때마다
// grid-template-columns를 애니메이션하므로 이 경로가 연출의 결정적 순간마다
// 발화한다. 마지막 t가 아니라 0으로 다시 그리면 네 패널이 전환 때마다
// 처음 화면으로 깜빡인다. 그래서 주입해서 검증한다.
class StubResizeObserver {
  static latest: StubResizeObserver | null = null
  disconnected = false
  #cb: ResizeObserverCallback

  constructor(cb: ResizeObserverCallback) {
    this.#cb = cb
    StubResizeObserver.latest = this
  }

  observe(): void {}
  unobserve(): void {}
  disconnect(): void {
    this.disconnected = true
  }

  fire(): void {
    this.#cb([], this as unknown as ResizeObserver)
  }
}

describe('CanvasFrameSource · 리사이즈', () => {
  beforeEach(() => {
    StubResizeObserver.latest = null
    vi.stubGlobal('ResizeObserver', StubResizeObserver)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('리사이즈되면 t=0이 아니라 마지막 t로 다시 그린다', () => {
    const host = document.createElement('div')
    const painter = vi.fn()
    const source = new CanvasFrameSource(painter)
    source.mount(host)
    source.seek(7777)
    painter.mockClear()

    StubResizeObserver.latest!.fire()

    expect(painter).toHaveBeenCalled()
    const arg = painter.mock.calls.at(-1)![0] as PaintContext
    expect(arg.t).toBe(7777)
    source.dispose()
  })

  it('dispose하면 관찰을 끊는다', () => {
    const host = document.createElement('div')
    const source = new CanvasFrameSource(vi.fn())
    source.mount(host)
    const observer = StubResizeObserver.latest!
    source.dispose()
    expect(observer.disconnected).toBe(true)
  })
})
