import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadBundledScenarios } from '@/core/scenario-registry'
import type { Scenario } from '@/core/schema'
import ScenarioStage from '@/scenario/ScenarioStage'
import World from '@/world/World'
import type { Handoff } from '@/world/handoff'
import type { HomeMarker } from '@/world/pins'

/** 판정이 뜬 뒤 화면에 머무는 시간. 관객이 결론을 읽을 틈이다. */
const VERDICT_HOLD_MS = 5_000

/**
 * 시나리오를 지구본이 아는 형태로 줄인다.
 *
 * `World`에 시나리오를 통째로 넘기지 않는 것이 핵심이다. 지구본은 위치와
 * 심각도만 알면 되고, 그래야 다른 코드베이스로 옮길 때 시나리오 스키마가
 * 딸려 가지 않는다.
 */
function toHomes(scenarios: readonly Scenario[]): HomeMarker[] {
  return scenarios.map((s) => ({
    id: s.id,
    title: s.title,
    city: s.locale.city,
    country: s.locale.country,
    lat: s.locale.lat,
    lon: s.locale.lon,
    localTimeLabel: s.locale.localTimeLabel,
    severity: s.severity,
  }))
}

type Active = { scenario: Scenario; handoff: Handoff }

export default function App() {
  const { ok, failed } = useMemo(() => loadBundledScenarios(), [])
  const [active, setActive] = useState<Active | null>(null)

  if (failed.length > 0) {
    // 검은 화면 금지 — 배제된 시나리오는 콘솔로만 알리고 계속 진행한다.
    console.warn('배제된 시나리오', failed)
  }

  const homes = useMemo(() => toHomes(ok), [ok])

  const enter = useCallback(
    (id: string, handoff: Handoff) => {
      const scenario = ok.find((s) => s.id === id)
      if (!scenario) return
      setActive({ scenario, handoff })
    },
    [ok],
  )

  // 재생이 끝나고 판정을 잠시 머금은 뒤 지구본으로 돌아간다
  useEffect(() => {
    if (!active) return
    const timer = setTimeout(
      () => setActive(null),
      active.scenario.durationMs + VERDICT_HOLD_MS,
    )
    return () => clearTimeout(timer)
  }, [active])

  if (homes.length === 0) {
    return <div style={{ padding: 24 }}>불러올 수 있는 시나리오가 없습니다.</div>
  }

  return (
    <div style={{ position: 'relative', height: '100%' }}>
      <World homes={homes} onEnterScenario={enter} activeScenarioId={active?.scenario.id ?? null} />

      {active && (
        <div
          data-testid="scenario-layer"
          style={{
            position: 'absolute',
            inset: 0,
            // 인계 계약: 지구본이 잠긴 그 색에서 시작해 밝아진다.
            // 색이 어긋나면 이 자리에서 번쩍이고, 그 번쩍임이 이음매다.
            background: active.handoff.color,
            animation: `handoff-fade ${active.handoff.fadeInMs}ms ease forwards`,
          }}
        >
          <ScenarioStage scenario={active.scenario} />
        </div>
      )}
    </div>
  )
}
