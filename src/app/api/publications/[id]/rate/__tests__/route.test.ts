import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { POST } from '../route'
import { ratePublication } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const PUB_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(PUB_ID)

beforeEach(() => vi.clearAllMocks())

describe('POST /api/publications/[id]/rate', () => {
  it('retorna 401 si no hay token de autenticacion', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      body: JSON.stringify({ rating: 4 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el UUID del parametro es invalido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3004/api/publications/no-es-uuid/rate', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4 }),
    })
    const res = await POST(req, params('no-es-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 400 si el rating es menor a 1', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 0 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 400 si el rating es mayor a 5', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 6 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 400 si el rating no es un numero entero', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 2.7 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 200 con averageRating y totalRatings cuando la calificacion es exitosa', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(ratePublication).mockResolvedValue({
      avgRating: 3.8,
      totalRatings: 12,
    } as any)

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4 }),
    })
    const res = await POST(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.averageRating).toBe(3.8)
    expect(body.totalRatings).toBe(12)
  })

  it('retorna 404 si la publicacion no existe', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(ratePublication).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 4 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el usuario intenta calificar su propia publicacion', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'author-1', errorResponse: null })
    vi.mocked(ratePublication).mockRejectedValue(new Error('SELF_RATING_NOT_ALLOWED'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 5 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 500 si ocurre un error inesperado', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(ratePublication).mockRejectedValue(new Error('DB_CONNECTION_FAILED'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/rate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ rating: 3 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(500)
  })
})
