import { describe, expect, it } from 'vitest'
import { RequestSequence } from './requestSequence'

describe('RequestSequence', () => {
  it('allows only the latest overlapping load to commit its result', () => {
    const requests = new RequestSequence()
    const older = requests.next()
    const latest = requests.next()

    expect(requests.isCurrent(latest)).toBe(true)
    expect(requests.isCurrent(older)).toBe(false)
  })

  it('invalidates pending loads when a screen stops displaying them', () => {
    const requests = new RequestSequence()
    const pending = requests.next()

    requests.next()

    expect(requests.isCurrent(pending)).toBe(false)
  })
})
