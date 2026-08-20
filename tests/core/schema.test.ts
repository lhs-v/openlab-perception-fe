import { describe, expect, it } from 'vitest'
import {
  l1EventSchema,
  l2DescriptionSchema,
  l3ContextSchema,
  l4IntentSchema,
  scenarioSchema,
} from '@/core/schema'

describe('l1EventSchema', () => {
  it('유효한 이벤트를 통과시킨다', () => {
    const parsed = l1EventSchema.parse({
      id: 'e1',
      t: 6000,
      modality: 'sensor',
      source: 'kitchen-temp',
      trigger: 'thermal_rise',
    })
    expect(parsed.id).toBe('e1')
    expect(parsed.confidence).toBeUndefined()
  })

  it('음수 t를 거부한다', () => {
    expect(() =>
      l1EventSchema.parse({
        id: 'e1',
        t: -1,
        modality: 'sensor',
        source: 'kitchen-temp',
        trigger: 'thermal_rise',
      }),
    ).toThrow()
  })

  it('알 수 없는 modality를 거부한다', () => {
    expect(() =>
      l1EventSchema.parse({
        id: 'e1',
        t: 0,
        modality: 'telepathy',
        source: 'x',
        trigger: 'y',
      }),
    ).toThrow()
  })
})

describe('l4IntentSchema', () => {
  it('intervene 필드를 요구한다', () => {
    expect(() =>
      l4IntentSchema.parse({ id: 'i1', t: 100, refs: ['c1'], rationale: 'x' }),
    ).toThrow()
  })
})

describe('scenarioSchema', () => {
  it('카메라 4종이 모두 없으면 거부한다', () => {
    expect(() =>
      scenarioSchema.parse({
        id: 'x',
        provisional: true,
        title: 'x',
        summary: 'x',
        severity: 'normal',
        durationMs: 1000,
        locale: {
          city: 'Seoul',
          country: 'KR',
          lat: 37.5,
          lon: 127,
          tz: 'Asia/Seoul',
          localTimeLabel: '03:14',
        },
        // 카메라 3종 누락이 이 테스트의 유일한 위반이어야 한다.
        // l4.refs를 비워두면 그쪽 제약에 먼저 걸려 카메라 제약을 전혀 검증하지 못한다.
        cameras: { livingroom: { label: 'a' } },
        sensors: [],
        audio: { events: [] },
        reasoning: {
          l1: [],
          l2: [],
          l3: [],
          l4: { id: 'i1', t: 1, refs: ['c1'], intervene: false, rationale: 'x' },
        },
      }),
    ).toThrow()
  })
})

describe('refs 제약', () => {
  it('빈 refs를 거부한다 — 수렴 연결선이 끊긴 데이터가 들어오면 안 된다', () => {
    expect(() =>
      l2DescriptionSchema.parse({
        id: 'd1', t: 1, refs: [], modality: 'sensor', source: 's1', text: 'x',
      }),
    ).toThrow()
    expect(() =>
      l3ContextSchema.parse({ id: 'c1', t: 1, refs: [], text: 'x' }),
    ).toThrow()
    expect(() =>
      l4IntentSchema.parse({
        id: 'i1', t: 1, refs: [], intervene: true, rationale: 'x',
      }),
    ).toThrow()
  })
})

describe('0..1 구간 필드', () => {
  it('confidence가 1을 넘으면 거부한다', () => {
    expect(() =>
      l1EventSchema.parse({
        id: 'e1', t: 0, modality: 'sensor', source: 's1', trigger: 'x',
        confidence: 1.5,
      }),
    ).toThrow()
  })
})
