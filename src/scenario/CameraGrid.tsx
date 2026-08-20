import { CAMERA_IDS, type L1Event, type Scenario } from '@/core/schema'
import CameraPanel, { type CreateFrameSource } from './CameraPanel'

type Props = {
  scenario: Scenario
  t: number
  events: readonly L1Event[]
  createFrameSource?: CreateFrameSource
}

export default function CameraGrid({ scenario, t, events, createFrameSource }: Props) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gridTemplateRows: '1fr 1fr',
        gap: 8,
        height: '100%',
        minHeight: 0,
      }}
    >
      {CAMERA_IDS.map((cameraId) => (
        <CameraPanel
          key={cameraId}
          scenario={scenario}
          cameraId={cameraId}
          t={t}
          createFrameSource={createFrameSource}
          events={events.filter(
            (event) => event.modality === 'video' && event.source === cameraId,
          )}
        />
      ))}
    </div>
  )
}
