import { describe, expect, it, vi } from 'vitest'
import { CAMERA_IDS, type CameraId } from '@/core/schema'
import { createPainter } from '@/media/painters'
import { createFake2dContext } from '../canvas-stub'

function fakePaint(t: number) {
  const { ctx, calls } = createFake2dContext()
  return { paint: { ctx, width: 320, height: 180, t }, calls }
}

describe('createPainter', () => {
  for (const cameraId of CAMERA_IDS) {
    it(`${cameraId} 페인터가 무언가를 그린다`, () => {
      const painter = createPainter(cameraId, { severity: 'critical', heatAt: () => 0.5 })
      const { paint, calls } = fakePaint(5000)
      expect(() => painter(paint)).not.toThrow()
      expect(calls.length).toBeGreaterThan(0)
    })
  }

  it('같은 t에서는 같은 그리기 호출 순서를 낸다 (결정적)', () => {
    const painter = createPainter('rvc', { severity: 'critical', heatAt: () => 0.5 })
    const a = fakePaint(3000)
    const b = fakePaint(3000)
    painter(a.paint)
    painter(b.paint)
    expect(a.calls).toEqual(b.calls)
  })

  it('네 페인터가 서로 다른 그림을 그린다', () => {
    // 네 시점이 한 판단으로 합쳐진다는 게 이 데모의 논지다.
    // 패널이 서로 같아 보이면 관객은 한 신호를 네 번 보는 것으로 읽는다.
    const rendered = CAMERA_IDS.map((id) => {
      const { paint, calls } = fakePaint(5000)
      createPainter(id, { severity: 'critical', heatAt: () => 0.5 })(paint)
      return { id, signature: calls.join('|') }
    })
    for (let i = 0; i < rendered.length; i += 1) {
      for (let j = i + 1; j < rendered.length; j += 1) {
        const a = rendered[i]!
        const b = rendered[j]!
        expect(a.signature, `${a.id} 와 ${b.id} 가 같다`).not.toBe(b.signature)
      }
    }
  })

  it('절정에서 rvc의 연무가 거실보다 항상 짙다', () => {
    // rvc는 12개 중 2개 시나리오에서 판단을 뒤집는 카메라다.
    // 상한을 공유하면 절정에서 거실과 같은 값으로 포화해, 하필 그 순간
    // 네 번째 카메라가 왜 있는지가 화면에서 사라진다.
    const hazeAlpha = (id: CameraId, t: number): number => {
      const { paint, calls } = fakePaint(t)
      createPainter(id, { severity: 'critical', heatAt: () => 1 })(paint)
      const i = calls.indexOf('fillStyle=#ff7a3c')
      expect(i).toBeGreaterThan(0)
      return Number(calls[i - 1]!.replace('globalAlpha=', ''))
    }
    // flicker가 t에서 나오므로 여러 시점을 훑는다
    for (const t of [0, 700, 1500, 3300, 5000, 9100]) {
      expect(hazeAlpha('rvc', t), `t=${t}`).toBeGreaterThan(hazeAlpha('livingroom', t))
    }
  })

  it('normal 시나리오에서는 heat를 0으로 고정한다', () => {
    const heatAt = vi.fn(() => 0.9)
    const painter = createPainter('livingroom', { severity: 'normal', heatAt })
    painter(fakePaint(9000).paint)
    expect(heatAt).not.toHaveBeenCalled()
  })

  it('critical 시나리오에서는 heatAt을 현재 t로 호출한다', () => {
    const heatAt = vi.fn(() => 0.8)
    const painter = createPainter('livingroom', { severity: 'critical', heatAt })
    painter(fakePaint(9000).paint)
    expect(heatAt).toHaveBeenCalledWith(9000)
  })
})
