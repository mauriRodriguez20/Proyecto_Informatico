import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/technologies/technologies.service')

import { GET } from '../route'
import * as techService from '@/modules/technologies/technologies.service'

describe('GET /api/technologies/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 200 con la tecnología cuando existe', async () => {
    vi.mocked(techService.getTechnologyById).mockResolvedValue({
      id: 'tech-1', name: 'TypeScript', slug: 'typescript',
    })

    const req = new NextRequest('http://localhost/api/technologies/tech-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'tech-1' }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.technology.name).toBe('TypeScript')
  })

  it('responde 404 si la tecnología no existe', async () => {
    vi.mocked(techService.getTechnologyById).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/technologies/no-existe')
    const res = await GET(req, { params: Promise.resolve({ id: 'no-existe' }) })
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('responde 500 si getTechnologyById lanza un error', async () => {
    vi.mocked(techService.getTechnologyById).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/technologies/tech-1')
    const res = await GET(req, { params: Promise.resolve({ id: 'tech-1' }) })
    expect(res.status).toBe(500)
  })
})
