import { describe, expect, it } from 'vitest'
import { checkIntegrity } from '@/core/integrity'
import { scenarioSchema } from '@/core/schema'

const modules = import.meta.glob('../../scenarios/*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>

describe('scenarios/*.json', () => {
  it('최소 한 개의 시나리오가 존재한다', () => {
    expect(Object.keys(modules).length).toBeGreaterThan(0)
  })

  for (const [path, mod] of Object.entries(modules)) {
    describe(path, () => {
      it('스키마를 만족한다', () => {
        expect(() => scenarioSchema.parse(mod.default)).not.toThrow()
      })

      it('참조 무결성을 만족한다', () => {
        const scenario = scenarioSchema.parse(mod.default)
        expect(checkIntegrity(scenario)).toEqual([])
      })

      it('id가 파일명과 일치한다', () => {
        const scenario = scenarioSchema.parse(mod.default)
        const filename = path.split('/').pop()!.replace('.json', '')
        expect(scenario.id).toBe(filename)
      })

      it('센서 트랙과 rvc 주행 경로가 durationMs까지 이어진다', () => {
        const scenario = scenarioSchema.parse(mod.default)
        // 중간에 끊긴 트랙은 스키마도 무결성 검사도 잡지 못한다.
        // 화면에서는 게이지가 남은 시간 내내 얼어붙은 것처럼 보인다.
        for (const sensor of scenario.sensors) {
          const last = sensor.track[sensor.track.length - 1]!
          expect(last.t, `${sensor.id} 트랙이 일찍 끝남`).toBe(scenario.durationMs)
        }
        const rvcPath = scenario.cameras.rvc.path
        if (rvcPath && rvcPath.length > 0) {
          expect(rvcPath[rvcPath.length - 1]!.t, 'rvc 주행 경로가 일찍 끝남').toBe(
            scenario.durationMs,
          )
        }
      })
    })
  }
})
