import { describe, expect, it } from 'vitest'
import { phaseAt, phaseBoundaries } from '@/core/phases'
import type { Scenario } from '@/core/schema'

function scenario(l3Times: number[], l4Time: number): Scenario {
  return {
    id: 'test', provisional: true, title: 't', summary: 's',
    severity: 'critical', durationMs: 45000,
    locale: {
      city: 'Seoul', country: 'KR', lat: 37.5, lon: 127,
      tz: 'Asia/Seoul', localTimeLabel: '03:14',
    },
    cameras: {
      livingroom: { label: 'L' }, entry: { label: 'E' },
      bedroom: { label: 'B' }, rvc: { label: 'R' },
    },
    sensors: [], audio: { events: [] },
    reasoning: {
      l1: [], l2: [],
      l3: l3Times.map((t, i) => ({ id: `c${i}`, t, refs: ['d1'], text: 'x' })),
      l4: { id: 'i1', t: l4Time, refs: ['c0'], intervene: true, rationale: 'r' },
    },
  }
}

describe('phaseBoundaries', () => {
  it('가장 이른 L3에서 converge가 시작된다', () => {
    expect(phaseBoundaries(scenario([23000, 21000], 27000)).convergeAt).toBe(21000)
  })

  it('L4의 t에서 verdict가 시작된다', () => {
    expect(phaseBoundaries(scenario([21000], 27000)).verdictAt).toBe(27000)
  })

  it('L3이 없으면 verdict 시점을 converge 시점으로 쓴다', () => {
    const boundaries = phaseBoundaries(scenario([], 27000))
    expect(boundaries.convergeAt).toBe(27000)
  })
})

describe('phaseAt', () => {
  const s = scenario([21000], 27000)

  it('L3 이전은 observe', () => {
    expect(phaseAt(s, 0)).toBe('observe')
    expect(phaseAt(s, 20999)).toBe('observe')
  })

  it('L3 시점부터 converge', () => {
    expect(phaseAt(s, 21000)).toBe('converge')
    expect(phaseAt(s, 26999)).toBe('converge')
  })

  it('L4 시점부터 verdict', () => {
    expect(phaseAt(s, 27000)).toBe('verdict')
    expect(phaseAt(s, 45000)).toBe('verdict')
  })
})
