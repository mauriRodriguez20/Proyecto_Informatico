import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/publications/publications.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, PATCH, DELETE } from '../route'
import {
  getPublicationById,
  updatePublication,
  deletePublication,
} from '@/modules/publications/publications.service'
import { withAuth } from '@/lib/api-helpers'

const mockPublication = {
  id: 'pub-1',
  authorId: 'user-1',
  type: 'CODE_SNIPPET',
  area: 'FRONTEND',
  title: 'Publicación de prueba',
  description: 'Descripción de prueba',
  content: 'Descripción de prueba',
  errorCode: null,
  solution: null,
  codeBlock: 'const x = 1',
  language: 'javascript',
  avgRating: 0,
  totalRatings: 0,
  author: { id: 'user-1', username: 'testuser', name: 'Test User', avatarUrl: null, role: 'USER' },
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
}

const authParams = { params: Promise.resolve({ id: 'pub-1' }) }

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/publications/[id] ───────────────────────────────────────────────

describe('GET /api/publications/[id]', () => {
  it('retorna 200 con la publicación cuando existe', async () => {
    vi.mocked(getPublicationById).mockResolvedValue(mockPublication as any)

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1')
    const res = await GET(req, authParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.publication.id).toBe('pub-1')
  })

  it('retorna 404 si la publicación no existe', async () => {
    vi.mocked(getPublicationById).mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3002/api/publications/no-existe')
    const res = await GET(req, { params: Promise.resolve({ id: 'no-existe' }) })

    expect(res.status).toBe(404)
  })

  it('retorna 500 si el servicio lanza error inesperado', async () => {
    vi.mocked(getPublicationById).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1')
    const res = await GET(req, authParams)

    expect(res.status).toBe(500)
  })
})

// ─── PATCH /api/publications/[id] ────────────────────────────────────────────

describe('PATCH /api/publications/[id]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    const res = await PATCH(req, authParams)

    expect(res.status).toBe(401)
  })

  it('retorna 404 si la publicación no existe', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(getPublicationById).mockResolvedValue(null)

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuevo título suficientemente largo' }),
    })
    const res = await PATCH(req, authParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el usuario no es el autor', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'otro-user',
      errorResponse: null,
    })
    vi.mocked(getPublicationById).mockResolvedValue(mockPublication as any)

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Nuevo título' }),
    })
    const res = await PATCH(req, authParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando la actualización es exitosa', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(getPublicationById).mockResolvedValue(mockPublication as any)
    vi.mocked(updatePublication).mockResolvedValue({
      ...mockPublication,
      title: 'Título actualizado correctamente',
    } as any)

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'PATCH',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Título actualizado correctamente' }),
    })
    const res = await PATCH(req, authParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.publication.title).toBe('Título actualizado correctamente')
  })
})

// ─── DELETE /api/publications/[id] ───────────────────────────────────────────

describe('DELETE /api/publications/[id]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'DELETE',
    })
    const res = await DELETE(req, authParams)

    expect(res.status).toBe(401)
  })

  it('retorna 403 si el usuario no es el autor', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'otro-user',
      errorResponse: null,
    })
    vi.mocked(getPublicationById).mockResolvedValue(mockPublication as any)

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token-abc' },
    })
    const res = await DELETE(req, authParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando la eliminación es exitosa', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(getPublicationById).mockResolvedValue(mockPublication as any)
    vi.mocked(deletePublication).mockResolvedValue()

    const req = new NextRequest('http://localhost:3002/api/publications/pub-1', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer token-abc' },
    })
    const res = await DELETE(req, authParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('eliminada')
  })
})
