import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/technologies/technologies.service')

import { GET, POST } from '../route'
import * as techService from '@/modules/technologies/technologies.service'

describe('GET /api/technologies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 200 con lista de tecnologías', async () => {
    vi.mocked(techService.listTechnologies).mockResolvedValue({
      data: [{ id: 'tech-1', name: 'TypeScript', slug: 'typescript' }],
      total: 1,
      limit: 20,
    })

    const req = new NextRequest('http://localhost/api/technologies')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].name).toBe('TypeScript')
  })

  it('responde 200 con búsqueda por search param', async () => {
    vi.mocked(techService.listTechnologies).mockResolvedValue({
      data: [{ id: 'tech-2', name: 'JavaScript', slug: 'javascript' }],
      total: 1,
      limit: 20,
    })

    const req = new NextRequest('http://localhost/api/technologies?search=java')
    const res = await GET(req)
    expect(res.status).toBe(200)
  })

  it('responde 500 si listTechnologies lanza un error', async () => {
    vi.mocked(techService.listTechnologies).mockRejectedValue(new Error('DB error'))

    const req = new NextRequest('http://localhost/api/technologies')
    const res = await GET(req)
    expect(res.status).toBe(500)
  })
})

describe('POST /api/technologies', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 400 si el nombre es inválido (string vacío)', async () => {
    const req = new NextRequest('http://localhost/api/technologies', {
      method: 'POST',
      body: JSON.stringify({ name: 'x' }), // menos de 2 caracteres
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('responde 400 si falta el campo name', async () => {
    const req = new NextRequest('http://localhost/api/technologies', {
      method: 'POST',
      body: JSON.stringify({}),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('responde 200 al crear o upsert una tecnología', async () => {
    vi.mocked(techService.upsertTechnologyByName).mockResolvedValue({
      id: 'new-tech', name: 'Rust', slug: 'rust',
    })

    const req = new NextRequest('http://localhost/api/technologies', {
      method: 'POST',
      body: JSON.stringify({ name: 'Rust' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.technology.name).toBe('Rust')
  })

  it('responde 400 si upsertTechnologyByName lanza INVALID_TECHNOLOGY_NAME', async () => {
    vi.mocked(techService.upsertTechnologyByName).mockRejectedValue(new Error('INVALID_TECHNOLOGY_NAME'))

    const req = new NextRequest('http://localhost/api/technologies', {
      method: 'POST',
      body: JSON.stringify({ name: 'ValidName' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
