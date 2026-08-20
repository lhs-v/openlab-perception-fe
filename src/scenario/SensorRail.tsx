import { sampleTrack, trackExtent } from '@/core/sensor-track'
import type { L1Event, Scenario, Sensor } from '@/core/schema'
import AudioWaveform from './AudioWaveform'

type Props = {
  scenario: Scenario
  t: number
  events: readonly L1Event[]
}

function isAlarming(sensor: Sensor, value: number): boolean {
  if (sensor.alarmAbove !== undefined && value > sensor.alarmAbove) return true
  if (sensor.alarmBelow !== undefined && value < sensor.alarmBelow) return true
  return false
}

function sparklinePath(sensor: Sensor, width: number, height: number): string {
  const { min, max } = trackExtent(sensor.track)
  const lastT = sensor.track[sensor.track.length - 1]!.t
  return sensor.track
    .map((point, i) => {
      const x = lastT === 0 ? 0 : (point.t / lastT) * width
      const y = height - ((point.v - min) / (max - min)) * height
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export default function SensorRail({ scenario, t, events }: Props) {
  const audioTriggers = events.filter((event) => event.modality === 'audio')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {scenario.sensors.map((sensor) => {
          const value = sampleTrack(sensor.track, t)
          const alarm = isAlarming(sensor, value)
          // modality까지 본다. source만 보면 카메라 id가 센서 id와 겹치는
          // 순간 영상 트리거가 센서 행으로 샌다 (CameraGrid의 거울상 문제).
          const triggers = events.filter(
            (event) => event.modality === 'sensor' && event.source === sensor.id,
          )
          return (
            <div
              key={sensor.id}
              data-testid={`sensor-${sensor.id}`}
              data-alarm={String(alarm)}
              style={{
                display: 'grid',
                gridTemplateColumns: '110px 1fr 84px',
                alignItems: 'center',
                gap: 8,
                padding: '4px 8px',
                borderRadius: 3,
                border: `1px solid ${alarm ? 'rgba(255,90,78,0.55)' : 'var(--line)'}`,
                background: alarm ? 'rgba(255,90,78,0.08)' : 'transparent',
              }}
            >
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{sensor.label}</span>
              <svg viewBox="0 0 200 24" preserveAspectRatio="none" style={{ height: 24 }}>
                <path
                  d={sparklinePath(sensor, 200, 24)}
                  fill="none"
                  stroke={alarm ? 'var(--critical)' : 'var(--accent)'}
                  strokeWidth={1.5}
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              <span
                data-testid={`sensor-value-${sensor.id}`}
                style={{
                  fontFamily: 'ui-monospace, monospace',
                  fontSize: 12,
                  textAlign: 'right',
                  color: alarm ? 'var(--critical)' : 'var(--text)',
                }}
              >
                {value.toFixed(sensor.kind === 'motion' ? 2 : 0)} {sensor.unit}
                {/* 각 트리거를 개별 요소로 낸다. 텍스트로만 찍으면 연결선이
                    찾을 앵커가 없어서 이 센서로 들어오는 L1→L2 선이 사라진다. */}
                {triggers.map((trigger) => (
                  <span key={trigger.id} data-node-id={trigger.id} style={{ marginLeft: 6 }}>
                    · {trigger.trigger}
                  </span>
                ))}
              </span>
            </div>
          )
        })}
      </div>
      <AudioWaveform
        events={scenario.audio.events}
        durationMs={scenario.durationMs}
        t={t}
        triggers={audioTriggers}
      />
    </div>
  )
}
