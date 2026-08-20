import { PIN_COLORS, type HomeMarker } from './pins'

type Props = {
  homes: readonly HomeMarker[]
  /** 자동 순환 재개까지 남은 시간. 마지막 구간에서만 값이 온다 */
  countdownMs: number | null
  onPick: (id: string) => void
  dimmed: boolean
}

const label: React.CSSProperties = {
  fontFamily: 'ui-monospace, monospace',
  fontSize: 10,
  letterSpacing: 1.2,
  color: 'var(--muted)',
}

/**
 * 지구본 위에 얹는 관제 계기판.
 *
 * 숫자와 목록이 있어야 "돌아가는 장난감"이 아니라 "지금 무언가를 지켜보는
 * 화면"으로 읽힌다. Cloudflare Radar나 Kaspersky의 지도가 지도만으로 서지
 * 않고 늘 카운터와 최근 이벤트를 곁에 두는 것과 같은 이유다.
 */
export default function WorldHud({ homes, countdownMs, onPick, dimmed }: Props) {
  const critical = homes.filter((h) => h.severity === 'critical')

  return (
    <div
      data-testid="world-hud"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        opacity: dimmed ? 0 : 1,
        transition: 'opacity 500ms ease',
      }}
    >
      <header
        style={{
          position: 'absolute',
          top: 24,
          left: 28,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={label}>MONITORED HOMES</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 14 }}>
          <span
            data-testid="home-count"
            style={{ fontSize: 40, fontWeight: 600, lineHeight: 1 }}
          >
            {homes.length}
          </span>
          <span
            data-testid="critical-count"
            style={{ fontSize: 13, color: 'var(--critical)' }}
          >
            {critical.length} critical
          </span>
        </div>
        <div style={{ ...label, letterSpacing: 0, maxWidth: 260, lineHeight: 1.5 }}>
          위치는 시나리오가 설정한 지역이며 실제 가정을 나타내지 않는다.
        </div>
      </header>

      <ul
        data-testid="home-list"
        style={{
          position: 'absolute',
          right: 28,
          top: 24,
          bottom: 24,
          width: 258,
          margin: 0,
          padding: 0,
          listStyle: 'none',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          overflowY: 'auto',
          pointerEvents: 'auto',
        }}
      >
        {homes.map((home) => (
          <li key={home.id}>
            <button
              type="button"
              data-testid={`home-${home.id}`}
              onClick={() => onPick(home.id)}
              style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '18px 1fr auto',
                alignItems: 'center',
                gap: 10,
                padding: '9px 10px',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 3,
                color: 'var(--text)',
                textAlign: 'left',
                cursor: 'pointer',
                font: 'inherit',
              }}
            >
              {/* 지구본의 배지와 같은 글자를 쓴다. 목록에서 본 것을 지구에서
                  다시 찾을 수 있어야 한다. */}
              <span
                data-testid={`home-icon-${home.id}`}
                aria-hidden
                style={{
                  fontSize: 14,
                  lineHeight: 1,
                  textAlign: 'center',
                  filter: `drop-shadow(0 0 6px #${PIN_COLORS[home.severity]
                    .toString(16)
                    .padStart(6, '0')}66)`,
                }}
              >
                {home.icon ?? '•'}
              </span>
              <span style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {home.title}
              </span>
              <span style={{ ...label, letterSpacing: 0 }}>
                {home.city} · {home.localTimeLabel}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {countdownMs !== null && (
        <div
          data-testid="resume-countdown"
          style={{
            position: 'absolute',
            bottom: 28,
            left: '50%',
            transform: 'translateX(-50%)',
            ...label,
            letterSpacing: 0.4,
            fontSize: 12,
          }}
        >
          {Math.ceil(countdownMs / 1000)}초 뒤 자동 순환을 재개합니다
        </div>
      )}
    </div>
  )
}
