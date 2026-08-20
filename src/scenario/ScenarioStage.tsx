import { useEffect, useMemo, useRef, useState } from 'react'
import { AudioEngine } from '@/media/audio-engine'
import type { Phase } from '@/core/phases'
import type { Scenario } from '@/core/schema'
import CameraGrid from './CameraGrid'
import Connectors from './Connectors'
import ReasoningPanel from './ReasoningPanel'
import SensorRail from './SensorRail'
import { usePlayback } from './usePlayback'
import { computeEdges, useEdgeLines } from './useConnectors'

/** 단계별로 관측 영역과 추론 영역의 폭 비율을 옮긴다. */
const COLUMNS: Record<Phase, string> = {
  observe: '2.1fr 1fr',
  converge: '1.3fr 1fr',
  verdict: '0.8fr 1fr',
}

export default function ScenarioStage({
  scenario,
  autoPlay = true,
}: {
  scenario: Scenario
  autoPlay?: boolean
}) {
  const { t, phase, slice } = usePlayback(scenario, { autoPlay })
  const stageRef = useRef<HTMLDivElement>(null)

  const audio = useMemo(() => new AudioEngine(scenario.audio.events), [scenario])
  const [muted, setMuted] = useState(true)

  useEffect(() => () => audio.dispose(), [audio])
  useEffect(() => {
    audio.update(t)
  }, [audio, t])

  const edges = useMemo(() => computeEdges(slice), [slice])
  // t를 revision으로 넘긴다 — 매 프레임 다시 재므로 700ms 전환 중에도
  // 선이 카드를 따라간다.
  const lines = useEdgeLines(stageRef, edges, t)

  const progress = Math.min(100, (t / scenario.durationMs) * 100)

  return (
    <div
      data-testid="stage"
      data-phase={phase}
      ref={stageRef}
      style={{
        position: 'relative',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: 16,
      }}
    >
      <header style={{ display: 'flex', alignItems: 'baseline', gap: 12 }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>{scenario.title}</h1>
        <span
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            padding: '2px 6px',
            borderRadius: 2,
            color: scenario.severity === 'critical' ? 'var(--critical)' : 'var(--ok)',
            border: `1px solid ${
              scenario.severity === 'critical'
                ? 'rgba(255,90,78,0.5)'
                : 'rgba(67,209,160,0.5)'
            }`,
          }}
        >
          {scenario.severity.toUpperCase()}
        </span>
        <span
          data-testid="locale"
          style={{ fontSize: 12, color: 'var(--muted)', marginLeft: 'auto' }}
        >
          {scenario.locale.city}, {scenario.locale.country} · {scenario.locale.localTimeLabel}
        </span>
        <button
          type="button"
          data-testid="mute-toggle"
          onClick={() => {
            if (muted) audio.unmute()
            else audio.mute()
            setMuted(!muted)
          }}
          style={{
            fontFamily: 'ui-monospace, monospace',
            fontSize: 11,
            padding: '3px 8px',
            borderRadius: 2,
            cursor: 'pointer',
            color: 'var(--muted)',
            background: 'transparent',
            border: '1px solid var(--line)',
          }}
        >
          {muted ? '음소거 · 클릭하면 소리' : '소리 켜짐'}
        </button>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: COLUMNS[phase],
          gap: 16,
          flex: 1,
          minHeight: 0,
          transition: 'grid-template-columns 700ms cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minHeight: 0 }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <CameraGrid scenario={scenario} t={t} events={slice.l1} />
          </div>
          <SensorRail scenario={scenario} t={t} events={slice.l1} />
        </div>

        <div style={{ overflowY: 'auto', minHeight: 0 }}>
          <ReasoningPanel slice={slice} phase={phase} />
        </div>
      </div>

      <div style={{ height: 2, background: 'var(--line)', borderRadius: 1 }}>
        <div
          data-testid="progress"
          style={{
            width: `${progress}%`,
            height: '100%',
            background: 'var(--accent)',
            borderRadius: 1,
          }}
        />
      </div>

      <Connectors lines={lines} />
    </div>
  )
}
