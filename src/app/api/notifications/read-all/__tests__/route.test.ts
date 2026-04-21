import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { markAllNotificationsAsRead } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/notifications/read-all', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3004/api/notifications/read-all', {
      method: 'PATCH',
    })
    const res = await PATCH(req)

    expect(res.status).toBe(401)
  })

  it('retorna 200 y el conteo de notificaciones marcadas', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(markAllNotificationsAsRead).mockResolvedValue({ updatedCount: 5 })

    const req = new NextRequest('http://localhost:3004/api/notifications/read-all', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token' },
    })
    const res = await PATCH(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('leidas')
    expect(body.updatedCount).toBe(5)
  })
})
