import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')

import { NextRequest } from 'next/server'
import { GET } from '../route'
import { getUserPublicStats } from '@/modules/interactions/interactions.service'

const USER_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const params = (id: string) => ({ params: Promise.resolve({ id }) })
const validParams = params(USER_ID)

const mockStats = {
  userId: USER_ID,
  publicationsCount: 10,
  questionsCount: 5,
  answersCount: 8,
  avgRating: 4.2,
  totalRatings: 15,
  label: 'Calificado',
}

beforeEach(() => vi.clearAllMocks())

describe('GET /api/users/[id]/stats', () => {
  it('retorna 200 con las estadisticas del usuario', async () => {
    vi.mocked(getUserPublicStats).mockResolvedValue(mockStats as any)

    const req = new NextRequest(`http://localhost:3004/api/users/${USER_ID}/stats`)
    const res = await GET(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.stats.userId).toBe(USER_ID)
    expect(body.stats.publicationsCount).toBe(10)
  })

  it('retorna 400 si el UUID del usuario es invalido', async () => {
    const req = new NextRequest('http://localhost:3004/api/users/no-uuid/stats')
    const res = await GET(req, params('no-uuid'))

    expect(res.status).toBe(400)
    expect((await res.json()).error).toContain('valido')
  })

  it('retorna 404 si el usuario no existe', async () => {
    vi.mocked(getUserPublicStats).mockRejectedValue(new Error('USER_NOT_FOUND'))

    const req = new NextRequest(`http://localhost:3004/api/users/${USER_ID}/stats`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 500 en error inesperado', async () => {
    vi.mocked(getUserPublicStats).mockRejectedValue(new Error('DB_ERROR'))

    const req = new NextRequest(`http://localhost:3004/api/users/${USER_ID}/stats`)
    const res = await GET(req, validParams)

    expect(res.status).toBe(500)
  })
})
