import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SensorRail from '@/scenario/SensorRail'
import { scenarioSchema } from '@/core/schema'
import kitchenFire from '../../scenarios/kitchen-fire.json'

const scenario = scenarioSchema.parse(kitchenFire)

describe('SensorRail', () => {
  it('센서를 전부 렌더한다', () => {
    render(<SensorRail scenario={scenario} t={0} events={[]} />)
    expect(screen.getByText('주방 온도')).toBeInTheDocument()
    expect(screen.getByText('주방 연기')).toBeInTheDocument()
    expect(screen.getByText('침실 움직임')).toBeInTheDocument()
    expect(screen.getByText('현관문')).toBeInTheDocument()
  })

  it('현재 t의 값을 보여준다', () => {
    render(<SensorRail scenario={scenario} t={20000} events={[]} />)
    expect(screen.getByTestId('sensor-value-kitchen-temp')).toHaveTextContent('42')
  })

  it('경보 임계치를 넘으면 alarm 상태를 표시한다', () => {
    render(<SensorRail scenario={scenario} t={30000} events={[]} />)
    expect(screen.getByTestId('sensor-kitchen-temp')).toHaveAttribute('data-alarm', 'true')
    expect(screen.getByTestId('sensor-entry-door')).toHaveAttribute('data-alarm', 'false')
  })

  it('센서 L1 트리거를 해당 센서 행에 표시한다', () => {
    const events = scenario.reasoning.l1.filter((e) => e.source === 'kitchen-temp')
    render(<SensorRail scenario={scenario} t={7000} events={events} />)
    expect(screen.getByTestId('sensor-kitchen-temp')).toHaveTextContent('thermal_rise')
  })

  it('센서·오디오 트리거에도 연결선이 찾는 앵커를 붙인다', () => {
    // 카메라 마커와 같은 계약이다. 여기서 빠지면 온도·연기·경보음에서
    // 나가는 L1→L2 선이 조용히 사라진다 — 주방 화재의 핵심 신호 셋이다.
    const events = scenario.reasoning.l1.filter(
      (e) => e.modality === 'sensor' || e.modality === 'audio',
    )
    const { container } = render(<SensorRail scenario={scenario} t={14000} events={events} />)
    for (const id of ['e1', 'e3', 'e4']) {
      expect(container.querySelector(`[data-node-id="${id}"]`), id).not.toBeNull()
    }
  })

  it('카메라 id가 센서 id와 겹쳐도 센서 행으로 새지 않는다', () => {
    const collided = structuredClone(scenario)
    collided.reasoning.l1 = [
      { id: 'x1', t: 1000, modality: 'video', source: 'kitchen-temp', trigger: 'collide_probe' },
    ]
    render(<SensorRail scenario={collided} t={2000} events={collided.reasoning.l1} />)
    expect(screen.getByTestId('sensor-kitchen-temp')).not.toHaveTextContent('collide_probe')
  })
})
