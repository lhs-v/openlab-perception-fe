import { describe, expect, it } from 'vitest'
import { FixtureReasoningSource } from '@/core/fixture-reasoning-source'
import type { Scenario } from '@/core/schema'

function scenario(): Scenario {
  return {
    id: 'test', provisional: true, title: 't', summary: 's',
    severity: 'critical', durationMs: 10000,
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
      l1: [
        { id: 'e1', t: 1000, modality: 'sensor', source: 's1', trigger: 'a' },
        { id: 'e2', t: 5000, modality: 'video', source: 'rvc', trigger: 'b' },
      ],
      l2: [
        { id: 'd1', t: 2000, refs: ['e1'], modality: 'sensor', source: 's1', text: 'x' },
        { id: 'd2', t: 6000, refs: ['e2'], modality: 'video', source: 'rvc', text: 'y' },
      ],
      l3: [{ id: 'c1', t: 7000, refs: ['d1', 'd2'], text: 'z' }],
      l4: { id: 'i1', t: 8000, refs: ['c1'], intervene: true, rationale: 'r' },
    },
  }
}

describe('FixtureReasoningSource', () => {
  it('t 이전 항목만 낸다', () => {
    const source = new FixtureReasoningSource(scenario())
    const slice = source.slice(3000)
    expect(slice.l1.map((e) => e.id)).toEqual(['e1'])
    expect(slice.l2.map((d) => d.id)).toEqual(['d1'])
    expect(slice.l3).toEqual([])
    expect(slice.l4).toBeNull()
  })

  it('t와 정확히 같은 항목을 포함한다', () => {
    const source = new FixtureReasoningSource(scenario())
    expect(source.slice(1000).l1.map((e) => e.id)).toEqual(['e1'])
  })

  it('끝에서 전부 낸다', () => {
    const source = new FixtureReasoningSource(scenario())
    const slice = source.slice(10000)
    expect(slice.l1).toHaveLength(2)
    expect(slice.l3).toHaveLength(1)
    expect(slice.l4?.id).toBe('i1')
  })

  it('t 순으로 정렬해서 낸다', () => {
    const unsorted = scenario()
    unsorted.reasoning.l1.reverse()
    const source = new FixtureReasoningSource(unsorted)
    expect(source.slice(10000).l1.map((e) => e.t)).toEqual([1000, 5000])
  })

  it('같은 t를 두 번 요청하면 같은 배열 참조를 낸다', () => {
    const source = new FixtureReasoningSource(scenario())
    expect(source.slice(3000).l1).toBe(source.slice(3000).l1)
  })
})
