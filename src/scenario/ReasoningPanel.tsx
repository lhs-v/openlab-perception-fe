import type { ReasoningSlice } from '@/core/reasoning-source'
import type { Phase } from '@/core/phases'

const CARD: React.CSSProperties = {
  border: '1px solid var(--line)',
  borderRadius: 4,
  padding: '8px 10px',
  background: 'var(--panel)',
  fontSize: 13,
  lineHeight: 1.5,
}

function LayerHeading({ label, count }: { label: string; count: number }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontFamily: 'ui-monospace, monospace',
        fontSize: 11,
        color: 'var(--muted)',
        letterSpacing: 0.5,
      }}
    >
      <span>{label}</span>
      <span>{count}</span>
    </div>
  )
}

export default function ReasoningPanel({
  slice,
  phase,
}: {
  slice: ReasoningSlice
  phase: Phase
}) {
  const hasAnything = slice.l2.length > 0 || slice.l3.length > 0 || slice.l4

  if (!hasAnything) {
    return (
      <div data-testid="reasoning-empty" style={{ color: 'var(--muted)', fontSize: 13 }}>
        신호 수집 중…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minHeight: 0 }}>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <LayerHeading label="L2 · DESCRIPTION" count={slice.l2.length} />
        {slice.l2.map((desc) => (
          <div key={desc.id} data-node-id={desc.id} style={CARD}>
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: 10,
                color: 'var(--muted)',
                marginBottom: 2,
              }}
            >
              {desc.modality.toUpperCase()} · {desc.source}
            </div>
            {desc.text}
          </div>
        ))}
      </section>

      {slice.l3.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <LayerHeading label="L3 · COMPOSITE CONTEXT" count={slice.l3.length} />
          {slice.l3.map((context) => (
            <div
              key={context.id}
              data-node-id={context.id}
              style={{
                ...CARD,
                borderColor: 'rgba(78, 161, 255, 0.55)',
                background: 'rgba(78, 161, 255, 0.07)',
                fontSize: phase === 'observe' ? 13 : 14,
              }}
            >
              {context.text}
              {context.tags && context.tags.length > 0 && (
                <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {context.tags.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        fontFamily: 'ui-monospace, monospace',
                        fontSize: 10,
                        color: 'var(--accent)',
                        border: '1px solid rgba(78,161,255,0.4)',
                        borderRadius: 2,
                        padding: '1px 5px',
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {slice.l4 && (
        <section
          data-node-id={slice.l4.id}
          style={{ display: 'flex', flexDirection: 'column', gap: 8 }}
        >
          <LayerHeading label="L4 · INTENT" count={1} />
          <div
            data-testid="verdict"
            style={{
              ...CARD,
              borderColor: slice.l4.intervene ? 'var(--critical)' : 'var(--ok)',
              background: slice.l4.intervene
                ? 'rgba(255, 90, 78, 0.1)'
                : 'rgba(67, 209, 160, 0.08)',
            }}
          >
            <div
              style={{
                fontFamily: 'ui-monospace, monospace',
                fontSize: phase === 'verdict' ? 22 : 15,
                fontWeight: 700,
                letterSpacing: 1.5,
                color: slice.l4.intervene ? 'var(--critical)' : 'var(--ok)',
                transition: 'font-size 400ms ease',
              }}
            >
              {slice.l4.intervene ? 'INTERVENE' : 'OBSERVE'}
            </div>
            <p style={{ margin: '8px 0 0' }}>{slice.l4.rationale}</p>
            {slice.l4.actions && slice.l4.actions.length > 0 && (
              <ul style={{ margin: '10px 0 0', paddingLeft: 18 }}>
                {slice.l4.actions.map((action) => (
                  <li key={action} style={{ marginBottom: 2 }}>
                    {action}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
