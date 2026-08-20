import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock } from '@/core/clock'
import { FixtureReasoningSource } from '@/core/fixture-reasoning-source'
import type { ReasoningSlice, ReasoningSource } from '@/core/reasoning-source'
import { type Phase, phaseAt } from '@/core/phases'
import type { Scenario } from '@/core/schema'

const replayFromScenario = (scenario: Scenario): ReasoningSource =>
  new FixtureReasoningSource(scenario)

export type PlaybackOptions = {
  autoPlay?: boolean
  /**
   * 추론 소스 팩토리. 기본은 시나리오 JSON을 재생한다. 다른 망의 추론 API가
   * 연결되면 HttpReasoningSource 팩토리를 여기로 넘긴다 — 훅도 뷰도 그대로다.
   */
  createSource?: (scenario: Scenario) => ReasoningSource
}

export type Playback = {
  t: number
  phase: Phase
  slice: ReasoningSlice
  clock: Clock
  source: ReasoningSource
}

export function usePlayback(scenario: Scenario, options: PlaybackOptions = {}): Playback {
  const { autoPlay = true, createSource = replayFromScenario } = options

  const clock = useMemo(
    () => new Clock({ durationMs: scenario.durationMs }),
    [scenario],
  )
  const source = useMemo(() => createSource(scenario), [scenario, createSource])

  const [t, setT] = useState(0)
  const frameRef = useRef(0)

  useEffect(() => {
    // 0이 아니라 클럭이 실제로 가진 위치로 맞춘다. 이펙트는 autoPlay가
    // 바뀔 때도 다시 도는데, dispose는 클럭의 시간을 되돌리지 않으므로
    // 0으로 찍으면 화면만 처음으로 튀고 클럭은 그대로인 어긋남이 생긴다.
    setT(clock.t)
    const unsubscribe = clock.subscribe(setT)
    if (autoPlay) clock.play()

    const loop = () => {
      clock.tick()
      frameRef.current = requestAnimationFrame(loop)
    }
    frameRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(frameRef.current)
      unsubscribe()
      clock.dispose()
      source.dispose()
    }
  }, [clock, source, autoPlay])

  const slice = source.slice(t)
  const phase = phaseAt(scenario, t)

  return { t, phase, slice, clock, source }
}
