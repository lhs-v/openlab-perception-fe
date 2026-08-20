import type { AudioEvent, L1Event } from '@/core/schema'

type Props = {
  events: readonly AudioEvent[]
  durationMs: number
  t: number
  triggers: readonly L1Event[]
}

const BAR_COUNT = 96

/** 오디오 이벤트의 peak에서 파형 진폭을 만든다. 각 이벤트는 앞뒤로 감쇠한다. */
function amplitudeAt(events: readonly AudioEvent[], t: number): number {
  let amplitude = 0.04
  for (const event of events) {
    const distance = Math.abs(t - event.t)
    const decay = Math.exp(-distance / 3500)
    amplitude = Math.max(amplitude, event.peak * decay)
  }
  return Math.min(1, amplitude)
}

export default function AudioWaveform({ events, durationMs, t, triggers }: Props) {
  const bars = Array.from({ length: BAR_COUNT }, (_, i) => {
    const barT = (durationMs * i) / (BAR_COUNT - 1)
    const played = barT <= t
    // 결정적 미세 변동 — 막대가 균일하면 파형처럼 보이지 않는다
    const jitter = 0.65 + ((Math.sin(i * 2.399) + 1) / 2) * 0.35
    return { barT, played, height: amplitudeAt(events, barT) * jitter }
  })

  return (
    <div data-testid="audio-waveform">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>오디오</span>
        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'ui-monospace, monospace' }}>
          {/* 카메라·센서와 같은 이유로 개별 요소 + 앵커 */}
          {triggers.map((trigger) => (
            <span key={trigger.id} data-node-id={trigger.id} style={{ marginLeft: 6 }}>
              {trigger.trigger}
            </span>
          ))}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 1, height: 40 }}>
        {bars.map((bar, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: `${Math.max(4, bar.height * 100)}%`,
              background: bar.played ? 'var(--accent)' : 'var(--line)',
              opacity: bar.played ? 0.9 : 0.5,
              borderRadius: 1,
            }}
          />
        ))}
      </div>
    </div>
  )
}
