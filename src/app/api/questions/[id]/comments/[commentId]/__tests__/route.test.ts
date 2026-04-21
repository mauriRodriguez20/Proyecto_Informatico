import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/interactions/interactions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { DELETE } from '../route'
import { deleteQuestionComment } from '@/modules/interactions/interactions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const COMMENT_ID  = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'

const params = (id: string, commentId: string) => ({ params: Promise.resolve({ id, commentId }) })
const validParams = params(QUESTION_ID, COMMENT_ID)

beforeEach(() => vi.clearAllMocks())

describe('DELETE /api/questions/[id]/comments/[commentId]', () => {
  it('retorna 401 si no hay token', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'No autorizado.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(401)
  })

  it('retorna 400 si los UUIDs son invalidos', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3004/api/questions/no-uuid/comments/no-uuid',
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
  })

  it('retorna 404 si la pregunta no existe', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteQuestionComment).mockRejectedValue(new Error('QUESTION_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 404 si el comentario no existe', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteQuestionComment).mockRejectedValue(new Error('COMMENT_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('retorna 403 si no tiene permiso para eliminar el comentario', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'otro-user', errorResponse: null })
    vi.mocked(deleteQuestionComment).mockRejectedValue(new Error('FORBIDDEN_COMMENT_DELETE'))

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(403)
  })

  it('retorna 200 cuando el comentario se elimina exitosamente', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteQuestionComment).mockResolvedValue(undefined)

    const req = new NextRequest(
      `http://localhost:3004/api/questions/${QUESTION_ID}/comments/${COMMENT_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toContain('eliminado')
  })
})
