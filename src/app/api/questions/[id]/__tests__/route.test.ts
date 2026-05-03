import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withOptionalAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getQuestionById } from '@/modules/questions/questions.service'
import { withOptionalAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'

const mockQuestion = {
  id: QUESTION_ID,
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  area: 'FRONTEND',
  title: 'Pregunta de prueba sobre React Hooks',
  description: 'Descripción detallada de la pregunta',
  codeBlock: null,
  language: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
  answers: [],
  author: { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', username: 'testuser', avatarUrl: null, role: 'USER' },
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/questions/[id] ──────────────────────────────────────────────────

describe('GET /api/questions/[id]', () => {
  it('retorna 200 con la pregunta cuando existe', async () => {
    vi.mocked(withOptionalAuth).mockResolvedValue({ userId: null })
    vi.mocked(getQuestionById).mockResolvedValue(mockQuestion as any)

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}`)
    const res = await GET(req, params(QUESTION_ID))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.question.id).toBe(QUESTION_ID)
  })

  it('retorna 400 si el id no es un UUID válido', async () => {
    const req = new NextRequest('http://localhost:3003/api/questions/no-es-uuid')
    const res = await GET(req, params('no-es-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valido')
  })

  it('retorna 404 si la pregunta no existe', async () => {
    vi.mocked(withOptionalAuth).mockResolvedValue({ userId: null })
    vi.mocked(getQuestionById).mockResolvedValue(null)

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}`)
    const res = await GET(req, params(QUESTION_ID))

    expect(res.status).toBe(404)
  })

  it('retorna 500 si el servicio lanza error inesperado', async () => {
    vi.mocked(withOptionalAuth).mockResolvedValue({ userId: null })
    vi.mocked(getQuestionById).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest(`http://localhost:3003/api/questions/${QUESTION_ID}`)
    const res = await GET(req, params(QUESTION_ID))

    expect(res.status).toBe(500)
  })
})
