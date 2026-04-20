import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/modules/users/users.service')

import { POST } from '../route'
import * as usersService from '@/modules/users/users.service'

describe('POST /api/users/logout', () => {
  beforeEach(() => vi.clearAllMocks())

  it('responde 200 al cerrar sesión exitosamente', async () => {
    vi.mocked(usersService.logoutUser).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/users/logout', {
      method: 'POST',
      headers: { Authorization: 'Bearer some-token' },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.message).toBeDefined()
  })

  it('responde 200 incluso sin token (logout es best-effort)', async () => {
    vi.mocked(usersService.logoutUser).mockResolvedValue(undefined)

    const req = new NextRequest('http://localhost/api/users/logout', {
      method: 'POST',
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('responde 500 si logoutUser lanza un error inesperado', async () => {
    vi.mocked(usersService.logoutUser).mockRejectedValue(new Error('Unexpected'))

    const req = new NextRequest('http://localhost/api/users/logout', {
      method: 'POST',
    })

    const res = await POST(req)
    expect(res.status).toBe(500)
  })
})
