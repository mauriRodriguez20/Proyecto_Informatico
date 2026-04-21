import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    comment: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
    rating: {
      aggregate: vi.fn(),
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      upsert: vi.fn(),
    },
    userReputation: { upsert: vi.fn() },
    userStats: { upsert: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

import { prisma } from '@/lib/prisma'
import {
  listPublicationComments,
  createPublicationComment,
  deletePublicationComment,
  listQuestionComments,
  createQuestionComment,
  deleteQuestionComment,
  ratePublication,
  rateAnswer,
  getPublicationRatingSummary,
  getAnswerRatingSummary,
  getUserPublicStats,
  createAcceptedAnswerNotification,
  listMyNotifications,
  getMyUnreadNotificationsCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../interactions.service'

const PUB_ID      = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const QUESTION_ID = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const ANSWER_ID   = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
const USER_ID     = 'dddddddd-dddd-dddd-dddd-dddddddddddd'
const AUTHOR_ID   = 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
const COMMENT_ID  = 'ffffffff-ffff-ffff-ffff-ffffffffffff'
const NOTIF_ID    = '11111111-1111-1111-1111-111111111111'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

const mockComment = {
  id: COMMENT_ID,
  authorId: USER_ID,
  targetType: 'PUBLICATION' as const,
  targetId: PUB_ID,
  content: 'Comentario de prueba',
  createdAt: new Date(),
  updatedAt: new Date(),
}

const mockTx = {
  comment: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  rating: {
    aggregate: vi.fn(),
    upsert: vi.fn(),
  },
  notification: {
    count: vi.fn(),
    findMany: vi.fn(),
  },
  userReputation: { upsert: vi.fn() },
  userStats: { upsert: vi.fn() },
  $queryRaw: vi.fn(),
  $executeRaw: vi.fn(),
}

beforeEach(() => {
  vi.resetAllMocks()
  process.env.MS01_URL = 'http://localhost:3001'

  // $transaction: callback form → arg(mockTx), array form → Promise.all
  vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => {
    if (typeof arg === 'function') return arg(mockTx)
    return Promise.all(arg)
  })

  // $queryRaw por defecto: lista vacía (no encontrado)
  vi.mocked(prisma.$queryRaw as any).mockResolvedValue([])

  // tx defaults
  mockTx.$queryRaw.mockResolvedValue([{ exists: false }])
  mockTx.$executeRaw.mockResolvedValue(undefined)
  mockTx.comment.count.mockResolvedValue(0)
})

// ─── listPublicationComments ──────────────────────────────────────────────────

describe('listPublicationComments', () => {
  it('retorna comentarios paginados cuando la publicacion existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.comment.findMany).mockResolvedValue([mockComment] as any)
    vi.mocked(prisma.comment.count).mockResolvedValue(1)
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ user: { id: USER_ID, username: 'test', avatarUrl: null, role: 'USER' } }) })

    const result = await listPublicationComments(PUB_ID, { page: 1, limit: 10 })

    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.page).toBe(1)
  })

  it('lanza PUBLICATION_NOT_FOUND si la publicacion no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(listPublicationComments(PUB_ID, { page: 1, limit: 10 }))
      .rejects.toThrow('PUBLICATION_NOT_FOUND')
  })
})

// ─── createPublicationComment ─────────────────────────────────────────────────

describe('createPublicationComment', () => {
  it('crea un comentario en una publicacion existente', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    mockTx.comment.create.mockResolvedValue(mockComment)

    const result = await createPublicationComment(PUB_ID, USER_ID, { content: 'Hola mundo' })

    expect(result).toEqual(mockComment)
    expect(mockTx.comment.create).toHaveBeenCalled()
  })

  it('lanza PUBLICATION_NOT_FOUND si la publicacion no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(createPublicationComment(PUB_ID, USER_ID, { content: 'Hola' }))
      .rejects.toThrow('PUBLICATION_NOT_FOUND')
  })
})

// ─── deletePublicationComment ─────────────────────────────────────────────────

describe('deletePublicationComment', () => {
  it('elimina un comentario propio exitosamente', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    mockTx.comment.findFirst.mockResolvedValue({ id: COMMENT_ID, authorId: USER_ID })
    mockTx.comment.delete.mockResolvedValue(undefined)

    await expect(deletePublicationComment(PUB_ID, COMMENT_ID, USER_ID)).resolves.toBeUndefined()
    expect(mockTx.comment.delete).toHaveBeenCalled()
  })

  it('lanza PUBLICATION_NOT_FOUND si la publicacion no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(deletePublicationComment(PUB_ID, COMMENT_ID, USER_ID))
      .rejects.toThrow('PUBLICATION_NOT_FOUND')
  })

  it('lanza COMMENT_NOT_FOUND si el comentario no existe en esa publicacion', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    mockTx.comment.findFirst.mockResolvedValue(null)

    await expect(deletePublicationComment(PUB_ID, COMMENT_ID, USER_ID))
      .rejects.toThrow('COMMENT_NOT_FOUND')
  })

  it('lanza FORBIDDEN_COMMENT_DELETE si el solicitante no es el autor ni admin', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
      .mockResolvedValueOnce([{ role: 'USER' }]) // isAdminUser
    mockTx.comment.findFirst.mockResolvedValue({ id: COMMENT_ID, authorId: AUTHOR_ID })

    await expect(deletePublicationComment(PUB_ID, COMMENT_ID, USER_ID))
      .rejects.toThrow('FORBIDDEN_COMMENT_DELETE')
  })
})

// ─── listQuestionComments ─────────────────────────────────────────────────────

describe('listQuestionComments', () => {
  it('retorna comentarios de una pregunta existente', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: QUESTION_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.comment.findMany).mockResolvedValue([])
    vi.mocked(prisma.comment.count).mockResolvedValue(0)

    const result = await listQuestionComments(QUESTION_ID, { page: 1, limit: 10 })

    expect(result.total).toBe(0)
    expect(result.data).toHaveLength(0)
  })

  it('lanza QUESTION_NOT_FOUND si la pregunta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(listQuestionComments(QUESTION_ID, { page: 1, limit: 10 }))
      .rejects.toThrow('QUESTION_NOT_FOUND')
  })
})

// ─── createQuestionComment ────────────────────────────────────────────────────

describe('createQuestionComment', () => {
  it('crea un comentario en una pregunta existente', async () => {
    const questionComment = { ...mockComment, targetType: 'QUESTION' as const, targetId: QUESTION_ID }
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: QUESTION_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.comment.create).mockResolvedValue(questionComment as any)

    const result = await createQuestionComment(QUESTION_ID, USER_ID, { content: 'Buena pregunta' })

    expect(result.targetType).toBe('QUESTION')
    expect(prisma.comment.create).toHaveBeenCalled()
  })

  it('lanza QUESTION_NOT_FOUND si la pregunta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(createQuestionComment(QUESTION_ID, USER_ID, { content: 'Test' }))
      .rejects.toThrow('QUESTION_NOT_FOUND')
  })
})

// ─── deleteQuestionComment ────────────────────────────────────────────────────

describe('deleteQuestionComment', () => {
  it('elimina un comentario propio de una pregunta', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: QUESTION_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.comment.findFirst).mockResolvedValue({ id: COMMENT_ID, authorId: USER_ID } as any)
    vi.mocked(prisma.comment.delete).mockResolvedValue(undefined as any)

    await expect(deleteQuestionComment(QUESTION_ID, COMMENT_ID, USER_ID)).resolves.toBeUndefined()
    expect(prisma.comment.delete).toHaveBeenCalled()
  })

  it('lanza COMMENT_NOT_FOUND si el comentario no pertenece a la pregunta', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: QUESTION_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.comment.findFirst).mockResolvedValue(null)

    await expect(deleteQuestionComment(QUESTION_ID, COMMENT_ID, USER_ID))
      .rejects.toThrow('COMMENT_NOT_FOUND')
  })

  it('lanza FORBIDDEN_COMMENT_DELETE si el solicitante no es autor ni admin', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, authorId: AUTHOR_ID }])
      .mockResolvedValueOnce([{ role: 'USER' }]) // isAdminUser
    vi.mocked(prisma.comment.findFirst).mockResolvedValue({ id: COMMENT_ID, authorId: AUTHOR_ID } as any)

    await expect(deleteQuestionComment(QUESTION_ID, COMMENT_ID, USER_ID))
      .rejects.toThrow('FORBIDDEN_COMMENT_DELETE')
  })
})

// ─── ratePublication ─────────────────────────────────────────────────────────

describe('ratePublication', () => {
  it('califica una publicacion exitosamente', async () => {
    // getPublicationTarget
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
      // countUserPublications, countUserQuestions, countUserAnswers inside refreshUserReputation
      .mockResolvedValueOnce([{ count: 5 }])
      .mockResolvedValueOnce([{ count: 3 }])
      .mockResolvedValueOnce([{ count: 7 }])

    mockTx.rating.upsert.mockResolvedValue(undefined)
    mockTx.rating.aggregate.mockResolvedValue({ _avg: { score: 4 }, _count: { score: 10 } })
    mockTx.userReputation.upsert.mockResolvedValue(undefined)
    mockTx.userStats.upsert.mockResolvedValue(undefined)

    const result = await ratePublication(PUB_ID, USER_ID, { score: 4 })

    expect(result.targetId).toBe(PUB_ID)
    expect(result.myScore).toBe(4)
    expect(result.avgRating).toBe(4)
  })

  it('lanza PUBLICATION_NOT_FOUND si la publicacion no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(ratePublication(PUB_ID, USER_ID, { score: 3 }))
      .rejects.toThrow('PUBLICATION_NOT_FOUND')
  })

  it('lanza SELF_RATING_NOT_ALLOWED si el autor intenta calificarse a si mismo', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: USER_ID }])

    await expect(ratePublication(PUB_ID, USER_ID, { score: 5 }))
      .rejects.toThrow('SELF_RATING_NOT_ALLOWED')
  })
})

// ─── rateAnswer ──────────────────────────────────────────────────────────────

describe('rateAnswer', () => {
  it('califica una respuesta exitosamente', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: AUTHOR_ID }])
      .mockResolvedValueOnce([{ count: 2 }])
      .mockResolvedValueOnce([{ count: 1 }])
      .mockResolvedValueOnce([{ count: 4 }])

    mockTx.rating.upsert.mockResolvedValue(undefined)
    mockTx.rating.aggregate.mockResolvedValue({ _avg: { score: 3.5 }, _count: { score: 5 } })
    mockTx.userReputation.upsert.mockResolvedValue(undefined)
    mockTx.userStats.upsert.mockResolvedValue(undefined)

    const result = await rateAnswer(ANSWER_ID, USER_ID, { score: 3 })

    expect(result.targetId).toBe(ANSWER_ID)
    expect(result.myScore).toBe(3)
  })

  it('lanza ANSWER_NOT_FOUND si la respuesta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(rateAnswer(ANSWER_ID, USER_ID, { score: 4 }))
      .rejects.toThrow('ANSWER_NOT_FOUND')
  })

  it('lanza SELF_RATING_NOT_ALLOWED si el autor intenta calificarse', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: ANSWER_ID, authorId: USER_ID }])

    await expect(rateAnswer(ANSWER_ID, USER_ID, { score: 5 }))
      .rejects.toThrow('SELF_RATING_NOT_ALLOWED')
  })
})

// ─── getPublicationRatingSummary ──────────────────────────────────────────────

describe('getPublicationRatingSummary', () => {
  it('retorna el resumen de calificaciones sin requesterId', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.rating.aggregate).mockResolvedValue({ _avg: { score: 4.2 }, _count: { score: 8 } } as any)

    const result = await getPublicationRatingSummary(PUB_ID)

    expect(result.avgRating).toBe(4.2)
    expect(result.totalRatings).toBe(8)
    expect(result.myScore).toBeNull()
  })

  it('retorna myScore cuando se pasa requesterId', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: PUB_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.rating.aggregate).mockResolvedValue({ _avg: { score: 3 }, _count: { score: 1 } } as any)
    vi.mocked(prisma.rating.findUnique).mockResolvedValue({ score: 3 } as any)

    const result = await getPublicationRatingSummary(PUB_ID, USER_ID)

    expect(result.myScore).toBe(3)
  })

  it('lanza PUBLICATION_NOT_FOUND si la publicacion no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(getPublicationRatingSummary(PUB_ID))
      .rejects.toThrow('PUBLICATION_NOT_FOUND')
  })
})

// ─── getAnswerRatingSummary ───────────────────────────────────────────────────

describe('getAnswerRatingSummary', () => {
  it('retorna el resumen de calificaciones de una respuesta', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([{ id: ANSWER_ID, authorId: AUTHOR_ID }])
    vi.mocked(prisma.rating.aggregate).mockResolvedValue({ _avg: { score: 5 }, _count: { score: 2 } } as any)

    const result = await getAnswerRatingSummary(ANSWER_ID)

    expect(result.avgRating).toBe(5)
    expect(result.label).toBe('Calificado')
  })

  it('lanza ANSWER_NOT_FOUND si la respuesta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(getAnswerRatingSummary(ANSWER_ID)).rejects.toThrow('ANSWER_NOT_FOUND')
  })
})

// ─── getUserPublicStats ───────────────────────────────────────────────────────

describe('getUserPublicStats', () => {
  it('retorna estadisticas publicas del usuario', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: USER_ID }])     // ensureUserExists
      .mockResolvedValueOnce([{ count: 10 }])        // countUserPublications
      .mockResolvedValueOnce([{ count: 5 }])         // countUserQuestions
      .mockResolvedValueOnce([{ count: 8 }])         // countUserAnswers

    mockTx.rating.aggregate.mockResolvedValue({ _avg: { score: 4 }, _count: { score: 20 } })
    mockTx.userReputation.upsert.mockResolvedValue(undefined)
    mockTx.userStats.upsert.mockResolvedValue(undefined)

    const result = await getUserPublicStats(USER_ID)

    expect(result.userId).toBe(USER_ID)
    expect(result.publicationsCount).toBe(10)
    expect(result.questionsCount).toBe(5)
    expect(result.answersCount).toBe(8)
    expect(result.avgRating).toBe(4)
  })

  it('lanza USER_NOT_FOUND si el usuario no existe', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValueOnce([])

    await expect(getUserPublicStats(USER_ID)).rejects.toThrow('USER_NOT_FOUND')
  })
})

// ─── createAcceptedAnswerNotification ─────────────────────────────────────────

describe('createAcceptedAnswerNotification', () => {
  const mockNotification = {
    id: NOTIF_ID,
    userId: AUTHOR_ID,
    type: 'ANSWER_ACCEPTED',
    entityType: 'ANSWER',
    entityId: ANSWER_ID,
    title: 'Respuesta aceptada',
    message: 'Tu respuesta fue aceptada.',
    isRead: false,
    createdAt: new Date(),
  }

  it('crea notificacion cuando question.authorId === acceptedByUserId y autores son distintos', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, title: 'Pregunta test', authorId: USER_ID }])  // question
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: AUTHOR_ID, questionId: QUESTION_ID }]) // answer
      .mockResolvedValueOnce([{ username: 'mauriel' }]) // getUsername
    vi.mocked(prisma.notification.upsert).mockResolvedValue(mockNotification as any)

    const result = await createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, USER_ID)

    expect(result).not.toBeNull()
    expect(prisma.notification.upsert).toHaveBeenCalled()
  })

  it('retorna null si el autor de la respuesta es el mismo que acceptedByUserId', async () => {
    // getUsername NO se llama porque la función retorna null antes
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, title: 'Pregunta test', authorId: USER_ID }])
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: USER_ID, questionId: QUESTION_ID }])

    const result = await createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, USER_ID)

    expect(result).toBeNull()
    expect(prisma.notification.upsert).not.toHaveBeenCalled()
  })

  it('lanza QUESTION_NOT_FOUND si la pregunta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([])  // question null
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: AUTHOR_ID, questionId: QUESTION_ID }])

    await expect(createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, USER_ID))
      .rejects.toThrow('QUESTION_NOT_FOUND')
  })

  it('lanza ANSWER_NOT_FOUND si la respuesta no existe', async () => {
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, title: 'Test', authorId: USER_ID }])
      .mockResolvedValueOnce([]) // answer null

    await expect(createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, USER_ID))
      .rejects.toThrow('ANSWER_NOT_FOUND')
  })

  it('lanza ANSWER_QUESTION_MISMATCH si la respuesta no pertenece a la pregunta', async () => {
    const OTRO_QUESTION = '99999999-9999-9999-9999-999999999999'
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, title: 'Test', authorId: USER_ID }])
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: AUTHOR_ID, questionId: OTRO_QUESTION }]) // distinta pregunta

    await expect(createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, USER_ID))
      .rejects.toThrow('ANSWER_QUESTION_MISMATCH')
  })

  it('lanza FORBIDDEN_ACCEPT_NOTIFICATION si el solicitante no es autor de la pregunta', async () => {
    const OTRO_USER = '22222222-2222-2222-2222-222222222222'
    // question.authorId = AUTHOR_ID, acceptedByUserId = OTRO_USER → no coinciden
    vi.mocked(prisma.$queryRaw as any)
      .mockResolvedValueOnce([{ id: QUESTION_ID, title: 'Test', authorId: AUTHOR_ID }])
      .mockResolvedValueOnce([{ id: ANSWER_ID, authorId: USER_ID, questionId: QUESTION_ID }])

    await expect(createAcceptedAnswerNotification(QUESTION_ID, ANSWER_ID, OTRO_USER))
      .rejects.toThrow('FORBIDDEN_ACCEPT_NOTIFICATION')
  })
})

// ─── listMyNotifications ──────────────────────────────────────────────────────

describe('listMyNotifications', () => {
  it('retorna notificaciones paginadas del usuario', async () => {
    const mockNotif = { id: NOTIF_ID, userId: USER_ID, isRead: false, createdAt: new Date() }
    vi.mocked(prisma.notification.findMany).mockResolvedValue([mockNotif] as any)
    vi.mocked(prisma.notification.count)
      .mockResolvedValueOnce(1)  // total
      .mockResolvedValueOnce(1)  // unreadCount

    const result = await listMyNotifications(USER_ID, { page: 1, limit: 20, unreadOnly: false })

    expect(result.total).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.hasUnread).toBe(true)
  })

  it('retorna mensaje vacio cuando no hay notificaciones', async () => {
    vi.mocked(prisma.notification.findMany).mockResolvedValue([])
    vi.mocked(prisma.notification.count)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)

    const result = await listMyNotifications(USER_ID, { page: 1, limit: 20, unreadOnly: false })

    expect(result.total).toBe(0)
    expect(result.emptyMessage).toBeDefined()
  })
})

// ─── getMyUnreadNotificationsCount ───────────────────────────────────────────

describe('getMyUnreadNotificationsCount', () => {
  it('retorna el conteo de notificaciones no leidas', async () => {
    vi.mocked(prisma.notification.count).mockResolvedValue(5)

    const result = await getMyUnreadNotificationsCount(USER_ID)

    expect(result.unreadCount).toBe(5)
  })
})

// ─── markNotificationAsRead ───────────────────────────────────────────────────

describe('markNotificationAsRead', () => {
  it('marca una notificacion como leida', async () => {
    const readAt = new Date()
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({
      id: NOTIF_ID, isRead: false, readAt: null,
    } as any)
    vi.mocked(prisma.notification.update).mockResolvedValue({
      id: NOTIF_ID, isRead: true, readAt,
    } as any)

    const result = await markNotificationAsRead(USER_ID, NOTIF_ID)

    expect(result.isRead).toBe(true)
    expect(result.readAt).toEqual(readAt)
  })

  it('retorna la notificacion sin modificar si ya estaba leida', async () => {
    const readAt = new Date('2024-01-01')
    vi.mocked(prisma.notification.findFirst).mockResolvedValue({
      id: NOTIF_ID, isRead: true, readAt,
    } as any)

    const result = await markNotificationAsRead(USER_ID, NOTIF_ID)

    expect(result.isRead).toBe(true)
    expect(prisma.notification.update).not.toHaveBeenCalled()
  })

  it('lanza NOTIFICATION_NOT_FOUND si la notificacion no pertenece al usuario', async () => {
    vi.mocked(prisma.notification.findFirst).mockResolvedValue(null)

    await expect(markNotificationAsRead(USER_ID, NOTIF_ID))
      .rejects.toThrow('NOTIFICATION_NOT_FOUND')
  })
})

// ─── markAllNotificationsAsRead ───────────────────────────────────────────────

describe('markAllNotificationsAsRead', () => {
  it('marca todas las notificaciones como leidas', async () => {
    vi.mocked(prisma.notification.updateMany).mockResolvedValue({ count: 7 })

    const result = await markAllNotificationsAsRead(USER_ID)

    expect(result.updatedCount).toBe(7)
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: USER_ID, isRead: false } })
    )
  })
})
