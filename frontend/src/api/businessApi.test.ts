import { beforeEach, describe, expect, it, vi } from 'vitest'

const { apiRequest } = vi.hoisted(() => ({ apiRequest: vi.fn() }))
vi.mock('./client', () => ({ apiRequest }))

import { deleteBusiness } from './businessApi'

describe('deleteBusiness', () => {
  beforeEach(() => apiRequest.mockReset())

  it('uses the owner-protected business delete endpoint', async () => {
    apiRequest.mockResolvedValue(undefined)
    await deleteBusiness(42)
    expect(apiRequest).toHaveBeenCalledWith('/api/businesses/42', { method: 'DELETE' })
  })
})
