import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'

describe('POST /api/users/forgot-password', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 400 si el email es inválido', async () => {
    const req = new NextRequest('http://localhost/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'no-es-email' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('responde 200 aunque el email no exista (seguridad: no revelar)', async () => {
    vi.mocked(usersService.sendPasswordResetEmail).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'cualquiera@test.com' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBeDefined()
  })

  it('responde 500 si sendPasswordResetEmail lanza un error inesperado', async () => {
    vi.mocked(usersService.sendPasswordResetEmail).mockRejectedValue(new Error('Supabase down'))

    const req = new NextRequest('http://localhost/api/users/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email: 'test@test.com' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
