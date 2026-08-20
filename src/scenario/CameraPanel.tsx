import { useEffect, useRef } from 'react'
import type { CameraId, L1Event, Scenario } from '@/core/schema'
import { CanvasFrameSource } from '@/media/canvas-frame-source'
import type { FrameSource } from '@/media/frame-source'
import { createPainter } from '@/media/painters'
import { createHeatSampler } from './heat'
import RvcMinimap from './RvcMinimap'

/** 실영상이 없을 때의 기본 공급자 — 캔버스에 프로시저로 그린다. */
const paintProcedurally = (cameraId: CameraId, scenario: Scenario): FrameSource =>
  new CanvasFrameSource(
    createPainter(cameraId, {
      severity: scenario.severity,
      heatAt: createHeatSampler(scenario),
    }),
  )

export type CreateFrameSource = (cameraId: CameraId, scenario: Scenario) => FrameSource

type Props = {
  scenario: Scenario
  cameraId: CameraId
  t: number
  events: readonly L1Event[]
  /** 실영상이 확보되면 VideoFrameSource 팩토리를 넘긴다. 뷰는 바뀌지 않는다. */
  createFrameSource?: CreateFrameSource
}

export default function CameraPanel({
  scenario,
  cameraId,
  t,
  events,
  createFrameSource = paintProcedurally,
}: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const sourceRef = useRef<FrameSource | null>(null)

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    const source = createFrameSource(cameraId, scenario)
    source.mount(host)
    // 마운트 직후 현재 시각으로 한 번 그린다. 아래 seek 이펙트는 [t]에만
    // 반응하므로, 일시정지 상태에서 시나리오나 카메라가 바뀌면 t가 그대로여서
    // 다시 그려지지 않고 패널이 검은 채로 남는다. t를 의존성에 넣지 않는 것은
    // 의도적이다 — 넣으면 매 프레임 캔버스를 다시 만든다.
    source.seek(t)
    sourceRef.current = source

    return () => {
      source.dispose()
      sourceRef.current = null
    }
  }, [scenario, cameraId, createFrameSource])

  useEffect(() => {
    sourceRef.current?.seek(t)
  }, [t])

  const label = scenario.cameras[cameraId].label

  return (
    <div
      data-testid={`camera-panel-${cameraId}`}
      style={{
        position: 'relative',
        background: '#000',
        border: '1px solid var(--line)',
        borderRadius: 4,
        overflow: 'hidden',
        minHeight: 0,
      }}
    >
      <div ref={hostRef} style={{ position: 'absolute', inset: 0 }} />
      {cameraId === 'rvc' && (
        <div style={{ position: 'absolute', top: 26, right: 8, pointerEvents: 'none' }}>
          <RvcMinimap path={scenario.cameras.rvc.path} t={t} />
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          fontSize: 12,
          color: 'var(--muted)',
          pointerEvents: 'none',
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'absolute',
          right: 8,
          bottom: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          alignItems: 'flex-end',
          pointerEvents: 'none',
        }}
      >
        {events.map((event) => (
          <div
            key={event.id}
            data-testid={`l1-marker-${event.id}`}
            data-node-id={event.id}
            style={{
              fontFamily: 'ui-monospace, monospace',
              fontSize: 11,
              padding: '2px 6px',
              borderRadius: 3,
              background: 'rgba(255, 90, 78, 0.18)',
              border: '1px solid rgba(255, 90, 78, 0.5)',
              color: '#ffb3ad',
            }}
          >
            {event.trigger}
          </div>
        ))}
      </div>
    </div>
  )
}
