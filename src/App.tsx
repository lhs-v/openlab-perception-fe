import { useMemo } from 'react'
import { loadBundledScenarios } from '@/core/scenario-registry'
import ScenarioStage from '@/scenario/ScenarioStage'
import GlobeCanvas from '@/world/GlobeCanvas'

export default function App() {
  const { ok, failed } = useMemo(() => loadBundledScenarios(), [])

  if (failed.length > 0) {
    // 검은 화면 금지 — 배제된 시나리오는 콘솔로만 알리고 계속 진행한다.
    console.warn('배제된 시나리오', failed)
  }

  const scenario = ok[0]

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      {/* 지구본은 시나리오에 들어가도 사라지지 않는다. 뒤에서 계속 돌면서
          "지금 세계 곳곳에서 벌어지는 중"이라는 감각을 유지한다. */}
      <div
        data-testid="globe-layer"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: scenario ? 0.28 : 1,
          filter: scenario ? 'blur(1.5px)' : 'none',
          transition: 'opacity 900ms ease, filter 900ms ease',
        }}
      >
        <GlobeCanvas />
      </div>

      <div style={{ position: 'relative', height: '100%' }}>
        {scenario ? (
          <ScenarioStage scenario={scenario} />
        ) : (
          <div style={{ padding: 24 }}>불러올 수 있는 시나리오가 없습니다.</div>
        )}
      </div>
    </div>
  )
}
