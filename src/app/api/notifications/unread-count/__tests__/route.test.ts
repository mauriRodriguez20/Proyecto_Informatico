import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getMyUnreadNotificationsCount } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/notifications/unread-count', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3004/api/notifications/unread-count')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('retorna 200 con el conteo de no leidas', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(getMyUnreadNotificationsCount).mockResolvedValue({ unreadCount: 3 })

    const req = new NextRequest('http://localhost:3004/api/notifications/unread-count', {
      headers: { Authorization: 'Bearer token' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.unreadCount).toBe(3)
  })
})
