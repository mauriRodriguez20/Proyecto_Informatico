import { vi, describe, it, expect, beforeEach } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: {
    publication: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/http-client', () => ({
  fetchWithKeepAlive: vi.fn(),
}))

import { prisma } from '@/lib/prisma'
import { fetchWithKeepAlive } from '@/lib/http-client'
import {
  createPublication,
  getPublicationById,
  updatePublication,
  deletePublication,
  listPublications,
} from '@/modules/publications/publications.service'

const mockFetch = vi.mocked(fetchWithKeepAlive)

const basePublication = {
  id: 'pub-1',
  authorId: 'author-1',
  type: 'CODE_SNIPPET' as const,
  area: 'FRONTEND' as const,
  title: 'Test publication title here',
  description: 'Test description content',
  errorCode: null,
  solution: null,
  codeBlock: 'const x = 1',
  language: 'javascript',
  avgRating: 0,
  totalRatings: 0,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  tags: [{ publicationId: 'pub-1', technologyId: 'tech-1' }],
}

const mockAuthorResponse = {
  users: [
    {
      id: 'author-1',
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

// ─── createPublication ────────────────────────────────────────────────────────

describe('createPublication', () => {
  it('crea una publicación sin tecnologías y retorna con campo content', async () => {
    vi.mocked(prisma.publication.create).mockResolvedValue(basePublication as any)

    const result = await createPublication('author-1', {
      type: 'CODE_SNIPPET',
      area: 'FRONTEND',
      title: 'Test publication title here',
      description: 'Test description content',
      codeBlock: 'const x = 1',
      technologyIds: [],
      technologyNames: [],
    })

    expect(prisma.publication.create).toHaveBeenCalledOnce()
    expect(result.content).toBe('Test description content')
    expect(result.id).toBe('pub-1')
  })

  it('resuelve tecnologías por nombre llamando al MS-01 y crea la publicación', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ technology: { id: 'tech-resolved-1' } }),
    } as Response)

    vi.mocked(prisma.publication.create).mockResolvedValue(basePublication as any)

    const result = await createPublication(
      'author-1',
      {
        type: 'CODE_SNIPPET',
        area: 'FRONTEND',
        title: 'Test publication title here',
        description: 'Test description content',
        technologyNames: ['TypeScript'],
        technologyIds: [],
      },
      'token-abc'
    )

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3001/api/technologies',
      expect.objectContaining({ method: 'POST' })
    )
    expect(result.content).toBe('Test description content')
  })

  it('lanza TOO_MANY_TAGS si hay más de 5 tecnologías', async () => {
    mockFetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ technology: { id: 'tech-n1' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ technology: { id: 'tech-n2' } }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ technology: { id: 'tech-n3' } }) } as Response)

    await expect(
      createPublication('author-1', {
        type: 'CODE_SNIPPET',
        area: 'FRONTEND',
        title: 'Test publication title here',
        description: 'desc',
        technologyIds: ['t1', 't2', 't3'],
        technologyNames: ['n1', 'n2', 'n3'],
      })
    ).rejects.toThrow('TOO_MANY_TAGS')
  })
})

// ─── getPublicationById ───────────────────────────────────────────────────────

describe('getPublicationById', () => {
  it('retorna la publicación con autor cuando existe', async () => {
    vi.mocked(prisma.publication.findUnique).mockResolvedValue(basePublication as any)
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAuthorResponse,
    } as Response)

    const result = await getPublicationById('pub-1')

    expect(result).not.toBeNull()
    expect(result!.id).toBe('pub-1')
    expect(result!.author).not.toBeNull()
    expect(result!.content).toBe('Test description content')
  })

  it('retorna null si la publicación no existe', async () => {
    vi.mocked(prisma.publication.findUnique).mockResolvedValue(null)

    const result = await getPublicationById('no-existe')

    expect(result).toBeNull()
  })

  it('retorna publicación con author null si el fetch al MS-01 falla', async () => {
    vi.mocked(prisma.publication.findUnique).mockResolvedValue({
      ...basePublication,
      authorId: 'author-unreachable-test-1',
    } as any)
    mockFetch.mockResolvedValue({ ok: false, status: 503 } as Response)

    const result = await getPublicationById('pub-1')

    expect(result).not.toBeNull()
    expect(result!.author).toBeNull()
  })
})

// ─── updatePublication ────────────────────────────────────────────────────────

describe('updatePublication', () => {
  it('actualiza la publicación sin cambiar tecnologías', async () => {
    vi.mocked(prisma.publication.update).mockResolvedValue({
      ...basePublication,
      title: 'Título actualizado',
    } as any)

    const result = await updatePublication('pub-1', { title: 'Título actualizado' })

    expect(prisma.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'pub-1' } })
    )
    expect(result.title).toBe('Título actualizado')
  })

  it('actualiza las tecnologías cuando se proveen technologyIds', async () => {
    vi.mocked(prisma.publication.update).mockResolvedValue(basePublication as any)

    await updatePublication('pub-1', { technologyIds: ['tech-2'], technologyNames: [] })

    expect(prisma.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tags: expect.objectContaining({ deleteMany: {}, create: [{ technologyId: 'tech-2' }] }),
        }),
      })
    )
  })

  it('normaliza el lenguaje si se actualiza codeBlock', async () => {
    vi.mocked(prisma.publication.update).mockResolvedValue(basePublication as any)

    await updatePublication('pub-1', { codeBlock: 'SELECT * FROM users' })

    expect(prisma.publication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ language: 'sql' }),
      })
    )
  })
})

// ─── deletePublication ────────────────────────────────────────────────────────

describe('deletePublication', () => {
  it('elimina la publicación correctamente', async () => {
    vi.mocked(prisma.publication.delete).mockResolvedValue(basePublication as any)

    await deletePublication('pub-1')

    expect(prisma.publication.delete).toHaveBeenCalledWith({ where: { id: 'pub-1' } })
  })
})

// ─── listPublications ─────────────────────────────────────────────────────────

describe('listPublications', () => {
  it('retorna publicaciones paginadas con autores y summary', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [basePublication],
      1,
      [{ avgRating: 4.5, totalRatings: 10 }],
    ] as any)

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockAuthorResponse,
    } as Response)

    const result = await listPublications({
      sortBy: 'recent',
      page: 1,
      limit: 10,
    })

    expect(result.total).toBe(1)
    expect(result.page).toBe(1)
    expect(result.totalPages).toBe(1)
    expect(result.data).toHaveLength(1)
    expect(result.data[0].content).toBe('Test description content')
    expect(result.summary.avgRating).toBe(4.5)
    expect(result.summary.totalRatings).toBe(10)
  })

  it('retorna summary con avgRating 0 cuando no hay calificaciones', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([
      [],
      0,
      [],
    ] as any)

    const result = await listPublications({
      sortBy: 'recent',
      page: 1,
      limit: 10,
    })

    expect(result.total).toBe(0)
    expect(result.summary.avgRating).toBe(0)
    expect(result.summary.totalRatings).toBe(0)
  })

  it('filtra por type y area correctamente', async () => {
    vi.mocked(prisma.$transaction).mockResolvedValue([[], 0, []] as any)

    await listPublications({
      type: 'CODE_SNIPPET',
      area: 'BACKEND',
      sortBy: 'most_voted',
      page: 1,
      limit: 5,
    })

    expect(prisma.$transaction).toHaveBeenCalledOnce()
  })
})
