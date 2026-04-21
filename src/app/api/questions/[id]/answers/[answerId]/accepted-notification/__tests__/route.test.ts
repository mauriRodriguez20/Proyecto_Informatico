import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createAcceptedAnswerNotification } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID   = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const params = (id: string, answerId: string) => ({
  params: Promise.resolve({ id, answerId }),
})
const validParams = params(QUESTION_ID, ANSWER_ID)

const mockNotification = {
  id: 'notif-1',
  userId: 'author-1',
  type: 'ANSWER_ACCEPTED',
  entityType: 'ANSWER',
  entityId: ANSWER_ID,
  title: 'Respuesta aceptada',
  message: 'Tu respuesta fue marcada como aceptada.',
  isRead: false,
  createdAt: new Date(),
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/questions/[id]/answers/[answerId]/accepted-notification', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST' }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son invalidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3004/api/questions/no-uuid/answers/no-uuid/accepted-notification',
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 404 si el servicio lanza QUESTION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 404 si el servicio lanza ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 400 si el servicio lanza ANSWER_QUESTION_MISMATCH', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockRejectedValue(new Error('ANSWER_QUESTION_MISMATCH'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 403 si el servicio lanza FORBIDDEN_ACCEPT_NOTIFICATION', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockRejectedValue(new Error('FORBIDDEN_ACCEPT_NOTIFICATION'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando la notificacion no se genera (mismo autor)', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockResolvedValue(null)

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('mismo autor')
  })

  it('retorna 201 cuando la notificacion se genera exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAcceptedAnswerNotification).mockResolvedValue(mockNotification as any)

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accepted-notification`,
      { method: 'POST', headers: { Authorization: 'Bearer token' } }
    )
    const res = await POST(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.message).toContain('generada')
    expect(body.notification).toBeDefined()
  })
})
