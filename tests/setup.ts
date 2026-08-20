import { afterEach } from 'vitest'
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { installCanvasStub } from './canvas-stub'

installCanvasStub()

// @testing-library/react auto-registers afterEach(cleanup) at import time,
// but only if `afterEach` is already a global — this project doesn't set
// vitest's `test.globals: true`, so that auto-registration silently never
// fires and rendered trees leak across tests. Wire it explicitly.
afterEach(cleanup)
