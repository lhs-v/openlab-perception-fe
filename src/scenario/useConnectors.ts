import { useCallback, useEffect, useState } from 'react'
import type { ReasoningSlice } from '@/core/reasoning-source'

export type EdgeLayer = 'l1-l2' | 'l2-l3' | 'l3-l4'

export type Edge = {
  from: string
  to: string
  layer: EdgeLayer
}

export type EdgeLine = Edge & {
  x1: number
  y1: number
  x2: number
  y2: number
}

/** refs를 따라 간선을 만든다. 슬라이스에 없는 노드로 향하는 간선은 버린다. */
export function computeEdges(slice: ReasoningSlice): Edge[] {
  const present = new Set<string>()
  for (const event of slice.l1) present.add(event.id)
  for (const desc of slice.l2) present.add(desc.id)
  for (const context of slice.l3) present.add(context.id)
  if (slice.l4) present.add(slice.l4.id)

  const edges: Edge[] = []
  const push = (from: string, to: string, layer: EdgeLayer) => {
    if (present.has(from) && present.has(to)) edges.push({ from, to, layer })
  }

  for (const desc of slice.l2) {
    for (const ref of desc.refs) push(ref, desc.id, 'l1-l2')
  }
  for (const context of slice.l3) {
    for (const ref of context.refs) push(ref, context.id, 'l2-l3')
  }
  if (slice.l4) {
    for (const ref of slice.l4.refs) push(ref, slice.l4.id, 'l3-l4')
  }

  return edges
}

/**
 * 간선을 화면 좌표로 바꾼다. 앵커는 `data-node-id` 속성으로 찾는다.
 *
 * `revision`은 레이아웃이 움직일 수 있는 매 시점마다 바뀌는 값을 넣는다.
 * 단계 전환은 무대 **안쪽** grid-template-columns만 애니메이션하므로 바깥
 * 컨테이너의 ResizeObserver가 발화하지 않는다. 그것에만 기대면 전환 이후
 * 선이 앵커에서 100px 넘게 떨어진 채 영영 돌아오지 않는다.
 */
export function useEdgeLines(
  containerRef: React.RefObject<HTMLElement | null>,
  edges: Edge[],
  revision: number,
): EdgeLine[] {
  const [lines, setLines] = useState<EdgeLine[]>([])

  const measure = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      setLines([])
      return
    }
    const base = container.getBoundingClientRect()
    const next: EdgeLine[] = []

    for (const edge of edges) {
      const fromEl = container.querySelector(`[data-node-id="${edge.from}"]`)
      const toEl = container.querySelector(`[data-node-id="${edge.to}"]`)
      if (!fromEl || !toEl) continue
      const a = fromEl.getBoundingClientRect()
      const b = toEl.getBoundingClientRect()
      next.push({
        ...edge,
        x1: a.left + a.width / 2 - base.left,
        y1: a.top + a.height / 2 - base.top,
        x2: b.left + b.width / 2 - base.left,
        y2: b.top + b.height / 2 - base.top,
      })
    }
    setLines(next)
    // revision이 바뀌면 다시 재도록 의존성에 포함한다
  }, [containerRef, edges, revision])

  useEffect(() => {
    measure()
    const container = containerRef.current
    if (!container || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [measure, containerRef])

  return lines
}
