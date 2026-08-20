import { useEffect, useRef } from 'react'
import { landDots } from './dots'
import { landMask } from './land'
import { GlobeScene } from './globe/GlobeScene'
import { QUALITY_TIERS, QualityMonitor } from './quality'

/**
 * 지구본 씬의 React 수명주기.
 *
 * 씬은 이펙트 안에서 만든다. 밖으로 끌어올려 ref에 고정하면 StrictMode의
 * 설정→정리→설정에서 같은 인스턴스가 dispose된 뒤 다시 쓰이게 되고,
 * 개발 모드에서만 지구본이 사라진다.
 */
export default function GlobeCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<GlobeScene | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const mask = landMask()
    const monitor = new QualityMonitor({
      onChange: (tier) => {
        const settings = QUALITY_TIERS[tier]!
        scene.setDots(landDots(mask, { samples: settings.dotSamples, radius: 1, threshold: 1 }))
        scene.setMaxPixelRatio(settings.maxPixelRatio)
      },
    })

    const top = QUALITY_TIERS[0]!
    const scene = new GlobeScene({
      canvas,
      dots: landDots(mask, { samples: top.dotSamples, radius: 1, threshold: 1 }),
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
    observer?.observe(host!)

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

  return (
    <div data-testid="globe" style={{ position: 'absolute', inset: 0 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  )
}
