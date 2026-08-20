export type PaintContext = {
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  /** 시나리오 시작 기준 경과 시간(ms) */
  t: number
}

export type Painter = (paint: PaintContext) => void

/**
 * 한 카메라 패널의 프레임 공급자.
 *
 * 지금은 캔버스에 프로시저로 그리지만, 실영상이 확보되면
 * 같은 인터페이스의 VideoFrameSource로 교체한다. 뷰는 바뀌지 않는다.
 */
export interface FrameSource {
  mount(host: HTMLElement): void
  seek(t: number): void
  play(): void
  pause(): void
  dispose(): void
}
