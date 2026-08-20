/** 그라디언트를 돌려줘야 하는 메서드. 나머지 메서드는 undefined를 낸다. */
const GRADIENT_FACTORIES = new Set(['createLinearGradient', 'createRadialGradient'])

/** 아직 한 번도 set되지 않은 상태에서 읽힐 수 있는 속성의 기본값 */
const DEFAULT_PROPS = new Set([
  'fillStyle', 'strokeStyle', 'lineWidth', 'font', 'globalAlpha',
  'textAlign', 'textBaseline', 'filter', 'lineCap', 'lineJoin',
])

export type FakeContext = {
  ctx: CanvasRenderingContext2D
  calls: string[]
}

export function createFake2dContext(): FakeContext {
  const calls: string[] = []
  const store: Record<string | symbol, unknown> = {}
  const gradient = { addColorStop: () => {} }

  // 인자 '개수'만 기록하면 좌표를 난수로 바꿔도 호출 서명이 같아진다.
  // 그러면 결정성 테스트가 Math.random 회귀를 잡지 못한다. 값까지 남긴다.
  const fmt = (arg: unknown): string => {
    if (typeof arg === 'number') return arg.toFixed(3)
    if (typeof arg === 'string') return arg
    return '·'
  }

  const ctx = new Proxy({} as CanvasRenderingContext2D, {
    get(_target, prop) {
      // set된 값은 무엇이든 그대로 되읽힌다. 허용목록에 의존하면
      // 목록에 없는 속성이 조용히 함수로 읽혀 NaN을 만든다.
      if (prop in store) return store[prop]
      if (typeof prop === 'string' && DEFAULT_PROPS.has(prop)) return ''
      return (...args: unknown[]) => {
        calls.push(`${String(prop)}(${args.map(fmt).join(',')})`)
        return typeof prop === 'string' && GRADIENT_FACTORIES.has(prop) ? gradient : undefined
      }
    },
    set(_target, prop, value: unknown) {
      // 색·알파도 기록한다. 난수로 칠하는 회귀를 잡으려면 필요하다.
      calls.push(`${String(prop)}=${fmt(value)}`)
      store[prop] = value
      return true
    },
  })

  return { ctx, calls }
}

/**
 * jsdom의 HTMLCanvasElement에 2D 컨텍스트 대역을 끼운다.
 *
 * 주의: getContext는 호출할 때마다 **독립된** 대역을 낸다. 마운트된 canvas에서
 * getContext('2d')를 다시 불러 calls를 들여다봐도 비어 있다. 그리기 호출을
 * 검증하려면 createFake2dContext()를 직접 써야 한다.
 */
export function installCanvasStub(): void {
  HTMLCanvasElement.prototype.getContext = function getContext(contextId: string) {
    if (contextId !== '2d') return null
    return createFake2dContext().ctx
  } as unknown as HTMLCanvasElement['getContext']
}
