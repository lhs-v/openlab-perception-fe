import type { Scenario } from './schema'

export type IntegrityCode =
  | 'dangling_ref'
  | 'duplicate_id'
  | 'causality_violation'
  | 't_out_of_range'
  | 'orphan_l1'

export type IntegrityIssue = {
  code: IntegrityCode
  message: string
}

type Node = { id: string; t: number; refs?: string[] }

export function checkIntegrity(scenario: Scenario): IntegrityIssue[] {
  const issues: IntegrityIssue[] = []
  const { l1, l2, l3, l4 } = scenario.reasoning

  const all: Node[] = [...l1, ...l2, ...l3, l4]

  // 중복 id
  const seen = new Set<string>()
  for (const node of all) {
    if (seen.has(node.id)) {
      issues.push({ code: 'duplicate_id', message: `중복된 id: ${node.id}` })
    }
    seen.add(node.id)
  }

  // t 범위
  for (const node of all) {
    if (node.t > scenario.durationMs) {
      issues.push({
        code: 't_out_of_range',
        message: `${node.id}의 t(${node.t})가 durationMs(${scenario.durationMs})를 넘음`,
      })
    }
  }

  // 참조 무결성 + 인과 순서
  const checkRefs = (referrers: Node[], targets: Node[], layer: string) => {
    const byId = new Map(targets.map((n) => [n.id, n]))
    for (const ref of referrers) {
      for (const targetId of ref.refs ?? []) {
        const target = byId.get(targetId)
        if (!target) {
          issues.push({
            code: 'dangling_ref',
            message: `${layer} ${ref.id}가 존재하지 않는 ${targetId}를 참조함`,
          })
          continue
        }
        if (target.t > ref.t) {
          issues.push({
            code: 'causality_violation',
            message: `${layer} ${ref.id}(t=${ref.t})가 더 늦은 ${targetId}(t=${target.t})를 참조함`,
          })
        }
      }
    }
  }

  checkRefs(l2, l1, 'L2')
  checkRefs(l3, l2, 'L3')
  checkRefs([l4], l3, 'L4')

  // 고아 L1 — 마커가 뜨지만 어떤 서술로도 이어지지 않음
  const referencedByL2 = new Set(l2.flatMap((d) => d.refs))
  for (const event of l1) {
    if (!referencedByL2.has(event.id)) {
      issues.push({
        code: 'orphan_l1',
        message: `L1 ${event.id}를 참조하는 L2가 없음`,
      })
    }
  }

  return issues
}
