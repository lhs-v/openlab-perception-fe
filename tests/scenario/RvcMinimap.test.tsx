import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import RvcMinimap, { samplePath } from '@/scenario/RvcMinimap'
import type { RvcPathPoint } from '@/core/schema'

const path: RvcPathPoint[] = [
  { t: 0, x: 0.2, y: 0.8, heading: 0 },
  { t: 1000, x: 0.6, y: 0.4, heading: 90 },
]

describe('samplePath', () => {
  it('구간 사이를 선형 보간한다', () => {
    const pose = samplePath(path, 500)!
    expect(pose.x).toBeCloseTo(0.4)
    expect(pose.y).toBeCloseTo(0.6)
    expect(pose.heading).toBeCloseTo(45)
  })

  it('시작 이전과 끝 이후는 양 끝으로 고정한다', () => {
    expect(samplePath(path, -100)!.x).toBeCloseTo(0.2)
    expect(samplePath(path, 99999)!.x).toBeCloseTo(0.6)
  })

  it('빈 경로는 null을 낸다', () => {
    expect(samplePath([], 0)).toBeNull()
  })
})

describe('RvcMinimap', () => {
  it('경로가 없으면 아무것도 렌더하지 않는다', () => {
    const { container } = render(<RvcMinimap t={0} />)
    expect(container.firstChild).toBeNull()
  })

  it('현재 위치와 진행 방향을 표식으로 렌더한다', () => {
    render(<RvcMinimap path={path} t={500} />)
    expect(screen.getByTestId('rvc-minimap')).toBeInTheDocument()
    expect(screen.getByTestId('rvc-marker').getAttribute('transform')).toContain('rotate(45.0')
  })

  it('전체 주행 궤적을 그린다', () => {
    const { container } = render(<RvcMinimap path={path} t={0} />)
    expect(container.querySelector('polyline')?.getAttribute('points')).toBe('20.0,80.0 60.0,40.0')
  })
})
