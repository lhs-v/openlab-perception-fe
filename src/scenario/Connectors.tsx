import type { EdgeLine } from './useConnectors'

const STROKE: Record<EdgeLine['layer'], string> = {
  'l1-l2': 'rgba(122, 136, 153, 0.45)',
  'l2-l3': 'rgba(78, 161, 255, 0.6)',
  'l3-l4': 'rgba(255, 90, 78, 0.75)',
}

export default function Connectors({ lines }: { lines: EdgeLine[] }) {
  return (
    <svg
      data-testid="connectors"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {lines.map((line) => {
        // 수평 방향 베지어 — 카드 사이를 부드럽게 잇는다
        const midX = (line.x1 + line.x2) / 2
        return (
          <path
            key={`${line.from}->${line.to}`}
            data-edge={`${line.from}->${line.to}`}
            d={`M${line.x1},${line.y1} C${midX},${line.y1} ${midX},${line.y2} ${line.x2},${line.y2}`}
            fill="none"
            stroke={STROKE[line.layer]}
            strokeWidth={line.layer === 'l3-l4' ? 2 : 1.25}
          />
        )
      })}
    </svg>
  )
}
