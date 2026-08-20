import { checkIntegrity } from './integrity'
import { type Scenario, scenarioSchema } from './schema'

export type LoadFailure = {
  path: string
  reason: 'schema' | 'integrity'
  issues: string[]
}

export type LoadResult = {
  ok: Scenario[]
  failed: LoadFailure[]
}

/**
 * 시나리오 모듈 맵을 검증해 통과한 것만 낸다.
 * 손상된 시나리오는 배제하되 나머지 데모는 계속 돌아간다.
 */
export function loadScenarios(modules: Record<string, unknown>): LoadResult {
  const ok: Scenario[] = []
  const failed: LoadFailure[] = []

  for (const [path, raw] of Object.entries(modules)) {
    const parsed = scenarioSchema.safeParse(raw)
    if (!parsed.success) {
      failed.push({
        path,
        reason: 'schema',
        issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`),
      })
      continue
    }

    const integrityIssues = checkIntegrity(parsed.data)
    if (integrityIssues.length > 0) {
      failed.push({
        path,
        reason: 'integrity',
        issues: integrityIssues.map((i) => `${i.code}: ${i.message}`),
      })
      continue
    }

    ok.push(parsed.data)
  }

  ok.sort((a, b) => a.id.localeCompare(b.id))
  return { ok, failed }
}

/** Vite의 glob으로 실제 시나리오 디렉터리를 읽는다. */
export function loadBundledScenarios(): LoadResult {
  const modules = import.meta.glob('/scenarios/*.json', { eager: true }) as Record<
    string,
    { default: unknown }
  >
  const unwrapped = Object.fromEntries(
    Object.entries(modules).map(([path, mod]) => [path, mod.default]),
  )
  return loadScenarios(unwrapped)
}
