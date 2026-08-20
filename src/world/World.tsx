import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AttractDirector } from './attract-director'
import { DIVE_MS, REST_DISTANCE, diveFrame } from './dive'
import GlobeCanvas, { type GlobeHandle } from './GlobeCanvas'
import { HANDOFF_COLOR, HANDOFF_FADE_MS, type EnterScenario } from './handoff'
import { type HomeMarker, pinSpecs } from './pins'
import WorldHud from './WorldHud'

export type WorldProps = {
  /** 지구본에 세울 집들. 시나리오 전체가 아니라 위치와 심각도만 필요하다 */
  homes: readonly HomeMarker[]
  /**
   * 하강이 끝나 화면이 인계 색에 잠긴 순간 불린다. 받는 쪽은 같은 색에서
   * 시작해 `handoff.fadeInMs` 동안 밝아지면 된다. `World`는 자기가 무엇으로
   * 진입하는지 모른다 — 그래서 다른 코드베이스로 옮겨도 뷰만 갈아끼우면 된다.
   */
  onEnterScenario: EnterScenario
  /** 지금 시나리오가 열려 있는지. 닫히면 지구본이 다시 주인공이 된다 */
  activeScenarioId?: string | null
  /**
   * 시나리오가 열려 있을 때 지구본 위에 그릴 것. `World`는 이게 무엇인지
   * 모른다 — 인계 색과 페이드만 여기서 강제하고, 내용은 받는 쪽 몫이다.
   */
  children?: React.ReactNode
  /** 나가기를 눌렀을 때. 받는 쪽이 시나리오를 닫으면 된다 */
  onExitScenario?: () => void
}

type Dive = { id: string; startedAt: number }

/**
 * 지구본 화면의 유일한 공개 진입점.
 *
 * 바깥에 대한 의존은 `HomeMarker` 하나뿐이다. 시나리오 스키마도, 추론도,
 * 시나리오 뷰도 모른다.
 */
export default function World({
  homes,
  onEnterScenario,
  activeScenarioId,
  children,
  onExitScenario,
}: WorldProps) {
  const globeRef = useRef<GlobeHandle>(null)
  /** 하강이 시작될 때의 자세. 매 프레임 현재 자세를 읽으면 자기 자신을 쫓아간다 */
  const divePoseRef = useRef<{ spinY: number; distance: number } | null>(null)
  const [dive, setDive] = useState<Dive | null>(null)
  const [veil, setVeil] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)

  const pins = useMemo(() => pinSpecs(homes, 1), [homes])
  const byId = useMemo(() => new Map(homes.map((h) => [h.id, h])), [homes])

  const director = useMemo(
    () => new AttractDirector({ ids: homes.map((h) => h.id) }),
    [homes],
  )

  const beginDive = useCallback((id: string, now: number) => {
    if (!byId.has(id)) return
    setDive({ id, startedAt: now })
  }, [byId])

  // 시나리오가 닫히면 지구본으로 돌아온다
  useEffect(() => {
    if (activeScenarioId) return
    director.scenarioEnded(performance.now())
    setVeil(0)
    globeRef.current?.setPose(null)
  }, [activeScenarioId, director])

  useEffect(() => {
    let frame = requestAnimationFrame(function loop(now) {
      frame = requestAnimationFrame(loop)
      setCountdown(director.countdownMs(now))

      if (dive) {
        const home = byId.get(dive.id)
        if (!home) return
        const progress = (now - dive.startedAt) / DIVE_MS
        const from = globeRef.current?.pose() ?? { spinY: 0, distance: REST_DISTANCE }
        const startPose = divePoseRef.current ?? from
        divePoseRef.current = startPose

        const shot = diveFrame({
          lat: home.lat,
          lon: home.lon,
          fromSpinY: startPose.spinY,
          fromDistance: startPose.distance,
          progress,
        })
        globeRef.current?.setPose({ spinY: shot.spinY, distance: shot.distance })
        setVeil(shot.veil)

        if (progress >= 1) {
          setDive(null)
          divePoseRef.current = null
          onEnterScenario(dive.id, {
            color: HANDOFF_COLOR,
            fadeInMs: HANDOFF_FADE_MS,
            locale: {
              city: home.city,
              country: home.country,
              localTimeLabel: home.localTimeLabel,
            },
            // 하강은 언제나 화면 한가운데로 내려앉는다
            focus: { x: 0.5, y: 0.5 },
          })
        }
        return
      }

      if (activeScenarioId) return
      const next = director.tick(now)
      if (next) beginDive(next, now)
    })
    return () => cancelAnimationFrame(frame)
  }, [director, dive, byId, beginDive, onEnterScenario, activeScenarioId])

  const interact = useCallback(() => {
    director.interacted(performance.now())
  }, [director])

  const pick = useCallback(
    (id: string) => {
      const now = performance.now()
      director.enter(id, now)
      beginDive(id, now)
    },
    [director, beginDive],
  )

  const leave = useCallback(() => {
    // 스스로 나온 사람에게 8초 뒤 다른 집을 들이밀면 고를 틈이 없다.
    // 나가기도 인터랙션으로 쳐서 45초를 벌어준다.
    director.interacted(performance.now())
    onExitScenario?.()
  }, [director, onExitScenario])

  return (
    <div
      data-testid="world"
      data-diving={dive ? 'true' : 'false'}
      onPointerDown={interact}
      onWheel={interact}
      style={{ position: 'absolute', inset: 0, background: HANDOFF_COLOR }}
    >
      <GlobeCanvas ref={globeRef} pins={pins} />

      <WorldHud
        homes={homes}
        countdownMs={countdown}
        onPick={pick}
        dimmed={Boolean(activeScenarioId) || Boolean(dive)}
      />

      {/* 인계 장막. 하강 끝에서 화면을 이 색으로 가득 채운 뒤 다음 화면에 넘긴다 */}
      <div
        data-testid="handoff-veil"
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: HANDOFF_COLOR,
          opacity: veil,
          pointerEvents: 'none',
        }}
      />

      {/* 도착 층. 장막과 같은 색에서 시작해 밝아진다 — 색이 어긋나면
          그 자리에서 번쩍이고, 그 번쩍임이 곧 이음매다. */}
      {activeScenarioId && children && (
        <div
          data-testid="scenario-layer"
          style={{
            position: 'absolute',
            inset: 0,
            background: HANDOFF_COLOR,
            animation: `handoff-fade ${HANDOFF_FADE_MS}ms ease forwards`,
          }}
        >
          {children}
        </div>
      )}

      {activeScenarioId && onExitScenario && (
        <button
          type="button"
          data-testid="exit-scenario"
          onClick={leave}
          style={{
            position: 'absolute',
            bottom: 18,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '7px 16px',
            borderRadius: 999,
            border: '1px solid var(--line)',
            background: 'rgba(6, 8, 13, 0.82)',
            color: 'var(--muted)',
            fontFamily: 'ui-monospace, monospace',
            fontSize: 12,
            letterSpacing: 0.4,
            cursor: 'pointer',
          }}
        >
          <span aria-hidden>←</span>
          세계로 돌아가 다른 집 고르기
        </button>
      )}
    </div>
  )
}
