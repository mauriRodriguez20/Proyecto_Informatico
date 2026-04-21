import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { listMyNotifications } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

beforeEach(() => vi.clearAllMocks())

describe('GET /api/notifications', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3004/api/notifications')
    const res = await GET(req)

    expect(res.status).toBe(401)
  })

  it('retorna 200 con la lista de notificaciones', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(listMyNotifications).mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 1,
      unreadCount: 0,
      hasUnread: false,
      emptyMessage: 'No tienes notificaciones nuevas.',
    } as any)

    const req = new NextRequest('http://localhost:3004/api/notifications', {
      headers: { Authorization: 'Bearer token' },
    })
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total).toBe(0)
  })

  it('retorna 500 en error inesperado', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(listMyNotifications).mockRejectedValue(new Error('DB_ERROR'))

    const req = new NextRequest('http://localhost:3004/api/notifications', {
      headers: { Authorization: 'Bearer token' },
    })
    const res = await GET(req)

    expect(res.status).toBe(500)
  })
})
