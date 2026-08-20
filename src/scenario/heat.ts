import { sampleTrack } from '@/core/sensor-track'
import type { Scenario } from '@/core/schema'

/**
 * 시점별 위험도 0..1. 온도와 연기 센서에서 파생해 페인터의 화염·연무 강도로 쓴다.
 * 해당 센서가 없는 시나리오에서는 항상 0이다.
 */
export function createHeatSampler(scenario: Scenario): (t: number) => number {
  const temp = scenario.sensors.find((s) => s.kind === 'temperature')
  const smoke = scenario.sensors.find((s) => s.kind === 'smoke')
  if (!temp && !smoke) return () => 0

  return (t: number) => {
    let heat = 0
    if (temp) {
      const threshold = temp.alarmAbove ?? 45
      heat = Math.max(heat, (sampleTrack(temp.track, t) - 24) / (threshold * 1.6 - 24))
    }
    if (smoke) {
      const threshold = smoke.alarmAbove ?? 15
      heat = Math.max(heat, sampleTrack(smoke.track, t) / (threshold * 4))
    }
    return Math.min(1, Math.max(0, heat))
  }
}
