import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { PATCH } from '../route'
import { acceptAnswer } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID   = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const mockAnswer = {
  id: ANSWER_ID,
  questionId: QUESTION_ID,
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  content: 'Contenido de la respuesta aceptada',
  codeBlock: null,
  language: null,
  isAccepted: true,
  voteScore: 5,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const params = (id: string, answerId: string) => ({
  params: Promise.resolve({ id, answerId }),
})

const validParams = params(QUESTION_ID, ANSWER_ID)

beforeEach(() => vi.clearAllMocks())

// ─── PATCH /api/questions/[id]/answers/[answerId]/accept ──────────────────────

describe('PATCH /api/questions/[id]/answers/[answerId]/accept', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accept`,
      { method: 'PATCH' }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son inválidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3003/api/questions/no-uuid/answers/no-uuid/accept',
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('validos')
  })

  it('retorna 404 si el servicio lanza QUESTION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(acceptAnswer).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accept`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 404 si el servicio lanza ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(acceptAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accept`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el servicio lanza FORBIDDEN_ACCEPT_ANSWER', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(acceptAnswer).mockRejectedValue(new Error('FORBIDDEN_ACCEPT_ANSWER'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accept`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando la respuesta se acepta exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(acceptAnswer).mockResolvedValue(mockAnswer as any)

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/accept`,
      { method: 'PATCH', headers: { Authorization: 'Bearer token' } }
    )
    const res = await PATCH(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('aceptada')
    expect(body.answer.isAccepted).toBe(true)
  })
})
