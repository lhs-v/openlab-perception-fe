import { describe, expect, it } from 'vitest'
import { computeEdges } from '@/scenario/useConnectors'
import type { ReasoningSlice } from '@/core/reasoning-source'

const slice: ReasoningSlice = {
  l1: [{ id: 'e1', t: 0, modality: 'sensor', source: 's', trigger: 'a' }],
  l2: [
    { id: 'd1', t: 1, refs: ['e1'], modality: 'sensor', source: 's', text: 'x' },
    { id: 'd2', t: 2, refs: ['e1'], modality: 'video', source: 'rvc', text: 'y' },
  ],
  l3: [{ id: 'c1', t: 3, refs: ['d1', 'd2'], text: 'z' }],
  l4: { id: 'i1', t: 4, refs: ['c1'], intervene: true, rationale: 'r' },
}

describe('computeEdges', () => {
  it('L1→L2, L2→L3, L3→L4 간선을 만든다', () => {
    const edges = computeEdges(slice)
    expect(edges).toContainEqual({ from: 'e1', to: 'd1', layer: 'l1-l2' })
    expect(edges).toContainEqual({ from: 'd1', to: 'c1', layer: 'l2-l3' })
    expect(edges).toContainEqual({ from: 'c1', to: 'i1', layer: 'l3-l4' })
  })

  it('아직 도달하지 않은 L4에 대해서는 간선을 만들지 않는다', () => {
    const edges = computeEdges({ ...slice, l4: null })
    expect(edges.some((edge) => edge.layer === 'l3-l4')).toBe(false)
  })

  it('슬라이스에 없는 대상을 가리키는 간선은 버린다', () => {
    const partial: ReasoningSlice = { ...slice, l2: [slice.l2[0]!] }
    const edges = computeEdges(partial)
    expect(edges.some((edge) => edge.from === 'd2')).toBe(false)
  })
})
