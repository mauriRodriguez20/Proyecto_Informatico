import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'
import { withAuth } from '@/lib/api-helpers'

const validBody = { currentPassword: 'OldPass1!', newPassword: 'NewPass1!' }

describe('POST /api/users/change-password', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 401 sin token de autenticación', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null, authUser: null, bearerToken: null,
      errorResponse: new Response(JSON.stringify({ error: 'No auth' }), {
        status: 401, headers: { 'content-type': 'application/json' },
      }) as any,
    })

    const req = new NextRequest('http://localhost/api/users/change-password', {
      method: 'POST', body: JSON.stringify(validBody),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('responde 400 si el body es inválido (falta newPassword)', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1', authUser: { id: 'user-1', email: 'u@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })

    const req = new NextRequest('http://localhost/api/users/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword: 'OldPass1!' }), // sin newPassword
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('responde 200 al cambiar la contraseña exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1', authUser: { id: 'user-1', email: 'u@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.changeUserPassword).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/users/change-password', {
      method: 'POST', body: JSON.stringify(validBody),
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('responde 400 si la contraseña actual es incorrecta', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: 'user-1', authUser: { id: 'user-1', email: 'u@test.com', userMetadata: null },
      bearerToken: 'tok', errorResponse: null,
    })
    vi.mocked(usersService.changeUserPassword).mockRejectedValue(new Error('INVALID_CURRENT_PASSWORD'))

    const req = new NextRequest('http://localhost/api/users/change-password', {
      method: 'POST', body: JSON.stringify(validBody),
      headers: { Authorization: 'Bearer tok' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
