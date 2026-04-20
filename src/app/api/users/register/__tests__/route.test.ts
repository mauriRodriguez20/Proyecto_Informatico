// MS-01(Users)/src/app/api/users/register/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'

const validBody = {
  email: 'nuevo@test.com',
  username: 'nuevouser',
  password: 'SecurePass1!',
  role: 'BACKEND',
}

describe('POST /api/users/register', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 400 si el body es inválido (email mal formado)', async () => {
    const req = new NextRequest('http://localhost/api/users/register', {
      method: 'POST',
      body: JSON.stringify({ email: 'no-es-email', username: 'user', password: '123', role: 'BACKEND' }),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('responde 201 con user y token en un registro exitoso', async () => {
    vi.mocked(usersService.registerUser).mockResolvedValue({
      user: {
        id: 'new-id',
        email: validBody.email,
        username: validBody.username,
        role: 'BACKEND',
        avatarUrl: null,
        description: null,
        avgRating: 0,
        totalRatings: 0,
        createdAt: new Date(),
      },
      accessToken: 'access-token-xyz',
    } as any)

    const req = new NextRequest('http://localhost/api/users/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.user.id).toBe('new-id')
    expect(body.token).toBe('access-token-xyz')
  })

  it('responde 409 si el email ya existe', async () => {
    vi.mocked(usersService.registerUser).mockRejectedValue(new Error('EMAIL_ALREADY_EXISTS'))

    const req = new NextRequest('http://localhost/api/users/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('responde 409 si el username ya está en uso', async () => {
    vi.mocked(usersService.registerUser).mockRejectedValue(new Error('USERNAME_ALREADY_EXISTS'))

    const req = new NextRequest('http://localhost/api/users/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('responde 500 ante un error inesperado', async () => {
    vi.mocked(usersService.registerUser).mockRejectedValue(new Error('Unexpected DB error'))

    const req = new NextRequest('http://localhost/api/users/register', {
      method: 'POST',
      body: JSON.stringify(validBody),
      headers: { 'content-type': 'application/json' },
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
