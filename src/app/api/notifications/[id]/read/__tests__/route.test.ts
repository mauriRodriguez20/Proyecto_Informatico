import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { markNotificationAsRead } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const NOTIF_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(NOTIF_ID)

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/notifications/[id]/read', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3004/api/notifications/${NOTIF_ID}/read`,
      { method: 'PATCH' }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el UUID de la notificacion es invalido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3004/api/notifications/no-uuid/read',
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, params('no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valido')
  })

  it('retorna 404 si la notificacion no existe', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(markNotificationAsRead).mockRejectedValue(new Error('NOTIFICATION_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/notifications/${NOTIF_ID}/read`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 200 cuando la notificacion se marca como leida', async () => {
    const readAt = new Date()
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(markNotificationAsRead).mockResolvedValue({
      notificationId: NOTIF_ID,
      isRead: true,
      readAt,
    })

    const req = new NextRequest(
      `http://localhost:3004/api/notifications/${NOTIF_ID}/read`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('leida')
    expect(body.notification.isRead).toBe(true)
  })
})
