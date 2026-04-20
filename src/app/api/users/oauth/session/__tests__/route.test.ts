import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'
import { withAuth } from '@/lib/api-helpers'

describe('POST /api/users/oauth/session', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 401 sin autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null, authUser: null, bearerToken: null,
      errorResponse: new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401, headers: { 'content-type': 'application/json' },
      }) as any,
    })

    const req = new NextRequest('http://localhost/api/users/oauth/session', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('responde 200 con user y token al sincronizar sesión OAuth exitosamente', async () => {
    const mockAuthUser = { id: 'oauth-user', email: 'oauth@test.com', userMetadata: {} }
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'oauth-user', authUser: mockAuthUser,
      bearerToken: 'oauth-token', errorResponse: null,
    })
    vi.mocked(usersService.syncOAuthUserSession).mockResolvedValue({
      id: 'oauth-user', email: 'oauth@test.com', username: 'oauthuser',
      role: 'FRONTEND', avatarUrl: null, description: null,
      avgRating: 0, totalRatings: 0, createdAt: new Date(),
    } as any)

    const req = new NextRequest('http://localhost/api/users/oauth/session', {
      method: 'POST', headers: { Authorization: 'Bearer oauth-token' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.token).toBe('oauth-token')
    expect(body.user.id).toBe('oauth-user')
  })

  it('responde 409 si hay conflicto de email OAuth', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'oauth-user', authUser: { id: 'oauth-user', email: 'conflict@test.com', userMetadata: {} },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.syncOAuthUserSession).mockRejectedValue(new Error('OAUTH_EMAIL_CONFLICT'))

    const req = new NextRequest('http://localhost/api/users/oauth/session', {
      method: 'POST', headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })

  it('responde 400 si falta el email del proveedor OAuth', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'oauth-user', authUser: { id: 'oauth-user', email: null, userMetadata: {} },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.syncOAuthUserSession).mockRejectedValue(new Error('OAUTH_EMAIL_REQUIRED'))

    const req = new NextRequest('http://localhost/api/users/oauth/session', {
      method: 'POST', headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
