import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { listQuestions, createQuestion } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const TECH_ID = '11111111-1111-1111-1111-111111111111'

const mockQuestion = {
  id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  area: 'FRONTEND',
  title: 'Pregunta de prueba sobre React Hooks',
  description: 'Descripción detallada de la pregunta de prueba',
  codeBlock: null,
  language: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  answerCount: 0,
  acceptedAnswerId: null,
  author: null,
}

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/questions ───────────────────────────────────────────────────────

describe('GET /api/questions', () => {
  it('retorna 200 con la lista de preguntas', async () => {
    vi.mocked(listQuestions).mockResolvedValue({
      data: [mockQuestion as any],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
    })

    const req = new NextRequest('http://localhost:3003/api/questions')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.data).toHaveLength(1)
  })

  it('retorna 400 si los query params son inválidos', async () => {
    const req = new NextRequest('http://localhost:3003/api/questions?page=abc')
    const res = await GET(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 500 si el servicio lanza error inesperado', async () => {
    vi.mocked(listQuestions).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost:3003/api/questions')
    const res = await GET(req)

    expect(res.status).toBe(500)
  })
})

// ─── POST /api/questions ──────────────────────────────────────────────────────

describe('POST /api/questions', () => {
  it('retorna 401 si no hay token de autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3003/api/questions', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el body no pasa la validación Zod', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3003/api/questions', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'corto' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 201 cuando la pregunta se crea exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createQuestion).mockResolvedValue(mockQuestion as any)

    const req = new NextRequest('http://localhost:3003/api/questions', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: 'FRONTEND',
        title: 'Pregunta de prueba sobre React Hooks',
        description: 'Descripción detallada de la pregunta de prueba',
        technologyIds: [TECH_ID],
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.message).toContain('creada')
    expect(body.question.id).toBe(mockQuestion.id)
  })

  it('retorna 400 si el servicio lanza INVALID_TECHNOLOGY_IDS', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createQuestion).mockRejectedValue(new Error('INVALID_TECHNOLOGY_IDS'))

    const req = new NextRequest('http://localhost:3003/api/questions', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: 'FRONTEND',
        title: 'Pregunta de prueba sobre React Hooks',
        description: 'Descripción detallada de la pregunta de prueba',
        technologyIds: [TECH_ID],
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('etiquetas')
  })

  it('retorna 500 si el servicio lanza error inesperado', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createQuestion).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost:3003/api/questions', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        area: 'FRONTEND',
        title: 'Pregunta de prueba sobre React Hooks',
        description: 'Descripción detallada de la pregunta de prueba',
        technologyIds: [TECH_ID],
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(500)
  })
})

// demo pipeline ms 03 
