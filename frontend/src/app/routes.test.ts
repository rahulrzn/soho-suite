import { describe, expect, it } from 'vitest'
import { resolveRoute } from './routes'

describe('resolveRoute', () => {
  it('resolves known workspace routes and preserves the dataset detail id', () => {
    expect(resolveRoute('/overview')).toEqual({ name: 'overview' })
    expect(resolveRoute('/reports')).toEqual({ name: 'reports' })
    expect(resolveRoute('/datasets/42')).toEqual({ name: 'dataset-detail', datasetId: 42 })
  })

  it('resolves invitation acceptance separately from protected workspace pages', () => {
    expect(resolveRoute('/invitations/accept')).toEqual({ name: 'invitation-accept' })
    expect(resolveRoute('/accept-ownership-transfer')).toEqual({ name: 'ownership-accept' })
  })

  it('maps unknown and malformed paths to not-found', () => {
    expect(resolveRoute('/invented')).toEqual({ name: 'not-found' })
    expect(resolveRoute('/datasets/nope')).toEqual({ name: 'not-found' })
  })
})
