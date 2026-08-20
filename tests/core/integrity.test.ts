import { describe, expect, it } from 'vitest'
import { checkIntegrity } from '@/core/integrity'
import type { Scenario } from '@/core/schema'

function baseScenario(): Scenario {
  return {
    id: 'test',
    provisional: true,
    title: 't',
    summary: 's',
    severity: 'critical',
    durationMs: 10000,
    locale: {
      city: 'Seoul', country: 'KR', lat: 37.5, lon: 127,
      tz: 'Asia/Seoul', localTimeLabel: '03:14',
    },
    cameras: {
      livingroom: { label: 'L' }, entry: { label: 'E' },
      bedroom: { label: 'B' }, rvc: { label: 'R' },
    },
    sensors: [],
    audio: { events: [] },
    reasoning: {
      l1: [{ id: 'e1', t: 1000, modality: 'sensor', source: 's1', trigger: 'rise' }],
      l2: [{ id: 'd1', t: 2000, refs: ['e1'], modality: 'sensor', source: 's1', text: 'x' }],
      l3: [{ id: 'c1', t: 3000, refs: ['d1'], text: 'y' }],
      l4: { id: 'i1', t: 4000, refs: ['c1'], intervene: true, rationale: 'z' },
    },
  }
}

describe('checkIntegrity', () => {
  it('올바른 시나리오에서 문제를 찾지 않는다', () => {
    expect(checkIntegrity(baseScenario())).toEqual([])
  })

  it('L2가 없는 L1을 가리키면 dangling_ref를 보고한다', () => {
    const s = baseScenario()
    s.reasoning.l2[0]!.refs = ['nope']
    const issues = checkIntegrity(s)
    const codes = issues.map((i) => i.code)
    expect(codes).toContain('dangling_ref')
    // d1이 더는 e1을 가리키지 않으므로 e1은 고아가 된다. 둘 다 뜨는 게 옳다.
    expect(codes).toContain('orphan_l1')
    expect(issues.find((i) => i.code === 'dangling_ref')!.message).toContain('nope')
  })

  it('L4가 없는 L3을 가리키면 dangling_ref를 보고한다', () => {
    const s = baseScenario()
    s.reasoning.l4.refs = ['ghost']
    expect(checkIntegrity(s).map((i) => i.code)).toEqual(['dangling_ref'])
  })

  it('중복 id를 보고한다', () => {
    const s = baseScenario()
    // 이미 d1이 참조하는 e1과 같은 id를 쓴다. 참조는 그대로 유효하므로
    // duplicate_id만 단독으로 떠야 한다.
    s.reasoning.l1.push({
      id: 'e1', t: 1200, modality: 'video', source: 'rvc', trigger: 'haze',
    })
    expect(checkIntegrity(s).map((i) => i.code)).toEqual(['duplicate_id'])
  })

  it('참조 대상이 참조자보다 늦으면 causality_violation을 보고한다', () => {
    const s = baseScenario()
    s.reasoning.l2[0]!.t = 500 // L1은 1000
    expect(checkIntegrity(s).map((i) => i.code)).toContain('causality_violation')
  })

  it('durationMs를 넘는 t를 보고한다', () => {
    const s = baseScenario()
    s.reasoning.l4.t = 99999
    expect(checkIntegrity(s).map((i) => i.code)).toContain('t_out_of_range')
  })

  it('아무도 참조하지 않는 L1을 orphan_l1으로 보고한다', () => {
    const s = baseScenario()
    s.reasoning.l1.push({
      id: 'e2', t: 1500, modality: 'video', source: 'rvc', trigger: 'haze',
    })
    expect(checkIntegrity(s).map((i) => i.code)).toContain('orphan_l1')
  })
})
