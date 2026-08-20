import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ReasoningPanel from '@/scenario/ReasoningPanel'
import type { ReasoningSlice } from '@/core/reasoning-source'

const empty: ReasoningSlice = { l1: [], l2: [], l3: [], l4: null }

const withL2: ReasoningSlice = {
  l1: [{ id: 'e1', t: 0, modality: 'sensor', source: 'kitchen-temp', trigger: 'rise' }],
  l2: [
    { id: 'd1', t: 1, refs: ['e1'], modality: 'sensor', source: 'kitchen-temp', text: '주방 온도가 급상승했다' },
  ],
  l3: [],
  l4: null,
}

const full: ReasoningSlice = {
  ...withL2,
  l3: [{ id: 'c1', t: 3, refs: ['d1'], text: '주방에서 화재가 진행 중이다' }],
  l4: {
    id: 'i1', t: 4, refs: ['c1'], intervene: true,
    rationale: '거주자가 자력 대피 불가',
    actions: ['119 신고'],
  },
}

describe('ReasoningPanel', () => {
  it('아무것도 도달하지 않으면 대기 상태를 보여준다', () => {
    render(<ReasoningPanel slice={empty} phase="observe" />)
    expect(screen.getByTestId('reasoning-empty')).toBeInTheDocument()
  })

  it('L2 서술을 렌더한다', () => {
    render(<ReasoningPanel slice={withL2} phase="observe" />)
    expect(screen.getByText('주방 온도가 급상승했다')).toBeInTheDocument()
  })

  it('L3 상황맥락을 렌더한다', () => {
    render(<ReasoningPanel slice={full} phase="converge" />)
    expect(screen.getByText('주방에서 화재가 진행 중이다')).toBeInTheDocument()
  })

  it('개입 판정과 근거와 액션을 렌더한다', () => {
    render(<ReasoningPanel slice={full} phase="verdict" />)
    expect(screen.getByTestId('verdict')).toHaveTextContent('INTERVENE')
    expect(screen.getByText('거주자가 자력 대피 불가')).toBeInTheDocument()
    expect(screen.getByText('119 신고')).toBeInTheDocument()
  })

  it('개입하지 않음 판정을 OBSERVE로 표시한다', () => {
    const observing: ReasoningSlice = {
      ...full,
      l4: { ...full.l4!, intervene: false, actions: undefined },
    }
    render(<ReasoningPanel slice={observing} phase="verdict" />)
    expect(screen.getByTestId('verdict')).toHaveTextContent('OBSERVE')
  })

  it('노드마다 data-node-id 앵커를 붙인다', () => {
    const { container } = render(<ReasoningPanel slice={full} phase="verdict" />)
    expect(container.querySelector('[data-node-id="d1"]')).not.toBeNull()
    expect(container.querySelector('[data-node-id="c1"]')).not.toBeNull()
    expect(container.querySelector('[data-node-id="i1"]')).not.toBeNull()
  })
})
