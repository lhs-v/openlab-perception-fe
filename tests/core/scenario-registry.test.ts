import { describe, expect, it } from 'vitest'
import { loadBundledScenarios, loadScenarios } from '@/core/scenario-registry'
import kitchenFire from '../../scenarios/kitchen-fire.json'

describe('loadScenarios', () => {
  it('유효한 시나리오를 싣는다', () => {
    const result = loadScenarios({ '/scenarios/kitchen-fire.json': kitchenFire })
    expect(result.ok.map((s) => s.id)).toEqual(['kitchen-fire'])
    expect(result.failed).toEqual([])
  })

  it('스키마 위반을 배제하고 나머지를 유지한다', () => {
    const result = loadScenarios({
      '/scenarios/kitchen-fire.json': kitchenFire,
      '/scenarios/broken.json': { id: 'broken' },
    })
    expect(result.ok.map((s) => s.id)).toEqual(['kitchen-fire'])
    expect(result.failed).toHaveLength(1)
    expect(result.failed[0]!.path).toBe('/scenarios/broken.json')
    expect(result.failed[0]!.reason).toBe('schema')
  })

  it('참조 무결성 위반을 배제한다', () => {
    const broken = structuredClone(kitchenFire)
    broken.id = 'dangling'
    broken.reasoning.l2[0]!.refs = ['nope']
    const result = loadScenarios({ '/scenarios/dangling.json': broken })
    expect(result.ok).toEqual([])
    expect(result.failed[0]!.reason).toBe('integrity')
    expect(result.failed[0]!.issues.join(' ')).toContain('nope')
  })

  it('id 오름차순으로 정렬해서 낸다', () => {
    const second = structuredClone(kitchenFire)
    second.id = 'aaa-first'
    const result = loadScenarios({
      '/scenarios/kitchen-fire.json': kitchenFire,
      '/scenarios/aaa-first.json': second,
    })
    expect(result.ok.map((s) => s.id)).toEqual(['aaa-first', 'kitchen-fire'])
  })
})

describe('loadBundledScenarios', () => {
  it('실제 scenarios 디렉터리를 찾아 싣는다', () => {
    // 앱이 실제로 쓰는 경로다. glob이 아무것도 못 찾으면 결과가
    // { ok: [], failed: [] } — 실패가 아니라 '성공적으로 비어 있음'으로
    // 보이므로 어디서도 오류가 나지 않고 무대만 깜깜해진다.
    // fixtures.test.ts는 앵커가 다른 상대 경로 glob이라 이걸 못 잡는다.
    const result = loadBundledScenarios()
    expect(result.failed).toEqual([])
    expect(result.ok.length).toBeGreaterThan(0)
    expect(result.ok.map((s) => s.id)).toContain('kitchen-fire')
  })
})
