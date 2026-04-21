import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { listPublicationComments, createPublicationComment } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const PUB_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(PUB_ID)

beforeEach(() => vi.clearAllMocks())

describe('GET /api/publications/[id]/comments', () => {
  it('retorna 200 con lista de comentarios', async () => {
    vi.mocked(listPublicationComments).mockResolvedValue({
      data: [], total: 0, page: 1, limit: 10, totalPages: 1,
    } as any)

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(200)
  })

  it('retorna 400 si el UUID de la publicacion es invalido', async () => {
    const req = new NextRequest('http://localhost:3004/api/publications/no-uuid/comments')
    const res = await GET(req, params('no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valido')
  })

  it('retorna 404 si el servicio lanza PUBLICATION_NOT_FOUND', async () => {
    vi.mocked(listPublicationComments).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 500 en error inesperado', async () => {
    vi.mocked(listPublicationComments).mockRejectedValue(new Error('DB_ERROR'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(500)
  })
})

describe('POST /api/publications/[id]/comments', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content: 'Hola' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el UUID es invalido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3004/api/publications/no-uuid/comments', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hola' }),
    })
    const res = await POST(req, params('no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 400 si el body no pasa Zod (content vacio)', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: '' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 201 cuando el comentario se crea exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createPublicationComment).mockResolvedValue({ id: 'c1', content: 'Hola mundo' } as any)

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hola mundo' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(201)
  })

  it('retorna 404 si el servicio lanza PUBLICATION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(createPublicationComment).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/comments`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hola mundo' }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })
})
