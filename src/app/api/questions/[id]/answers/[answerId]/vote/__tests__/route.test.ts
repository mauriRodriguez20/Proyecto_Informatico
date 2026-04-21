import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { voteAnswer } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID   = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const params = (id: string, answerId: string) => ({
  params: Promise.resolve({ id, answerId }),
})

const validParams = params(QUESTION_ID, ANSWER_ID)

beforeEach(() => vi.clearAllMocks())

// ─── POST /api/questions/[id]/answers/[answerId]/vote ─────────────────────────

describe('POST /api/questions/[id]/answers/[answerId]/vote', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/vote`,
      { method: 'POST', body: JSON.stringify({ value: 1 }) }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son inválidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3003/api/questions/no-uuid/answers/no-uuid/vote',
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }
    )
    const res = await POST(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('validos')
  })

  it('retorna 400 si el body no pasa la validación Zod', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/vote`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 99 }),
      }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 404 si el servicio lanza ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(voteAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/vote`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el servicio lanza SELF_VOTE_NOT_ALLOWED', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(voteAnswer).mockRejectedValue(new Error('SELF_VOTE_NOT_ALLOWED'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/vote`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }
    )
    const res = await POST(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando el voto se registra exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(voteAnswer).mockResolvedValue({ voteScore: 3 })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}/vote`,
      {
        method: 'POST',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: 1 }),
      }
    )
    const res = await POST(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('registrado')
    expect(body.voteScore).toBe(3)
  })
})
