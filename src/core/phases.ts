import type { Scenario } from './schema'

export const PHASES = ['observe', 'converge', 'verdict'] as const
export type Phase = (typeof PHASES)[number]

export type PhaseBoundaries = {
  convergeAt: number
  verdictAt: number
}

/**
 * 단계 경계를 데이터에서 도출한다. 하드코딩하지 않으므로
 * 시나리오 길이가 제각각이어도 연출이 자동으로 맞는다.
 */
export function phaseBoundaries(scenario: Scenario): PhaseBoundaries {
  const verdictAt = scenario.reasoning.l4.t
  const l3Times = scenario.reasoning.l3.map((c) => c.t)
  const convergeAt = l3Times.length > 0 ? Math.min(...l3Times) : verdictAt
  return { convergeAt, verdictAt }
}

export function phaseAt(scenario: Scenario, t: number): Phase {
  const { convergeAt, verdictAt } = phaseBoundaries(scenario)
  if (t >= verdictAt) return 'verdict'
  if (t >= convergeAt) return 'converge'
  return 'observe'
}
