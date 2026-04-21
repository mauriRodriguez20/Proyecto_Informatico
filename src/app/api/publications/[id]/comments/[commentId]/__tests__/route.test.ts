import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { deletePublicationComment } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const PUB_ID     = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COMMENT_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const params = (id: string, commentId: string) => ({ params: Promise.resolve({ id, commentId }) })
const validParams = params(PUB_ID, COMMENT_ID)

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/publications/[id]/comments/[commentId]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3004/api/publications/${PUB_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son invalidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3004/api/publications/no-uuid/comments/no-uuid',
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 404 si el servicio lanza PUBLICATION_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deletePublicationComment).mockRejectedValue(new Error('PUBLICATION_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/publications/${PUB_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 404 si el servicio lanza COMMENT_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deletePublicationComment).mockRejectedValue(new Error('COMMENT_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/publications/${PUB_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si el servicio lanza FORBIDDEN_COMMENT_DELETE', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(deletePublicationComment).mockRejectedValue(new Error('FORBIDDEN_COMMENT_DELETE'))

    const req = new NextRequest(
      `http://localhost:3004/api/publications/${PUB_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando el comentario se elimina exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deletePublicationComment).mockResolvedValue(undefined)

    const req = new NextRequest(
      `http://localhost:3004/api/publications/${PUB_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('eliminado')
  })
})
