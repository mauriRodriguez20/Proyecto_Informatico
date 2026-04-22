import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { GET, POST } from '../route'
import { getPublicationRatingSummary, ratePublication } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const PUB_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(PUB_ID)

const mockSummary = {
  targetType: 'PUBLICATION',
  targetId: PUB_ID,
  targetAuthorId: 'author-1',
  avgRating: 4.2,
  totalRatings: 10,
  myScore: null,
  label: 'Calificado',
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/publications/[id]/ratings', () => {
  it('retorna 200 con el resumen de calificaciones', async () => {
    vi.mocked(getPublicationRatingSummary).mockResolvedValue(mockSummary as any)

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`)
    const res = await GET(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.rating.avgRating).toBe(4.2)
  })

  it('retorna 400 si el UUID es invalido', async () => {
    const req = new NextRequest('http://localhost:3004/api/publications/no-uuid/ratings')
    const res = await GET(req, params('no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 404 si el servicio lanza PUBLICATION_NOT_FOUND', async () => {
    vi.mocked(getPublicationRatingSummary).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(404)
  })
})

describe('POST /api/publications/[id]/ratings', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`, {
      method: 'POST',
      body: JSON.stringify({ score: 4 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si el UUID es invalido', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest('http://localhost:3004/api/publications/no-uuid/ratings', {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
    })
    const res = await POST(req, params('no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 400 si el score es invalido (fuera de rango)', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 10 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(400)
  })

  it('retorna 200 cuando la calificacion se registra exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(ratePublication).mockResolvedValue({ ...mockSummary, myScore: 4, userReputation: { userId: 'author-1', avgRating: 4, totalRatings: 10 } } as any)

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
    })
    const res = await POST(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('registrada')
  })

  it('retorna 404 si el servicio lanza PUBLICATION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(ratePublication).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 4 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el servicio lanza SELF_RATING_NOT_ALLOWED', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'author-1', errorResponse: null })
    vi.mocked(ratePublication).mockRejectedValue(new Error('SELF_RATING_NOT_ALLOWED'))

    const req = new NextRequest(`http://localhost:3004/api/publications/${PUB_ID}/ratings`, {
      method: 'POST',
      headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: 5 }),
    })
    const res = await POST(req, validParams)

    expect(res.status).toBe(403)
  })
})


// demo pipeline ms 04