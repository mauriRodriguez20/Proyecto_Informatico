import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'
import { withAuth } from '@/lib/api-helpers'

describe('POST /api/users/[id]/rate', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 401 sin autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null, authUser: null, bearerToken: null,
      errorResponse: new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401, headers: { 'content-type': 'application/json' },
      }) as any,
    })

    const req = new NextRequest('http://localhost/api/users/target-1/rate', {
      method: 'POST', body: JSON.stringify({ score: 5 }),
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'target-1' }) })
    expect(res.status).toBe(401)
  })

  it('responde 400 si el score es inválido (mayor a 5)', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'rater-1', authUser: { id: 'rater-1', email: 'r@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })

    const req = new NextRequest('http://localhost/api/users/target-1/rate', {
      method: 'POST', body: JSON.stringify({ score: 10 }), // max es 5
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'target-1' }) })
    expect(res.status).toBe(400)
  })

  it('responde 400 si el score es inválido (menor a 1)', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'rater-1', authUser: { id: 'rater-1', email: 'r@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })

    const req = new NextRequest('http://localhost/api/users/target-1/rate', {
      method: 'POST', body: JSON.stringify({ score: 0 }), // min es 1
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'target-1' }) })
    expect(res.status).toBe(400)
  })

  it('responde 200 con avgRating y totalRatings al calificar exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'rater-1', authUser: { id: 'rater-1', email: 'r@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.rateUser).mockResolvedValue({ avgRating: 4.2, totalRatings: 5 })

    const req = new NextRequest('http://localhost/api/users/target-1/rate', {
      method: 'POST', body: JSON.stringify({ score: 5 }),
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'target-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.avgRating).toBe(4.2)
  })

  it('responde 403 si el usuario intenta calificarse a sí mismo', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'same-id', authUser: { id: 'same-id', email: 'u@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.rateUser).mockRejectedValue(new Error('SELF_RATING_NOT_ALLOWED'))

    const req = new NextRequest('http://localhost/api/users/same-id/rate', {
      method: 'POST', body: JSON.stringify({ score: 5 }),
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req, { params: Promise.resolve({ id: 'same-id' }) })
    expect(res.status).toBe(403)
  })
})
