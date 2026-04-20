// MS-01(Users)/src/app/api/users/login/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'

describe('POST /api/users/login', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 400 si el body es inválido (sin email)', async () => {
    const req = new NextRequest('http://localhost/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ password: '123456' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('responde 200 con user y token en un login exitoso', async () => {
    vi.mocked(usersService.loginUser).mockResolvedValue({
      user: {
        id: 'user-ok',
        email: 'ok@test.com',
        username: 'okuser',
        role: 'BACKEND',
        avatarUrl: null,
        description: null,
        avgRating: 0,
        totalRatings: 0,
        createdAt: new Date(),
      },
      accessToken: 'jwt-token',
    } as any)

    const req = new NextRequest('http://localhost/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ok@test.com', password: 'CorrectPass!' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('jwt-token')
    expect(body.user.id).toBe('user-ok')
  })

  it('responde 401 con credenciales inválidas', async () => {
    vi.mocked(usersService.loginUser).mockRejectedValue(new Error('INVALID_CREDENTIALS'))

    const req = new NextRequest('http://localhost/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'wrong@test.com', password: 'wrong' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('responde 429 cuando la cuenta está bloqueada por intentos fallidos', async () => {
    vi.mocked(usersService.loginUser).mockRejectedValue(new Error('TOO_MANY_ATTEMPTS:540'))

    const req = new NextRequest('http://localhost/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'locked@test.com', password: 'cualquiera' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(429)
    const body = await res.json()
    expect(body.error).toMatch(/minuto/)
  })

  it('responde 500 ante un error inesperado', async () => {
    vi.mocked(usersService.loginUser).mockRejectedValue(new Error('Unexpected error'))

    const req = new NextRequest('http://localhost/api/users/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'ok@test.com', password: 'pass' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
