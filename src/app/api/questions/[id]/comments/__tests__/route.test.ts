import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { listQuestionComments, createQuestionComment } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(QUESTION_ID)

beforeEach(() => vi.clearAllMocks())

describe('GET /api/questions/[id]/comments', () => {
  it('retorna 200 con la lista de comentarios', async () => {
    vi.mocked(listQuestionComments).mockResolvedValue({
      data: [], total: 0, page: 1, limit: 10, totalPages: 1,
    } as any)

    const req = new NextRequest(`http://localhost:3004/api/questions/${QUESTION_ID}/comments`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(200)
  })

  it('retorna 400 si el UUID es invalido', async () => {
    const req = new NextRequest('http://localhost:3004/api/questions/no-uuid/comments')
    const res = await GET(req, params('no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 404 si la pregunta no existe', async () => {
    vi.mocked(listQuestionComments).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/questions/${QUESTION_ID}/comments`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/questions/[id]/comments', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(`http://localhost:3004/api/questions/${QUESTION_ID}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hola' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el UUID es invalido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3004/api/questions/no-uuid/comments', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hola' }),
    })
    const res = await POST(req, params('no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 201 cuando el comentario se crea exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createQuestionComment).mockResolvedValue({ id: 'c1', content: 'Hola' } as any)

    const req = new NextRequest(`http://localhost:3004/api/questions/${QUESTION_ID}/comments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Buena pregunta' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(201)
  })

  it('retorna 404 si el servicio lanza QUESTION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createQuestionComment).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/questions/${QUESTION_ID}/comments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Buena pregunta' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })
})
