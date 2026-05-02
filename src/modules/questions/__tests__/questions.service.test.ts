import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    question: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    answer: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    answerVote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      aggregate: vi.fn(),
    },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('@/lib/http-client', () => ({
  fetchWithKeepAlive: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { fetchWithKeepAlive } from '@/lib/http-client'
import {
  createQuestion,
  listQuestions,
  getQuestionById,
  createAnswer,
  updateAnswer,
  deleteAnswer,
  acceptAnswer,
  voteAnswer,
} from '@/modules/questions/questions.service'

const mockFetch = vi.mocked(fetchWithKeepAlive)

// ─── Datos base ───────────────────────────────────────────────────────────────

const QUESTION_ID = '11111111-1111-1111-1111-111111111111'
const ANSWER_ID   = '22222222-2222-2222-2222-222222222222'
const AUTHOR_ID   = '33333333-3333-3333-3333-333333333333'
const OTHER_ID    = '44444444-4444-4444-4444-444444444444'

const baseQuestion = {
  id: QUESTION_ID,
  authorId: AUTHOR_ID,
  area: 'FRONTEND' as const,
  title: 'Pregunta de prueba sobre React',
  description: 'Descripción detallada de la pregunta',
  codeBlock: null,
  language: null,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  tags: [],
  answers: [],
}

const baseQuestionWithCount = {
  ...baseQuestion,
  _count: { answers: 0 },
  answers: [], // respuestas aceptadas (filtradas por isAccepted)
}

const baseAnswer = {
  id: ANSWER_ID,
  questionId: QUESTION_ID,
  authorId: AUTHOR_ID,
  content: 'Contenido de la respuesta de prueba',
  codeBlock: null,
  language: null,
  isAccepted: false,
  voteScore: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  votes: [],
}

const mockAuthorResponse = {
  users: [
    {
      id: AUTHOR_ID,
      username: 'testuser',
      avatarUrl: null,
      role: 'USER',
      avgRating: 4.0,
    },
  ],
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.MS01_URL = 'http://localhost:3001'
})

// ─── createQuestion ───────────────────────────────────────────────────────────

describe('createQuestion', () => {
  it('crea una pregunta sin tecnologías y retorna la pregunta creada', async () => {
    vi.mocked(prisma.question.create).mockResolvedValue(baseQuestion as any)

    const result = await createQuestion(AUTHOR_ID, {
      area: 'FRONTEND',
      title: 'Pregunta de prueba sobre React',
      description: 'Descripción detallada de la pregunta',
      technologyIds: [],
    })

    expect(prisma.question.create).toHaveBeenCalledOnce()
    expect(result.id).toBe(QUESTION_ID)
  })

  it('lanza INVALID_TECHNOLOGY_IDS si los IDs no existen en el catálogo', async () => {
    vi.mocked(prisma.$queryRaw as any).mockResolvedValue([])

    await expect(
      createQuestion(AUTHOR_ID, {
        area: 'FRONTEND',
        title: 'Pregunta de prueba sobre React',
        description: 'Descripción detallada de la pregunta',
        technologyIds: ['00000000-0000-0000-0000-000000000099'],
      })
    ).rejects.toThrow('INVALID_TECHNOLOGY_IDS')
  })
})

// ─── listQuestions ────────────────────────────────────────────────────────────

describe('listQuestions', () => {
  it('retorna preguntas paginadas con autores', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [baseQuestionWithCount],
      1,
    ] as any)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAuthorResponse,
    } as Response)

    const result = await listQuestions({ page: 1, limit: 10, unanswered: false, sortOrder: 'desc' })

    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(QUESTION_ID)
  })

  it('retorna lista vacía cuando no hay preguntas', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    const result = await listQuestions({ page: 1, limit: 10, unanswered: false, sortOrder: 'desc' })

    expect(result.total).toBe(0)
    expect(result.data).toHaveLength(0)
    expect(result.totalPages).toBe(0)
  })

  it('filtra por unanswered correctamente', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0] as any)

    await listQuestions({ page: 1, limit: 10, unanswered: true, sortOrder: 'asc' })

    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })
})

// ─── getQuestionById ──────────────────────────────────────────────────────────

describe('getQuestionById', () => {
  it('retorna la pregunta con autor cuando existe', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue(baseQuestion as any)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAuthorResponse,
    } as Response)

    const result = await getQuestionById(QUESTION_ID)

    expect(result).not.toBeNull()
    expect(result!.id).toBe(QUESTION_ID)
    expect(result!.author).not.toBeNull()
  })

  it('retorna null si la pregunta no existe', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue(null)

    const result = await getQuestionById('no-existe')

    expect(result).toBeNull()
  })

  it('retorna pregunta con author null si el fetch al MS-01 falla', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      ...baseQuestion,
      authorId: 'author-unreachable-test-1',
    } as any)
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response)

    const result = await getQuestionById(QUESTION_ID)

    expect(result).not.toBeNull()
    expect(result!.author).toBeNull()
  })
})

// ─── createAnswer ─────────────────────────────────────────────────────────────

describe('createAnswer', () => {
  it('crea una respuesta exitosamente', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({ id: QUESTION_ID } as any)
    vi.mocked(prisma.answer.create).mockResolvedValue(baseAnswer as any)

    const result = await createAnswer(QUESTION_ID, AUTHOR_ID, {
      content: 'Contenido de la respuesta de prueba',
    })

    expect(prisma.answer.create).toHaveBeenCalledOnce()
    expect(result.id).toBe(ANSWER_ID)
  })

  it('lanza QUESTION_NOT_FOUND si la pregunta no existe', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue(null)

    await expect(
      createAnswer('no-existe', AUTHOR_ID, { content: 'Contenido de prueba' })
    ).rejects.toThrow('QUESTION_NOT_FOUND')
  })
})

// ─── updateAnswer ─────────────────────────────────────────────────────────────

describe('updateAnswer', () => {
  it('actualiza el contenido de la respuesta exitosamente', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue(baseAnswer as any)
    vi.mocked(prisma.answer.update).mockResolvedValue({
      ...baseAnswer,
      content: 'Contenido actualizado',
    } as any)

    const result = await updateAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, {
      content: 'Contenido actualizado',
    })

    expect(prisma.answer.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ANSWER_ID } })
    )
    expect(result.content).toBe('Contenido actualizado')
  })

  it('lanza ANSWER_NOT_FOUND si la respuesta no existe', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue(null)

    await expect(
      updateAnswer(QUESTION_ID, 'no-existe', AUTHOR_ID, { content: 'X' })
    ).rejects.toThrow('ANSWER_NOT_FOUND')
  })

  it('lanza FORBIDDEN_ANSWER_EDIT si el usuario no es el autor', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      ...baseAnswer,
      authorId: OTHER_ID,
    } as any)

    await expect(
      updateAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, { content: 'X' })
    ).rejects.toThrow('FORBIDDEN_ANSWER_EDIT')
  })

  it('lanza INVALID_LANGUAGE_WITHOUT_CODE al enviar codeBlock sin language', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue(baseAnswer as any)

    await expect(
      updateAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, { codeBlock: 'const x = 1' })
    ).rejects.toThrow('INVALID_LANGUAGE_WITHOUT_CODE')
  })

  it('lanza INVALID_LANGUAGE_WITHOUT_CODE al enviar language sin codeBlock existente', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      ...baseAnswer,
      codeBlock: null,
    } as any)

    await expect(
      updateAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, { language: 'typescript' })
    ).rejects.toThrow('INVALID_LANGUAGE_WITHOUT_CODE')
  })
})

// ─── deleteAnswer ─────────────────────────────────────────────────────────────

describe('deleteAnswer', () => {
  it('elimina la respuesta correctamente', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      ...baseAnswer,
      authorId: AUTHOR_ID,
      isAccepted: false,
    } as any)
    vi.mocked(prisma.answer.delete).mockResolvedValue(baseAnswer as any)

    await deleteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)

    expect(prisma.answer.delete).toHaveBeenCalledWith({ where: { id: ANSWER_ID } })
  })

  it('lanza FORBIDDEN_ANSWER_DELETE si el usuario no es el autor', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      ...baseAnswer,
      authorId: OTHER_ID,
      isAccepted: false,
    } as any)

    await expect(
      deleteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)
    ).rejects.toThrow('FORBIDDEN_ANSWER_DELETE')
  })

  it('lanza ANSWER_IS_ACCEPTED si la respuesta ya fue aceptada', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      ...baseAnswer,
      authorId: AUTHOR_ID,
      isAccepted: true,
    } as any)

    await expect(
      deleteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)
    ).rejects.toThrow('ANSWER_IS_ACCEPTED')
  })
})

// ─── acceptAnswer ─────────────────────────────────────────────────────────────

describe('acceptAnswer', () => {
  it('acepta la respuesta exitosamente', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: QUESTION_ID,
      authorId: AUTHOR_ID,
    } as any)
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({ id: ANSWER_ID } as any)

    const mockTx = {
      answer: {
        updateMany: vi.fn().mockResolvedValue(undefined),
        update: vi.fn().mockResolvedValue({ ...baseAnswer, isAccepted: true }),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return arg
    })

    const result = await acceptAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)

    expect(mockTx.answer.updateMany).toHaveBeenCalledOnce()
    expect(mockTx.answer.update).toHaveBeenCalledOnce()
    expect(result.isAccepted).toBe(true)
  })

  it('lanza QUESTION_NOT_FOUND si la pregunta no existe', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue(null)

    await expect(
      acceptAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)
    ).rejects.toThrow('QUESTION_NOT_FOUND')
  })

  it('lanza FORBIDDEN_ACCEPT_ANSWER si el usuario no es el autor de la pregunta', async () => {
    vi.mocked(prisma.question.findUnique).mockResolvedValue({
      id: QUESTION_ID,
      authorId: OTHER_ID,
    } as any)

    await expect(
      acceptAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID)
    ).rejects.toThrow('FORBIDDEN_ACCEPT_ANSWER')
  })
})

// ─── voteAnswer ───────────────────────────────────────────────────────────────

describe('voteAnswer', () => {
  it('registra un voto nuevo exitosamente', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      id: ANSWER_ID,
      authorId: OTHER_ID,
    } as any)

    const mockTx = {
      answerVote: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue(undefined),
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: 1 } }),
      },
      answer: {
        update: vi.fn().mockResolvedValue(undefined),
      },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return arg
    })

    const result = await voteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, 1)

    expect(mockTx.answerVote.create).toHaveBeenCalledOnce()
    expect(result.voteScore).toBe(1)
  })

  it('lanza ANSWER_NOT_FOUND si la respuesta no existe', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue(null)

    await expect(
      voteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, 1)
    ).rejects.toThrow('ANSWER_NOT_FOUND')
  })

  it('elimina el voto cuando el usuario vota igual al voto existente (toggle off)', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      id: ANSWER_ID,
      authorId: OTHER_ID,
    } as any)

    const mockTx = {
      answerVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        delete: vi.fn().mockResolvedValue(undefined),
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: 0 } }),
      },
      answer: { update: vi.fn().mockResolvedValue(undefined) },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return arg
    })

    const result = await voteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, 1)

    expect(mockTx.answerVote.delete).toHaveBeenCalledOnce()
    expect(result.voteScore).toBe(0)
  })

  it('actualiza el voto cuando el usuario cambia su valor (de 1 a -1)', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      id: ANSWER_ID,
      authorId: OTHER_ID,
    } as any)

    const mockTx = {
      answerVote: {
        findUnique: vi.fn().mockResolvedValue({ value: 1 }),
        update: vi.fn().mockResolvedValue(undefined),
        aggregate: vi.fn().mockResolvedValue({ _sum: { value: -1 } }),
      },
      answer: { update: vi.fn().mockResolvedValue(undefined) },
    }
    vi.mocked(prisma.$transaction).mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') return arg(mockTx)
      return arg
    })

    const result = await voteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, -1)

    expect(mockTx.answerVote.update).toHaveBeenCalledOnce()
    expect(result.voteScore).toBe(-1)
  })

  it('lanza SELF_VOTE_NOT_ALLOWED si el usuario vota su propia respuesta', async () => {
    vi.mocked(prisma.answer.findFirst).mockResolvedValue({
      id: ANSWER_ID,
      authorId: AUTHOR_ID,
    } as any)

    await expect(
      voteAnswer(QUESTION_ID, ANSWER_ID, AUTHOR_ID, 1)
    ).rejects.toThrow('SELF_VOTE_NOT_ALLOWED')
  })
})
