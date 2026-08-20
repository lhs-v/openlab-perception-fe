import type { FrameSource, Painter } from './frame-source'

export class CanvasFrameSource implements FrameSource {
  #painter: Painter
  #canvas: HTMLCanvasElement | null = null
  #ctx: CanvasRenderingContext2D | null = null
  #host: HTMLElement | null = null
  #resizeObserver: ResizeObserver | null = null
  #lastT = 0
  #disposed = false

  constructor(painter: Painter) {
    this.#painter = painter
  }

  mount(host: HTMLElement): void {
    if (this.#disposed) return

    const canvas = document.createElement('canvas')
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.display = 'block'
    host.appendChild(canvas)

    this.#host = host
    this.#canvas = canvas
    this.#ctx = canvas.getContext('2d')
    this.#resize()

    if (typeof ResizeObserver !== 'undefined') {
      this.#resizeObserver = new ResizeObserver(() => {
        this.#resize()
        this.seek(this.#lastT)
      })
      this.#resizeObserver.observe(host)
    }
  }

  seek(t: number): void {
    this.#lastT = t
    const ctx = this.#ctx
    const canvas = this.#canvas
    if (this.#disposed || !ctx || !canvas) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.width / dpr
    const height = canvas.height / dpr

    try {
      ctx.save()
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, width, height)
      this.#painter({ ctx, width, height, t })
    } catch (error) {
      // 전시 중 한 패널의 실패가 화면 전체를 죽이지 않게 한다.
      console.error('painter failed', error)
    } finally {
      ctx.restore()
    }
  }

  /** 캔버스 소스는 클럭이 매 프레임 seek를 부르므로 자체 재생 상태가 없다. */
  play(): void {}
  pause(): void {}

  dispose(): void {
    this.#disposed = true
    this.#resizeObserver?.disconnect()
    this.#resizeObserver = null
    this.#canvas?.remove()
    this.#canvas = null
    this.#ctx = null
    this.#host = null
  }

  #resize(): void {
    const canvas = this.#canvas
    const host = this.#host
    if (!canvas || !host) return
    const dpr = window.devicePixelRatio || 1
    const rect = host.getBoundingClientRect()
    // jsdom은 0을 주므로 최소 크기를 보장한다.
    canvas.width = Math.max(1, Math.round((rect.width || 320) * dpr))
    canvas.height = Math.max(1, Math.round((rect.height || 180) * dpr))
  }
}
