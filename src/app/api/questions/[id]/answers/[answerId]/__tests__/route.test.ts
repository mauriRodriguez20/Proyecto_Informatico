import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/modules/questions/questions.service')
vi.mock('@/lib/api-helpers', () => ({ withAuth: vi.fn() }))

import { NextRequest } from 'next/server'
import { PATCH, DELETE } from '../route'
import { updateAnswer, deleteAnswer } from '@/modules/questions/questions.service'
import { withAuth } from '@/lib/api-helpers'

const QUESTION_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const ANSWER_ID = 'cccccccc-cccc-cccc-cccc-cccccccccccc'

const mockAnswer = {
  id: ANSWER_ID,
  questionId: QUESTION_ID,
  authorId: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  content: 'Updated answer content',
  codeBlock: null,
  language: null,
  isAccepted: false,
  voteScore: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
}

const params = (id: string, answerId: string) => ({
  params: Promise.resolve({ id, answerId }),
})

const validParams = params(QUESTION_ID, ANSWER_ID)

beforeEach(() => vi.clearAllMocks())

describe('PATCH /api/questions/[id]/answers/[answerId]', () => {
  it('returns 401 when token is missing', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'Unauthorized.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'PATCH', body: JSON.stringify({}) }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(401)
  })

  it('returns 400 when UUID params are invalid', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })

    const req = new NextRequest(
      'http://localhost:3003/api/questions/no-uuid/answers/no-uuid',
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'something' }),
      }
    )
    const res = await PATCH(req, params('no-uuid', 'no-uuid'))

    expect(res.status).toBe(400)
  })

  it('returns 404 when service throws ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'valid content for update' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(404)
  })

  it('returns 403 when service throws FORBIDDEN_ANSWER_EDIT', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'other-user', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('FORBIDDEN_ANSWER_EDIT'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'valid content for update' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(403)
  })

  it('returns 400 when service throws INVALID_LANGUAGE_WITHOUT_CODE', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockRejectedValue(new Error('INVALID_LANGUAGE_WITHOUT_CODE'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'valid content for update' }),
      }
    )
    const res = await PATCH(req, validParams)

    expect(res.status).toBe(400)
  })

  it('returns 200 when update succeeds', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(updateAnswer).mockResolvedValue(mockAnswer as any)

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      {
        method: 'PATCH',
        headers: { Authorization: 'Bearer token', 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Updated answer content' }),
      }
    )
    const res = await PATCH(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.answer.id).toBe(ANSWER_ID)
  })
})

describe('DELETE /api/questions/[id]/answers/[answerId]', () => {
  it('returns 401 when token is missing', async () => {
    vi.mocked(withAuth).mockResolvedValue({
      userId: null,
      errorResponse: Response.json({ error: 'Unauthorized.' }, { status: 401 }) as any,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE' }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(401)
  })

  it('returns 403 when service throws FORBIDDEN_ANSWER_DELETE', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'other-user', errorResponse: null })
    vi.mocked(deleteAnswer).mockRejectedValue(new Error('FORBIDDEN_ANSWER_DELETE'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(403)
  })

  it('returns 404 when service throws ANSWER_NOT_FOUND', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockRejectedValue(new Error('ANSWER_NOT_FOUND'))

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)

    expect(res.status).toBe(404)
  })

  it('returns 200 when delete succeeds for a non accepted answer', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockResolvedValue({
      deletedAnswerId: ANSWER_ID,
      wasAccepted: false,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.deletedAnswerId).toBe(ANSWER_ID)
    expect(body.wasAccepted).toBe(false)
  })

  it('returns 200 and wasAccepted=true when deleting an accepted answer', async () => {
    vi.mocked(withAuth).mockResolvedValue({ userId: 'user-1', errorResponse: null })
    vi.mocked(deleteAnswer).mockResolvedValue({
      deletedAnswerId: ANSWER_ID,
      wasAccepted: true,
    })

    const req = new NextRequest(
      `http://localhost:3003/api/questions/${QUESTION_ID}/answers/${ANSWER_ID}`,
      { method: 'DELETE', headers: { Authorization: 'Bearer token' } }
    )
    const res = await DELETE(req, validParams)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.wasAccepted).toBe(true)
  })
})
