import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import { REST_DISTANCE } from './dive'
import { landDots } from './dots'
import { landMask } from './land'
import { GlobeScene } from './globe/GlobeScene'
import type { PinSpec } from './pins'
import { QUALITY_TIERS, QualityMonitor } from './quality'

export type GlobeHandle = {
  /** 하강이 카메라를 잡는다. null이면 지금 각도에서 자유 자전으로 돌아간다 */
  setPose(pose: { spinY: number; distance: number } | null): void
  /** 하강을 시작할 때 이어받을 현재 자세 */
  pose(): { spinY: number; distance: number }
}

type Props = {
  pins: readonly PinSpec[]
}

/**
 * 지구본 씬의 React 수명주기.
 *
 * 씬은 이펙트 안에서 만든다. 밖으로 끌어올려 ref에 고정하면 StrictMode의
 * 설정→정리→설정에서 같은 인스턴스가 dispose된 뒤 다시 쓰이게 되고,
 * 개발 모드에서만 지구본이 사라진다.
 */
const GlobeCanvas = forwardRef<GlobeHandle, Props>(function GlobeCanvas({ pins }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<GlobeScene | null>(null)

  useImperativeHandle(
    ref,
    () => ({
      setPose: (pose) => sceneRef.current?.setPose(pose),
      pose: () => ({
        spinY: sceneRef.current?.spin ?? 0,
        distance: sceneRef.current?.distance ?? REST_DISTANCE,
      }),
    }),
    [],
  )

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mask = landMask()
    const dotsFor = (samples: number) =>
      landDots(mask, { samples, radius: 1, threshold: 1 })

    const monitor = new QualityMonitor({
      onChange: (tier) => {
        const settings = QUALITY_TIERS[tier]!
        scene.setDots(dotsFor(settings.dotSamples))
        scene.setMaxPixelRatio(settings.maxPixelRatio)
      },
    })

    const top = QUALITY_TIERS[0]!
    const scene = new GlobeScene({
      canvas,
      dots: dotsFor(top.dotSamples),
      maxPixelRatio: top.maxPixelRatio,
    })
    sceneRef.current = scene

    const host = canvas.parentElement
    const fit = () => {
      const rect = host?.getBoundingClientRect()
      scene.resize(rect?.width || canvas.clientWidth || 1, rect?.height || canvas.clientHeight || 1)
    }
    fit()

    const observer =
      typeof ResizeObserver === 'undefined' || !host ? null : new ResizeObserver(fit)
    if (host) observer?.observe(host)

    let frame = requestAnimationFrame(function loop(now) {
      monitor.frame(now)
      scene.frame(now)
      frame = requestAnimationFrame(loop)
    })

    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      scene.dispose()
      sceneRef.current = null
    }
  }, [])

  // 핀은 씬과 별도 주기로 바뀐다 — 저작으로 하나 더 생기면 여기만 다시 돈다
  useEffect(() => {
    sceneRef.current?.setPins(pins)
  }, [pins])

  return (
    <div data-testid="globe" style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
})

export default GlobeCanvas
