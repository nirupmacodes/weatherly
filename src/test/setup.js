import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => { cleanup(); localStorage.clear() })

class ResizeObserverMock {
  constructor(callback) { this.callback = callback }
  observe(target) { this.callback?.([{ target, contentRect: { width: 640, height: 180 } }]) }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = ResizeObserverMock
