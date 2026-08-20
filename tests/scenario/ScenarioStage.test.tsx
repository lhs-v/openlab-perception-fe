import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ScenarioStage from '@/scenario/ScenarioStage'
import { scenarioSchema } from '@/core/schema'
import kitchenFire from '../../scenarios/kitchen-fire.json'

const scenario = scenarioSchema.parse(kitchenFire)

describe('ScenarioStage', () => {
  it('시나리오 제목과 지역과 현지 시각을 보여준다', () => {
    render(<ScenarioStage scenario={scenario} autoPlay={false} />)
    expect(screen.getByText('주방 화재')).toBeInTheDocument()
    expect(screen.getByTestId('locale')).toHaveTextContent('Seoul')
    expect(screen.getByTestId('locale')).toHaveTextContent('03:14')
  })

  it('현재 단계를 data 속성으로 노출한다', () => {
    render(<ScenarioStage scenario={scenario} autoPlay={false} />)
    expect(screen.getByTestId('stage')).toHaveAttribute('data-phase', 'observe')
  })

  it('자동재생 정책 때문에 음소거로 시작한다', () => {
    render(<ScenarioStage scenario={scenario} autoPlay={false} />)
    expect(screen.getByTestId('mute-toggle')).toHaveTextContent('음소거')
  })

  it('카메라 그리드와 센서 레인과 추론 패널을 모두 렌더한다', () => {
    render(<ScenarioStage scenario={scenario} autoPlay={false} />)
    expect(screen.getByTestId('camera-panel-rvc')).toBeInTheDocument()
    expect(screen.getByTestId('sensor-kitchen-temp')).toBeInTheDocument()
    expect(screen.getByTestId('reasoning-empty')).toBeInTheDocument()
  })
})
