import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { createAnswer } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID   = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const mockAnswer = {
  id: ANSWER_ID,
  questionId: QUESTION_ID,
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  content: 'Contenido de la respuesta de prueba',
  codeBlock: null,
  language: null,
  isAccepted: false,
  voteScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => vi.clearAllMocks())

// ─── POST /api/questions/[id]/answers ─────────────────────────────────────────

describe('POST /api/questions/[id]/answers', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}/answers`, {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req, params(QUESTION_ID))

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el id de la pregunta no es un UUID válido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3003/api/questions/no-es-uuid/answers', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Respuesta válida' }),
    })
    const res = await POST(req, params('no-es-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valido')
  })

  it('retorna 400 si el body no pasa la validación Zod', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}/answers`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    const res = await POST(req, params(QUESTION_ID))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 201 cuando la respuesta se crea exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAnswer).mockResolvedValue(mockAnswer as any)

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}/answers`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Contenido de la respuesta de prueba' }),
    })
    const res = await POST(req, params(QUESTION_ID))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.message).toContain('publicada')
    expect(body.answer.id).toBe(ANSWER_ID)
  })

  it('retorna 404 si el servicio lanza QUESTION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createAnswer).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}/answers`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Contenido de la respuesta de prueba' }),
    })
    const res = await POST(req, params(QUESTION_ID))

    expect(res.status).toBe(404)
  })
})
