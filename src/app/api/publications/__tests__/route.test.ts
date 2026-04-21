import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/publications/publications.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { listPublications, createPublication } from '@/modules/publications/publications.service'
import { withAuth } from '@/lib/api-helpers'

const mockPublication = {
  id: 'pub-1',
  authorId: 'user-1',
  type: 'CODE_SNIPPET',
  area: 'FRONTEND',
  title: 'Publicación de prueba larga',
  description: 'Descripción de prueba',
  content: 'Descripción de prueba',
  errorCode: null,
  solution: null,
  codeBlock: 'const x = 1',
  language: 'javascript',
  avgRating: 0,
  totalRatings: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  tags: [],
}

beforeEach(() => vi.clearAllMocks())

// ─── GET /api/publications ────────────────────────────────────────────────────

describe('GET /api/publications', () => {
  it('retorna 200 con la lista de publicaciones', async () => {
    vi.mocked(listPublications).mockResolvedValue({
      data: [mockPublication as any],
      total: 1,
      page: 1,
      limit: 10,
      totalPages: 1,
      summary: { avgRating: 0, totalRatings: 0 },
    })

    const req = new NextRequest('http://localhost:3002/api/publications')
    const res = await GET(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.total).toBe(1)
    expect(body.data).toHaveLength(1)
  })

  it('retorna 400 si los query params son inválidos', async () => {
    const req = new NextRequest('http://localhost:3002/api/publications?limit=999')
    const res = await GET(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 500 si el servicio lanza error inesperado', async () => {
    vi.mocked(listPublications).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost:3002/api/publications')
    const res = await GET(req)

    expect(res.status).toBe(500)
  })
})

// ─── POST /api/publications ───────────────────────────────────────────────────

describe('POST /api/publications', () => {
  it('retorna 401 si no hay token de autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest('http://localhost:3002/api/publications', {
      method: 'POST',
      body: JSON.stringify({}),
    })
    const res = await POST(req)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el body no pasa la validación Zod', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })

    const req = new NextRequest('http://localhost:3002/api/publications', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'corto' }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('invalidos')
  })

  it('retorna 201 cuando la publicación se crea exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(createPublication).mockResolvedValue(mockPublication as any)

    const req = new NextRequest('http://localhost:3002/api/publications', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CODE_SNIPPET',
        area: 'FRONTEND',
        title: 'Publicación de prueba con título válido',
        description: 'Descripción larga suficiente para el test',
        codeBlock: 'const x = 1',
        technologyIds: [],
      }),
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.message).toContain('creada')
    expect(body.publication.id).toBe('pub-1')
  })

  it('retorna 502 si lanza TECHNOLOGY_UPSERT_FAILED', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(createPublication).mockRejectedValue(new Error('TECHNOLOGY_UPSERT_FAILED'))

    const req = new NextRequest('http://localhost:3002/api/publications', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CODE_SNIPPET',
        area: 'FRONTEND',
        title: 'Publicación de prueba con título válido',
        description: 'Descripción larga suficiente para el test',
        technologyNames: ['FrameworkDesconocido'],
        technologyIds: [],
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(502)
  })

  it('retorna 400 si el servicio lanza TOO_MANY_TAGS', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1',
      errorResponse: null,
    })
    vi.mocked(createPublication).mockRejectedValue(new Error('TOO_MANY_TAGS'))

    const req = new NextRequest('http://localhost:3002/api/publications', {
      method: 'POST',
      headers: { Authorization: 'Bearer token-abc', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'CODE_SNIPPET',
        area: 'FRONTEND',
        title: 'Publicación de prueba con título válido',
        description: 'Descripción larga suficiente para el test',
        technologyIds: ['t1', 't2'],
        technologyNames: ['n1'],
      }),
    })
    const res = await POST(req)

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('5 etiquetas')
  })
})

//demo pipeline ms02