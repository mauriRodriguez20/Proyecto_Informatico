import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '../route'
import { updateAnswer, deleteAnswer } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID   = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const mockAnswer = {
  id: ANSWER_ID,
  questionId: QUESTION_ID,
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  content: 'Contenido actualizado de la respuesta',
  codeBlock: null,
  language: null,
  isAccepted: false,
  voteScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const params = (id: string, answerId: string) => ({
  params: Promise.resolve({ id, answerId }),
})

const validParams = params(QUESTION_ID, ANSWER_ID)

beforeEach(() => vi.clearAllMocks())

// ─── PATCH /api/questions/[id]/answers/[answerId] ─────────────────────────────

describe('PATCH /api/questions/[id]/answers/[answerId]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'PATCH', body: JSON.stringify({}) }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son inválidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3003/api/questions/no-uuid/answers/no-uuid',
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'algo' }),
      }
    )
    const res = await PATCH(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('validos')
  })

  it('retorna 404 si el servicio lanza ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Contenido de actualización válido' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el servicio lanza FORBIDDEN_ANSWER_EDIT', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('FORBIDDEN_ANSWER_EDIT'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Contenido de actualización válido' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 400 si el servicio lanza INVALID_LANGUAGE_WITHOUT_CODE', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('INVALID_LANGUAGE_WITHOUT_CODE'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Contenido de actualización válido' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('codigo')
  })

  it('retorna 200 cuando la actualización es exitosa', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockResolvedValue(mockAnswer as any)

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Contenido actualizado de la respuesta' }),
      }
    )
    const res = await PATCH(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('actualizada')
    expect(body.answer.id).toBe(ANSWER_ID)
  })
})

// ─── DELETE /api/questions/[id]/answers/[answerId] ────────────────────────────

describe('DELETE /api/questions/[id]/answers/[answerId]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 403 si el servicio lanza FORBIDDEN_ANSWER_DELETE', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(deleteAnswer).mockRejectedValue(new Error('FORBIDDEN_ANSWER_DELETE'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 409 si el servicio lanza ANSWER_IS_ACCEPTED', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockRejectedValue(new Error('ANSWER_IS_ACCEPTED'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(409)
  })

  it('retorna 404 si el servicio lanza ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 200 cuando la eliminación es exitosa', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockResolvedValue(undefined)

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('eliminada')
  })
})
