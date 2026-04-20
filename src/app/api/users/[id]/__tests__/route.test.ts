// MS-01(Users)/src/app/api/users/[id]/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mockear el service completo
vi.mock('@/modules/users/users.service')

// Mockear withAuth para controlar autenticación en tests
vi.mock('@/lib/api-helpers', () => ({
  withAuth: vi.fn(),
}))

import { GET, PATCH } from '../route'
import * as usersService from '@/modules/users/users.service'
import { withAuth } from '@/lib/api-helpers'

const mockUser = {
  id: 'user-123',
  email: 'test@test.com',
  username: 'testuser',
  role: 'BACKEND',
  avatarUrl: null,
  description: null,
  avgRating: 4.0,
  totalRatings: 5,
  createdAt: new Date(),
  technologies: [],
  commentsCount: 2,
  solutionsCount: 1,
}

// ─────────────────────────────────────────────────────────
// GET /api/users/[id]
// ─────────────────────────────────────────────────────────
describe('GET /api/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 200 con el usuario cuando existe', async () => {
    vi.mocked(usersService.getUserById).mockResolvedValue(mockUser as any)

    const req = new NextRequest('http://localhost/api/users/user-123')
    const res = await GET(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.id).toBe('user-123')
    expect(body.user.username).toBe('testuser')
  })

  it('responde 404 cuando el usuario no existe', async () => {
    vi.mocked(usersService.getUserById).mockResolvedValue(null)

    const req = new NextRequest('http://localhost/api/users/no-existe')
    const res = await GET(req, { params: Promise.resolve({ id: 'no-existe' }) })

    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toBeDefined()
  })

  it('responde 500 si el service lanza un error inesperado', async () => {
    vi.mocked(usersService.getUserById).mockRejectedValue(new Error('DB crash'))

    const req = new NextRequest('http://localhost/api/users/user-err')
    const res = await GET(req, { params: Promise.resolve({ id: 'user-err' }) })

    expect(res.status).toBe(500)
  })
})

// ─────────────────────────────────────────────────────────
// PATCH /api/users/[id]
// ─────────────────────────────────────────────────────────
describe('PATCH /api/users/[id]', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 401 si no hay token de autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      authUser: null,
      bearerToken: null,
      errorResponse: new Response(JSON.stringify({ error: 'Token requerido.' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }) as any,
    })

    const req = new NextRequest('http://localhost/api/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ username: 'nuevo' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(401)
  })

  it('responde 403 si el usuario autenticado intenta editar otro perfil', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'otro-user',
      authUser: { id: 'otro-user', email: 'otro@test.com', userMetadata: null },
      bearerToken: 'token',
      errorResponse: null,
    })

    const req = new NextRequest('http://localhost/api/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ username: 'hack' }),
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(403)
  })

  it('responde 400 si el body no pasa la validación Zod', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-123',
      authUser: { id: 'user-123', email: 'test@test.com', userMetadata: null },
      bearerToken: 'token',
      errorResponse: null,
    })

    const req = new NextRequest('http://localhost/api/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ username: 'a' }), // muy corto — min(3) falla con 1 carácter
      headers: { Authorization: 'Bearer token' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(400)
  })

  it('responde 200 con el perfil actualizado en un update exitoso', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-123',
      authUser: { id: 'user-123', email: 'test@test.com', userMetadata: null },
      bearerToken: 'token',
      errorResponse: null,
    })

    vi.mocked(usersService.updateUserProfile).mockResolvedValue({
      ...mockUser,
      username: 'updated',
    } as any)

    const req = new NextRequest('http://localhost/api/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ username: 'updated' }),
      headers: { Authorization: 'Bearer token' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.user.username).toBe('updated')
  })

  it('responde 409 si el username ya está en uso', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-123',
      authUser: { id: 'user-123', email: 'test@test.com', userMetadata: null },
      bearerToken: 'token',
      errorResponse: null,
    })

    vi.mocked(usersService.updateUserProfile).mockRejectedValue(
      new Error('USERNAME_ALREADY_EXISTS')
    )

    const req = new NextRequest('http://localhost/api/users/user-123', {
      method: 'PATCH',
      body: JSON.stringify({ username: 'ocupado' }),
      headers: { Authorization: 'Bearer token' },
    })
    const res = await PATCH(req, { params: Promise.resolve({ id: 'user-123' }) })

    expect(res.status).toBe(409)
  })
})
