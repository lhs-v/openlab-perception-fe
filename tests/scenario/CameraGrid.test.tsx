import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CameraGrid from '@/scenario/CameraGrid'
import { CanvasFrameSource } from '@/media/canvas-frame-source'
import { scenarioSchema } from '@/core/schema'
import kitchenFire from '../../scenarios/kitchen-fire.json'

const scenario = scenarioSchema.parse(kitchenFire)

describe('CameraGrid', () => {
  it('카메라 4종을 모두 렌더한다', () => {
    render(<CameraGrid scenario={scenario} t={0} events={[]} />)
    expect(screen.getByText('거실')).toBeInTheDocument()
    expect(screen.getByText('현관')).toBeInTheDocument()
    expect(screen.getByText('침실')).toBeInTheDocument()
    expect(screen.getByText('로봇청소기')).toBeInTheDocument()
  })

  it('해당 카메라의 L1 트리거만 그 패널에 표시한다', () => {
    const events = scenario.reasoning.l1.filter((e) => e.source === 'bedroom')
    render(<CameraGrid scenario={scenario} t={16000} events={events} />)
    const panel = screen.getByTestId('camera-panel-bedroom')
    expect(panel).toHaveTextContent('occupant_stationary')
    expect(screen.getByTestId('camera-panel-entry')).not.toHaveTextContent(
      'occupant_stationary',
    )
  })

  it('미니맵은 rvc 패널에만 나타난다', () => {
    render(<CameraGrid scenario={scenario} t={12000} events={[]} />)
    expect(screen.getByTestId('camera-panel-rvc')).toContainElement(
      screen.getByTestId('rvc-minimap'),
    )
    expect(screen.getAllByTestId('rvc-minimap')).toHaveLength(1)
  })

  it('t가 그대로인 채 시나리오가 바뀌어도 새 캔버스를 즉시 그린다', () => {
    // 초기 마운트만 보면 이 버그를 구분할 수 없다. [t] 이펙트가 최초에는
    // 어차피 한 번 돌기 때문이다. t를 고정한 채 시나리오만 갈아끼워야
    // 마운트 이펙트가 스스로 그리는지가 드러난다 — 일시정지 중 시나리오
    // 전환이 정확히 이 상황이고, 안 그리면 패널이 검은 채로 남는다.
    const seekSpy = vi.spyOn(CanvasFrameSource.prototype, 'seek')
    const swapped = structuredClone(scenario)
    const { rerender } = render(<CameraGrid scenario={scenario} t={12345} events={[]} />)

    seekSpy.mockClear()
    rerender(<CameraGrid scenario={swapped} t={12345} events={[]} />)

    expect(seekSpy).toHaveBeenCalledWith(12345)
    seekSpy.mockRestore()
  })

  it('언마운트하면 네 패널의 프레임 소스를 모두 정리한다', () => {
    // 계획 2의 무인 순환이 며칠 동안 시나리오를 갈아끼운다. 정리가
    // 하나라도 새면 그 기간 내내 누적된다.
    const disposeSpy = vi.spyOn(CanvasFrameSource.prototype, 'dispose')
    const { unmount } = render(<CameraGrid scenario={scenario} t={0} events={[]} />)
    disposeSpy.mockClear()
    unmount()
    expect(disposeSpy).toHaveBeenCalledTimes(4)
    disposeSpy.mockRestore()
  })

  it('L1 마커에 연결선이 찾는 앵커 속성을 붙인다', () => {
    // useEdgeLines는 간선 양 끝을 [data-node-id]로 찾는다. 여기서 이름이
    // 어긋나면 L1→L2 연결선이 전부 조용히 드롭된다 — 데모 중심 애니메이션의
    // 첫 구간이 통째로 사라지는데 오류는 하나도 안 난다.
    const events = scenario.reasoning.l1.filter((e) => e.source === 'bedroom')
    const { container } = render(<CameraGrid scenario={scenario} t={16000} events={events} />)
    expect(container.querySelector('[data-node-id="e5"]')).not.toBeNull()
  })

  it('센서 id가 카메라 id와 겹쳐도 카메라 패널로 새지 않는다', () => {
    // 지금 시나리오는 센서 id가 우연히 카메라 id와 다르다. 그 우연에
    // 기대면 modality 검사가 사라져도 아무도 모른다.
    const collided = structuredClone(scenario)
    collided.reasoning.l1 = [
      { id: 'x1', t: 1000, modality: 'sensor', source: 'bedroom', trigger: 'collide_probe' },
    ]
    render(<CameraGrid scenario={collided} t={2000} events={collided.reasoning.l1} />)
    expect(screen.getByTestId('camera-panel-bedroom')).not.toHaveTextContent('collide_probe')
  })

  it('센서·오디오 L1은 카메라 패널에 표시하지 않는다', () => {
    const sensorEvents = scenario.reasoning.l1.filter((e) => e.modality === 'sensor')
    render(<CameraGrid scenario={scenario} t={13000} events={sensorEvents} />)
    for (const cameraId of ['livingroom', 'entry', 'bedroom', 'rvc']) {
      expect(screen.getByTestId(`camera-panel-${cameraId}`)).not.toHaveTextContent(
        'thermal_rise',
      )
    }
  })
})
